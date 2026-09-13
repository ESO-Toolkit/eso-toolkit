import { ocrImages } from './imageOcr';

describe('image OCR script loading security controls', () => {
  const originalTesseract = Object.getOwnPropertyDescriptor(window, 'Tesseract');

  afterEach(() => {
    jest.restoreAllMocks();

    if (originalTesseract === undefined) {
      delete window.Tesseract;
      return;
    }

    Object.defineProperty(window, 'Tesseract', originalTesseract);
  });

  it('injects the pinned OCR script with anonymous CORS and SRI', async () => {
    const worker = {
      recognize: jest.fn().mockResolvedValue({ data: { text: 'recognized text' } }),
      setParameters: jest.fn().mockResolvedValue(undefined),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    const tesseract = {
      createWorker: jest.fn().mockResolvedValue(worker),
    };
    let injectedScript: HTMLScriptElement | undefined;

    jest.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      injectedScript = node as HTMLScriptElement;
      Object.defineProperty(window, 'Tesseract', {
        configurable: true,
        value: tesseract,
      });
      injectedScript.onload?.(new Event('load'));
      return node;
    });

    await expect(ocrImages([new Blob(['image'])])).resolves.toBe('recognized text');

    expect(injectedScript).toBeDefined();
    expect(injectedScript?.src).toBe(
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
    );
    expect(injectedScript?.integrity).toBe(
      'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F',
    );
    expect(injectedScript?.crossOrigin).toBe('anonymous');
    expect(tesseract.createWorker).toHaveBeenCalledTimes(1);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
