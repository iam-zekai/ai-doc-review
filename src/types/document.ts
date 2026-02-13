/** 支持的文件类型 */
export type FileType = "txt" | "docx" | "paste";

/** 文件解析结果 */
export interface ParsedDocument {
  text: string;
  fileName: string | null;
  fileType: FileType;
  wordCount: number;
  charCount: number;
}

/** 文件上传的验证错误 */
export interface FileValidationError {
  type: "format" | "size" | "parse";
  message: string;
}

/** 最大字符数限制 */
export const MAX_CHAR_COUNT = 30000;

/** 允许的文件扩展名 */
export const ALLOWED_EXTENSIONS = [".txt", ".docx"] as const;

/** 允许的 MIME 类型 */
export const ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
