declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }

  export default function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
}
