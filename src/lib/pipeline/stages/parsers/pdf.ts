export interface PdfParseResult {
  text: string;
  pageCount: number;
}

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  try {
    const pdfParse = (await import('pdf-parse')).default as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pageCount: data.numpages ?? 0,
    };
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
