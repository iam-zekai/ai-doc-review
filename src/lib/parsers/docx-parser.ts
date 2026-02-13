import mammoth from "mammoth";
import type { ParsedDocument } from "@/types/document";
import { countWords, countChars } from "@/lib/utils";

/** 解析 .docx 文件，提取纯文本并统计信息 */
export async function parseDocxFile(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  return {
    text,
    fileName: file.name,
    fileType: "docx",
    wordCount: countWords(text),
    charCount: countChars(text),
  };
}
