import type { ParsedDocument } from "@/types/document";
import { countWords, countChars } from "@/lib/utils";

/** 解析 .txt 文件，返回文本内容和统计信息 */
export async function parseTxtFile(file: File): Promise<ParsedDocument> {
  const text = await file.text();
  return {
    text,
    fileName: file.name,
    fileType: "txt",
    wordCount: countWords(text),
    charCount: countChars(text),
  };
}
