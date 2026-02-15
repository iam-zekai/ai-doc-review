import { generateText } from "ai";
import { createOpenRouterClient } from "@/lib/ai/openrouter";
import { buildReviewPrompt } from "@/lib/review/prompt-builder";
import { parseReviewResponse } from "@/lib/review/response-parser";
import { chunkDocument } from "@/lib/review/chunker";
import { mergeChunkResults } from "@/lib/review/chunk-merger";
import type { ChunkResult } from "@/lib/review/chunk-merger";
import type { ReviewRule } from "@/types/review";

export const maxDuration = 300; // Next.js route timeout（5 分钟）

// 思维链模型需要更长超时
const THINKING_MODELS = [
  "moonshotai/kimi-k2.5",
  "deepseek/deepseek-r1",
  "openai/o4-mini",
];

/**
 * 在文档中查找 original 文本的真实位置
 * 优先匹配 AI 给的 offset 附近，如果不对则全文搜索
 */
function findOriginalInText(
  docText: string,
  original: string,
  aiOffset: number,
  usedRanges: Array<{ from: number; to: number }>
): number {
  // 1. 先检查 AI 给的 offset 是否正确
  if (
    aiOffset >= 0 &&
    aiOffset + original.length <= docText.length &&
    docText.substring(aiOffset, aiOffset + original.length) === original
  ) {
    const conflicts = usedRanges.some(
      (r) => aiOffset < r.to && aiOffset + original.length > r.from
    );
    if (!conflicts) return aiOffset;
  }

  // 2. AI 给的 offset 不对，全文搜索
  let searchFrom = 0;
  while (true) {
    const idx = docText.indexOf(original, searchFrom);
    if (idx === -1) break;

    const conflicts = usedRanges.some(
      (r) => idx < r.to && idx + original.length > r.from
    );
    if (!conflicts) return idx;

    searchFrom = idx + 1;
  }

  return -1;
}

/**
 * 处理单块审校请求中的 AI SDK 错误，返回用户友好的错误信息
 */
function handleAIError(err: unknown, timeoutMs: number): string {
  if (err instanceof Error && err.name === "AbortError") {
    return `请求超时（${timeoutMs / 1000}秒），请缩短文档或更换响应更快的模型`;
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
    return "API Key 无效或已过期，请在设置中检查你的 OpenRouter API Key";
  }
  if (msg.includes("402")) {
    return "OpenRouter 账户余额不足，请充值后重试";
  }
  if (msg.includes("429")) {
    return "请求频率过高，请稍后再试";
  }

  return `AI 调用失败: ${msg.slice(0, 200)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, rules, customPrompt, model, apiKey, chunkSize } = body as {
      text: string;
      rules: ReviewRule[];
      customPrompt?: string;
      model: string;
      apiKey: string;
      chunkSize?: number;
    };

    // 参数验证
    if (!apiKey) {
      return Response.json(
        { error: "请先在设置中配置 OpenRouter API Key" },
        { status: 401 }
      );
    }
    if (!text || text.trim().length === 0) {
      return Response.json(
        { error: "文档内容不能为空" },
        { status: 400 }
      );
    }
    if (!rules || rules.length === 0) {
      return Response.json(
        { error: "请至少选择一条审校规则" },
        { status: 400 }
      );
    }

    // 分块
    const chunks = chunkDocument(text, chunkSize ?? 0);
    console.log(
      `[review] Document length: ${text.length}, chunks: ${chunks.length}, chunkSize: ${chunkSize ?? 0}`
    );

    const provider = createOpenRouterClient(apiKey);
    const isThinkingModel = THINKING_MODELS.includes(model);
    const timeoutMs = isThinkingModel ? 270000 : 240000;

    // 并行请求所有块
    const chunkResults: ChunkResult[] = [];
    const rawResponses: string[] = [];
    let firstError: string | null = null;

    const chunkPromises = chunks.map(async (chunk, idx) => {
      const prompt = buildReviewPrompt(rules, customPrompt ?? "", chunk.text);
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMs);

      try {
        const result = await generateText({
          model: provider(model),
          system: prompt.system,
          prompt: prompt.user,
          temperature: 0.3,
          maxOutputTokens: 32768,
          abortSignal: abortController.signal,
        });

        clearTimeout(timeout);

        const content = result.text ?? "";
        console.log(
          `[review] Chunk ${idx}/${chunks.length} response length: ${content.length}`
        );

        if (!content.trim()) {
          if (result.finishReason === "length") {
            throw new Error(
              "AI 输出被截断，请减小分块大小或更换模型"
            );
          }
          throw new Error("AI 返回了空内容");
        }

        // 解析该块的结果（传入块内文本做 offset 修正）
        const parsed = parseReviewResponse(content, chunk.text);
        rawResponses[idx] = parsed.rawResponse;

        return { chunk, suggestions: parsed.suggestions } as ChunkResult;
      } catch (err) {
        clearTimeout(timeout);
        const errorMsg = handleAIError(err, timeoutMs);
        if (!firstError) firstError = errorMsg;
        console.error(`[review] Chunk ${idx} error:`, errorMsg);
        // 返回空结果，不阻塞其他块
        return { chunk, suggestions: [] } as ChunkResult;
      }
    });

    const results = await Promise.all(chunkPromises);
    chunkResults.push(...results);

    // 如果所有块都失败了，返回错误
    const totalSuggestions = chunkResults.reduce(
      (sum, r) => sum + r.suggestions.length,
      0
    );
    if (totalSuggestions === 0 && firstError) {
      return Response.json({ error: firstError }, { status: 502 });
    }

    // 合并所有块的结果
    const mergedSuggestions = mergeChunkResults(chunkResults);

    // 用完整文档文本做最终的 offset 修正
    const usedRanges: Array<{ from: number; to: number }> = [];
    for (const s of mergedSuggestions) {
      if (s.original) {
        const realOffset = findOriginalInText(
          text,
          s.original,
          s.offset,
          usedRanges
        );
        if (realOffset !== -1) {
          s.offset = realOffset;
          s.length = s.original.length;
          usedRanges.push({ from: realOffset, to: realOffset + s.length });
        }
      }
    }

    // 裁剪过长的建议：如果 original 超过 60 字但实际只改了几个字，缩小范围
    for (const s of mergedSuggestions) {
      if (s.original.length > 60) {
        const trimmed = trimOversizedSuggestion(s);
        if (trimmed) {
          s.original = trimmed.original;
          s.suggestion = trimmed.suggestion;
          s.offset = trimmed.offset;
          s.length = trimmed.length;
        }
      }
    }

    // 合并真正重叠的建议
    const finalSuggestions = mergeAdjacentSuggestions(mergedSuggestions, text);

    console.log(
      `[review] Final: ${finalSuggestions.length} suggestions (before merge: ${mergedSuggestions.length}) from ${chunks.length} chunks`
    );

    return Response.json({
      suggestions: finalSuggestions,
      rawResponse: rawResponses.filter(Boolean).join("\n---\n"),
      parseError: firstError,
    });
  } catch (err) {
    console.error("[review] Unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "审校服务出现未知错误";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * 合并重叠的建议（仅合并真正重叠的，不合并相邻的）
 *
 * 只有两条建议的文本范围有重叠时才合并，避免产生过大的合并块。
 * 合并后长度超过 80 字则不再继续合并。
 */
function mergeAdjacentSuggestions(
  suggestions: import("@/types/review").Suggestion[],
  docText: string
): import("@/types/review").Suggestion[] {
  if (suggestions.length <= 1) return suggestions;

  const MAX_MERGED_LEN = 80; // 合并后最大字符数
  const sorted = [...suggestions].sort((a, b) => a.offset - b.offset);
  const result: import("@/types/review").Suggestion[] = [];

  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const currentEnd = current.offset + current.length;
    const nextStart = next.offset;

    // 只合并真正重叠的（nextStart < currentEnd）
    const mergedEnd = Math.max(currentEnd, next.offset + next.length);
    const mergedLen = mergedEnd - current.offset;

    if (nextStart < currentEnd && mergedLen <= MAX_MERGED_LEN) {
      // 重叠：保留更大范围的那个
      const mergedOriginal = docText.slice(current.offset, mergedEnd);

      const mergedSuggestion =
        current.length >= next.length
          ? current.suggestion
          : next.suggestion;

      // reason 取更严重那条的
      const typeOrder = { error: 3, warning: 2, suggestion: 1 };
      const mergedType =
        typeOrder[current.type] >= typeOrder[next.type]
          ? current.type
          : next.type;
      const mergedReason =
        typeOrder[current.type] >= typeOrder[next.type]
          ? current.reason
          : next.reason;

      current = {
        ...current,
        length: mergedLen,
        original: mergedOriginal,
        suggestion: mergedSuggestion,
        reason: mergedReason,
        type: mergedType,
      };
    } else {
      result.push(current);
      current = { ...next };
    }
  }

  result.push(current);
  return result;
}

/**
 * 裁剪过长的建议：找到 original 和 suggestion 之间的实际差异，
 * 然后向前后扩展到最近的标点边界，只保留修改点附近的最小分句。
 */
function trimOversizedSuggestion(
  s: import("@/types/review").Suggestion
): {
  original: string;
  suggestion: string;
  offset: number;
  length: number;
} | null {
  const { original, suggestion } = s;

  // 找公共前缀
  let prefixLen = 0;
  const minLen = Math.min(original.length, suggestion.length);
  while (
    prefixLen < minLen &&
    original[prefixLen] === suggestion[prefixLen]
  ) {
    prefixLen++;
  }

  // 找公共后缀
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    original[original.length - 1 - suffixLen] ===
      suggestion[suggestion.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  // 如果完全相同或差异太大（改了大部分），不裁剪
  const diffOrigLen = original.length - prefixLen - suffixLen;
  const diffSuggLen = suggestion.length - prefixLen - suffixLen;
  if (diffOrigLen === 0 && diffSuggLen === 0) return null;
  if (diffOrigLen > 40 || diffSuggLen > 40) return null;

  // 以差异点为中心，向前后扩展到标点边界
  const punctuation = /[，。；！？、,\.;!\?]/;

  // 向前找标点边界（在 original 中从 prefixLen 往前找）
  let trimStart = prefixLen;
  for (let i = prefixLen - 1; i >= 0; i--) {
    if (punctuation.test(original[i])) {
      trimStart = i + 1; // 标点后一位开始
      break;
    }
    if (prefixLen - i > 20) {
      // 最多向前扩展 20 字
      trimStart = i;
      break;
    }
    trimStart = i;
  }

  // 向后找标点边界（在 original 中从 diffEnd 往后找）
  const diffEnd = original.length - suffixLen;
  let trimEnd = diffEnd;
  for (let i = diffEnd; i < original.length; i++) {
    if (punctuation.test(original[i])) {
      trimEnd = i + 1; // 包含标点
      break;
    }
    if (i - diffEnd > 20) {
      // 最多向后扩展 20 字
      trimEnd = i;
      break;
    }
    trimEnd = i + 1;
  }

  // 裁剪后的 original
  const newOriginal = original.slice(trimStart, trimEnd);

  // 裁剪后仍太长或太短则放弃
  if (newOriginal.length > 60 || newOriginal.length < 5) return null;
  // 裁剪没有明显缩短则放弃
  if (newOriginal.length >= original.length * 0.8) return null;

  // 对应裁剪 suggestion
  const suggDiffEnd = suggestion.length - suffixLen;
  const newSuggestion = suggestion.slice(trimStart, suggDiffEnd + (trimEnd - diffEnd));

  return {
    original: newOriginal,
    suggestion: newSuggestion,
    offset: s.offset + trimStart,
    length: newOriginal.length,
  };
}
