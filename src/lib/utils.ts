import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_CHAR_COUNT,
  type FileValidationError,
} from "@/types/document";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 统计中文+英文字数（中文按字计数，英文按词计数） */
export function countWords(text: string): number {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const englishWords =
    text
      .replace(/[\u4e00-\u9fff]/g, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length ?? 0;
  return chineseChars + englishWords;
}

/** 统计字符数（不含空白） */
export function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

/** 验证文件类型是否合法 */
export function validateFile(file: File): FileValidationError | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (
    !ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number]) &&
    !ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])
  ) {
    return {
      type: "format",
      message: `不支持的文件格式。请上传 .txt 或 .docx 文件。`,
    };
  }
  return null;
}

/** 验证文本长度 */
export function validateTextLength(text: string): FileValidationError | null {
  if (text.length > MAX_CHAR_COUNT) {
    return {
      type: "size",
      message: `文档超出 ${MAX_CHAR_COUNT.toLocaleString()} 字符限制（当前 ${text.length.toLocaleString()} 字符）。`,
    };
  }
  return null;
}

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
