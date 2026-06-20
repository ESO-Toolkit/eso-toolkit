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
 * Free + offline-capable once cached: no API key, no per-call cost.
 */

const TESSERACT_VERSION = '5';
const TESSERACT_CDN = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;

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
interface TesseractNamespace {
  createWorker(
    langs: string,
    oem?: number,
    options?: { logger?: (m: { status: string; progress: number }) => void },
  ): Promise<TesseractWorker>;
}

declare global {
  interface Window {
    Tesseract?: TesseractNamespace;
  }
}

let loadPromise: Promise<TesseractNamespace> | null = null;

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
): Promise<string> {
  if (images.length === 0) return '';
  const Tesseract = await loadTesseract();

  const total = images.length;
  const parts: string[] = [];
  // Track which image is being processed; the logger closure reads it. Declared
  // BEFORE createWorker because tesseract calls the logger during worker setup.
  let current = 1;
  // One worker reused across images keeps the (large) language data load to once.
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      onProgress?.({ status: m.status, progress: m.progress, index: current, total });
    },
  });

  try {
    // PSM 6 = "uniform block of text" — better for the tabular build panels
    // than the default auto mode.
    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    for (let i = 0; i < images.length; i++) {
      current = i + 1;
      const input = await preprocess(images[i]);
      const { data } = await worker.recognize(input);
      parts.push(data.text.trim());
    }
  } finally {
    await worker.terminate();
  }

  return parts.filter(Boolean).join('\n\n');
}
