export type PdfPreview = {
  file: File;
  pdf: any | null;
  pageCount: number;
  currentPage: number;      // target page user requested
  displayedPage: number;    // page currently shown (sticks until new is rendered)
  pageCache: (string | null)[];
  isRendering: boolean;
  error?: string;
  buffer?: ArrayBuffer;
};
