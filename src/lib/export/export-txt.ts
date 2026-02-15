import { saveAs } from "file-saver";

/**
 * 导出文本为 .txt 文件
 */
export function exportAsTxt(text: string, fileName: string = "审校结果") {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${fileName}.txt`);
}
