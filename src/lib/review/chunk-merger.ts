import type { Suggestion } from "@/types/review";
import type { DocumentChunk } from "./chunker";

export interface ChunkResult {
  chunk: DocumentChunk;
  suggestions: Suggestion[];
}

/**
 * 合并多个块的审校结果
 *
 * 将每块的 suggestions 的 offset 从块内相对位置转为文档绝对位置，
 * 然后合并、排序、去重。
 */
export function mergeChunkResults(results: ChunkResult[]): Suggestion[] {
  const allSuggestions: Suggestion[] = [];

  for (const { chunk, suggestions } of results) {
    for (const s of suggestions) {
      // offset 从块内相对位置转为文档绝对位置
      s.offset += chunk.from;
      allSuggestions.push(s);
    }
  }

  // 按 offset 排序
  allSuggestions.sort((a, b) => a.offset - b.offset);

  // 去重：如果两个 suggestion 的 offset 和 original 完全相同，保留第一个
  const deduped: Suggestion[] = [];
  for (const s of allSuggestions) {
    const isDup = deduped.some(
      (existing) =>
        existing.offset === s.offset && existing.original === s.original
    );
    if (!isDup) {
      deduped.push(s);
    }
  }

  return deduped;
}
