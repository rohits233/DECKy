import mammoth from 'mammoth';

export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err) {
    throw new Error(`Failed to parse DOCX: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
