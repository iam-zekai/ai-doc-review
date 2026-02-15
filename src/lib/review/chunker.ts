export interface DocumentChunk {
  /** 该块在完整文档中的字符偏移 */
  from: number;
  /** 该块的纯文本内容 */
  text: string;
  /** 块序号（从 0 开始） */
  index: number;
}

/**
 * 将文档按段落边界分块
 *
 * @param text 完整文档文本
 * @param chunkSize 每块目标字符数（0 表示不分块）
 * @returns 块数组
 */
export function chunkDocument(
  text: string,
  chunkSize: number
): DocumentChunk[] {
  // 不分块
  if (chunkSize <= 0 || text.length <= chunkSize) {
    return [{ from: 0, text, index: 0 }];
  }

  const paragraphs = text.split("\n");
  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let currentFrom = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const addition = i === 0 ? para : "\n" + para;

    // 如果加上这段会超过 chunkSize 且当前块不为空，则保存当前块
    if (
      currentChunk.length > 0 &&
      currentChunk.length + addition.length > chunkSize
    ) {
      chunks.push({
        from: currentFrom,
        text: currentChunk,
        index: chunkIndex++,
      });
      currentFrom += currentChunk.length + 1; // +1 for \n between chunks
      currentChunk = para;
    } else {
      currentChunk += addition;
    }
  }

  // 最后一块
  if (currentChunk.length > 0) {
    chunks.push({
      from: currentFrom,
      text: currentChunk,
      index: chunkIndex,
    });
  }

  return chunks;
}
