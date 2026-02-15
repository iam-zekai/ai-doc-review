import { create } from "zustand";
import type { FileType } from "@/types/document";

interface DocumentState {
  /** 原始文本内容 */
  rawText: string;
  /** 文件名 */
  fileName: string | null;
  /** 文件类型 */
  fileType: FileType | null;
  /** 字数（中文按字、英文按词） */
  wordCount: number;
  /** 字符数（不含空白） */
  charCount: number;

  /** 设置文档内容 */
  setDocument: (
    text: string,
    fileName: string | null,
    fileType: FileType,
    wordCount: number,
    charCount: number
  ) => void;
  /** 更新文本内容（接受建议后） */
  updateText: (text: string) => void;
  /** 清除文档 */
  clearDocument: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  rawText: "",
  fileName: null,
  fileType: null,
  wordCount: 0,
  charCount: 0,

  setDocument: (text, fileName, fileType, wordCount, charCount) =>
    set({ rawText: text, fileName, fileType, wordCount, charCount }),

  updateText: (text) => set({ rawText: text }),

  clearDocument: () =>
    set({
      rawText: "",
      fileName: null,
      fileType: null,
      wordCount: 0,
      charCount: 0,
    }),
}));
