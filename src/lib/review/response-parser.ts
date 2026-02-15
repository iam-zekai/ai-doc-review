import type { Suggestion, SuggestionType } from "@/types/review";

export interface ParseResult {
  suggestions: Suggestion[];
  /** AI 返回的原始文本（用于调试） */
  rawResponse: string;
  /** 解析是否遇到问题 */
  parseError: string | null;
}

/** 从 AI 返回的完整文本中解析出 Suggestion 数组 */
export function parseReviewResponse(
  text: string,
  documentText?: string
): ParseResult {
  const rawResponse = text;

  if (!text || text.trim().length === 0) {
    return { suggestions: [], rawResponse, parseError: "AI 返回了空内容" };
  }

  // 直接在原始文本中找第一个 [ 和最后一个 ]
  const cleaned = text.trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  console.log("[parser] text length:", cleaned.length, "start:", start, "end:", end);

  if (start === -1) {
    return {
      suggestions: [],
      rawResponse,
      parseError: `无法在 AI 返回中找到 JSON 数组。返回内容开头: "${cleaned.slice(0, 200)}..."`,
    };
  }

  // 如果没有找到闭合的 ]，说明 AI 输出被截断了
  // 尝试修复：找最后一个完整的 } 然后补上 ]
  let jsonStr: string;
  let wasTruncated = false;

  if (end === -1 || end <= start) {
    console.log("[parser] JSON truncated, attempting repair...");
    wasTruncated = true;
    // 从文本末尾往前找最后一个完整的 }
    const fromStart = cleaned.slice(start);
    const lastBrace = fromStart.lastIndexOf("}");
    if (lastBrace === -1) {
      return {
        suggestions: [],
        rawResponse,
        parseError: "AI 输出被截断且无法修复，请缩短文档或更换模型",
      };
    }
    jsonStr = fromStart.slice(0, lastBrace + 1) + "]";
  } else {
    jsonStr = cleaned.slice(start, end + 1);
  }

  console.log("[parser] extracted JSON length:", jsonStr.length, "truncated:", wasTruncated);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    // 尝试修复常见 JSON 问题：尾部逗号、不完整的最后一项
    try {
      let fixed = jsonStr;
      // 去掉最后一个不完整的对象（如果有的话）
      if (wasTruncated) {
        // 删除最后一个可能不完整的 }, 然后找倒数第二个 }
        const lastComplete = fixed.lastIndexOf("},");
        if (lastComplete > 0) {
          fixed = fixed.slice(0, lastComplete + 1) + "]";
        }
      }
      fixed = fixed.replace(/,\s*([}\]])/g, "$1");
      parsed = JSON.parse(fixed);
    } catch {
      return {
        suggestions: [],
        rawResponse,
        parseError: wasTruncated
          ? "AI 输出被截断，修复后仍无法解析。请缩短文档或更换模型"
          : `JSON 解析失败: ${e instanceof Error ? e.message : "未知错误"}`,
      };
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      suggestions: [],
      rawResponse,
      parseError: `解析结果不是数组，类型为: ${typeof parsed}`,
    };
  }

  if (parsed.length === 0) {
    return { suggestions: [], rawResponse, parseError: null };
  }

  // 验证并转换每条建议
  const suggestions = parsed
    .map((item, index): Suggestion | null => {
      if (typeof item !== "object" || item === null) return null;

      // 兼容不同的字段命名（有些模型可能返回 location 而不是 offset）
      const offset =
        typeof item.offset === "number"
          ? item.offset
          : typeof item.location === "number"
            ? item.location
            : -1;

      const length =
        typeof item.length === "number"
          ? item.length
          : typeof item.original === "string"
            ? item.original.length
            : 0;

      const original =
        typeof item.original === "string"
          ? item.original
          : typeof item.text === "string"
            ? item.text
            : "";

      const suggestion =
        typeof item.suggestion === "string"
          ? item.suggestion
          : typeof item.replacement === "string"
            ? item.replacement
            : typeof item.fix === "string"
              ? item.fix
              : "";

      const reason =
        typeof item.reason === "string"
          ? item.reason
          : typeof item.explanation === "string"
            ? item.explanation
            : typeof item.description === "string"
              ? item.description
              : "";

      if (!original && !suggestion) return null;

      const validTypes: SuggestionType[] = ["error", "warning", "suggestion"];
      const type = validTypes.includes(item.type) ? item.type : "suggestion";

      return {
        id: `suggestion-${index}-${offset}`,
        offset,
        length,
        type,
        original,
        suggestion,
        reason,
        ruleCategory: item.ruleCategory ?? item.category ?? "",
        status: "pending",
      };
    })
    .filter((s): s is Suggestion => s !== null);

  // 用 original 文本在文档中搜索真实位置来修正 offset
  if (documentText) {
    const usedRanges: Array<{ from: number; to: number }> = [];
    for (const s of suggestions) {
      if (s.original) {
        const realOffset = findOriginalInText(
          documentText,
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
  }

  const skipped = parsed.length - suggestions.length;
  const parseError =
    skipped > 0
      ? `${parsed.length} 条结果中有 ${skipped} 条格式不符被跳过`
      : null;

  return { suggestions, rawResponse, parseError };
}

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
    // 检查是否和已用范围冲突
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
