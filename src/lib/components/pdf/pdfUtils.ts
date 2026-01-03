import { browser } from '$app/environment';

let pdfjsLibPromise: Promise<any> | null = null;

export async function loadPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf').then(async (pdfjs) => {
      if (browser) {
        try {
          const worker = await import('pdfjs-dist/build/pdf.worker?url');
          pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        } catch {
          pdfjs.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js';
        }
      }
      return pdfjs;
    });
  }
  return pdfjsLibPromise;
}
