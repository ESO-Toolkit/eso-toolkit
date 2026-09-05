/**
 * imageOcr — lazy, client-side OCR for build screenshots.
 *
 * Build guides (e.g. skinnycheeks) render gear/skill data as clean, high-
 * contrast text panels rather than icon grids, which OCRs very reliably. We use
 * tesseract.js, loaded on demand from a CDN (UMD build → window.Tesseract) so it
 * never bloats the main bundle and needs no build-time dependency. The extracted
 * text is fed to the same buildTextParser the paste/link importers use, then
 * shown for review before anything is applied.
 *
 * Supply-chain hardening (this runs in the first-party origin):
 *  - The entry script is pinned to an EXACT immutable version and loaded with a
 *    Subresource-Integrity hash + CORS, so a mutated/compromised CDN release of
 *    it can't execute arbitrary code here.
 *  - Every sub-resource (worker, core/wasm, language data) is ALSO pinned to an
 *    exact immutable version. This matters: tesseract.js's own defaults resolve
 *    `tesseract.js-core` via a "^5.1.1" RANGE (mutable to any future 5.x), so we
 *    pass explicit pinned paths to remove that. The browser can't SRI-verify the
 *    core because the worker pulls it via importScripts (no integrity attribute);
 *    the immutable version pin is the practical mitigation. Fully closing that
 *    last gap would mean self-hosting ~20MB of wasm + language data — not worth
 *    it for a best-effort importer, but the path is documented if it changes.
 * If the entry version is bumped, recompute the hash:
 *   curl -s https://cdn.jsdelivr.net/npm/tesseract.js@<v>/dist/tesseract.min.js \
 *     | openssl dgst -sha384 -binary | openssl base64 -A
 *
 * Free + offline-capable once cached: no API key, no per-call cost.
 */

const CDN = 'https://cdn.jsdelivr.net/npm';
const TESSERACT_VERSION = '5.1.1';
const TESSERACT_CORE_VERSION = '5.1.1';
const TESSERACT_LANG_VERSION = '4.0.0';
const TESSERACT_CDN = `${CDN}/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;
const TESSERACT_SRI = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F';
// Exact immutable sub-resource paths (override tesseract's mutable defaults).
const TESSERACT_WORKER_PATH = `${CDN}/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`;
const TESSERACT_CORE_PATH = `${CDN}/tesseract.js-core@${TESSERACT_CORE_VERSION}`;
const TESSERACT_LANG_PATH = `https://tessdata.projectnaptha.com/${TESSERACT_LANG_VERSION}`;

export interface OcrProgress {
  /** Coarse phase label from tesseract (e.g. "recognizing text"). */
  status: string;
  /** 0–1 progress within the current phase. */
  progress: number;
  /** 1-based index of the image being processed, and the total. */
  index: number;
  total: number;
}

// ─── Minimal tesseract.js typings (we only use a slice of the API) ──────────

type OcrInput = Blob | string | HTMLCanvasElement;
interface TesseractWorker {
  recognize(image: OcrInput): Promise<{ data: { text: string } }>;
  setParameters(params: Record<string, string>): Promise<unknown>;
  terminate(): Promise<unknown>;
}
interface TesseractWorkerOptions {
  logger?: (m: { status: string; progress: number }) => void;
  /** Pinned sub-resource paths — override tesseract's mutable CDN defaults. */
  workerPath?: string;
  corePath?: string;
  langPath?: string;
}
interface TesseractNamespace {
  createWorker(
    langs: string,
    oem?: number,
    options?: TesseractWorkerOptions,
  ): Promise<TesseractWorker>;
}

declare global {
  interface Window {
    Tesseract?: TesseractNamespace;
  }
}

let loadPromise: Promise<TesseractNamespace> | null = null;

function createAbortError(): DOMException {
  return new DOMException('OCR was cancelled.', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError();
}

/** Race an async OCR step against cancellation without leaving listeners behind. */
function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise<T>((resolve, reject) => {
    const abort = (): void => {
      reject(createAbortError());
    };

    signal.addEventListener('abort', abort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
  });
}

/** Inject the tesseract UMD bundle once and resolve the global namespace. */
function loadTesseract(): Promise<TesseractNamespace> {
  if (typeof window !== 'undefined' && window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<TesseractNamespace>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_CDN;
    script.async = true;
    script.crossOrigin = 'anonymous'; // required for SRI on a cross-origin script
    script.integrity = TESSERACT_SRI; // block execution if the bytes don't match
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error('Tesseract failed to initialise after loading.'));
    };
    script.onerror = () => {
      loadPromise = null; // allow a retry
      reject(new Error('Could not load the OCR engine. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/** Cap the OCR input width — large screenshots are slow and no more accurate. */
const MAX_OCR_WIDTH = 1600;

/**
 * Preprocess a screenshot for OCR: downscale oversized images (speed), then
 * grayscale + binarize with auto-detected polarity (game UIs are usually light
 * text on a dark background → flip to black-on-white, which the engine reads
 * far more reliably than colored text on texture). Returns a canvas, or the
 * original blob if a canvas isn't available (e.g. non-DOM env).
 */
async function preprocess(blob: Blob): Promise<OcrInput> {
  if (typeof window === 'undefined' || typeof window.createImageBitmap !== 'function') return blob;
  const bitmap = await window.createImageBitmap(blob).catch(() => null);
  if (!bitmap) return blob;

  const scale = bitmap.width > MAX_OCR_WIDTH ? MAX_OCR_WIDTH / bitmap.width : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let img: ImageData;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    return canvas; // cross-origin taint shouldn't happen for local files; fall back
  }
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const avg = sum / (d.length / 4);
  const darkBackground = avg < 128;
  const threshold = 128;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const isText = darkBackground ? lum > threshold : lum < threshold;
    const v = isText ? 0 : 255; // black text on white
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Run OCR over one or more images and return the concatenated text (blank line
 * between images). `onProgress` reports phase + progress + which image.
 */
export async function ocrImages(
  images: Blob[],
  onProgress?: (p: OcrProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (images.length === 0) return '';
  throwIfAborted(signal);
  const Tesseract = await abortable(loadTesseract(), signal);

  const total = images.length;
  const parts: string[] = [];
  // Track which image is being processed; the logger closure reads it. Declared
  // BEFORE createWorker because tesseract calls the logger during worker setup.
  let current = 1;
  // One worker reused across images keeps the (large) language data load to once.
  // Pinned worker/core/lang paths keep the whole OCR chain on immutable versions.
  const workerPromise = Tesseract.createWorker('eng', 1, {
    workerPath: TESSERACT_WORKER_PATH,
    corePath: TESSERACT_CORE_PATH,
    langPath: TESSERACT_LANG_PATH,
    logger: (m) => {
      if (!signal?.aborted) {
        onProgress?.({ status: m.status, progress: m.progress, index: current, total });
      }
    },
  });

  let worker: TesseractWorker;
  try {
    worker = await abortable(workerPromise, signal);
  } catch (error) {
    if (signal?.aborted) {
      // Worker construction cannot itself be interrupted. Terminate it as soon
      // as it materializes so an aborted setup cannot leak a Web Worker.
      void workerPromise.then((pendingWorker) => pendingWorker.terminate()).catch(() => undefined);
    }
    throw error;
  }

  let termination: Promise<unknown> | null = null;
  const terminateWorker = (): Promise<unknown> => {
    termination ??= worker.terminate();
    return termination;
  };
  const abortWorker = (): void => {
    void terminateWorker().catch(() => undefined);
  };
  signal?.addEventListener('abort', abortWorker, { once: true });

  try {
    // PSM 6 = "uniform block of text" — better for the tabular build panels
    // than the default auto mode.
    throwIfAborted(signal);
    await abortable(worker.setParameters({ tessedit_pageseg_mode: '6' }), signal);
    for (let i = 0; i < images.length; i++) {
      throwIfAborted(signal);
      current = i + 1;
      const input = await abortable(preprocess(images[i]), signal);
      throwIfAborted(signal);
      const { data } = await abortable(worker.recognize(input), signal);
      parts.push(data.text.trim());
    }
  } finally {
    signal?.removeEventListener('abort', abortWorker);
    await terminateWorker().catch(() => undefined);
  }

  return parts.filter(Boolean).join('\n\n');
}
