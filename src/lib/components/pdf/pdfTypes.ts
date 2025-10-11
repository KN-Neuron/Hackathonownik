export type PdfPreview = {
  file: File;
  pdf: any | null;
  pageCount: number;
  currentPage: number;      
  displayedPage: number;    
  pageCache: (string | null)[];
  isRendering: boolean;
  error?: string;
  buffer?: ArrayBuffer;
};
