import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

/**
 * 导出文本为 .docx 文件
 */
export async function exportAsDocx(
  text: string,
  fileName: string = "审校结果"
) {
  const lines = text.split("\n");
  const paragraphs = lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 24, // 12pt
            font: "Microsoft YaHei",
          }),
        ],
        spacing: { after: 200 },
      })
  );

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
}
