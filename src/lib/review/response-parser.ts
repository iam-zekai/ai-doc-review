import type { Suggestion, SuggestionType } from "@/types/review";

export interface ParseResult {
  suggestions: Suggestion[];
  /** AI 返回的原始文本（用于调试） */
  rawResponse: string;
  /** 解析是否遇到问题 */
  parseError: string | null;
}

/** 从 AI 返回的完整文本中解析出 Suggestion 数组 */
export function parseReviewResponse(text: string): ParseResult {
  const rawResponse = text;

  if (!text || text.trim().length === 0) {
    return { suggestions: [], rawResponse, parseError: "AI 返回了空内容" };
  }

  // 去除可能的 markdown 代码块包裹
  let cleaned = text.trim();

  // 处理 ```json ... ``` 包裹（贪婪匹配最后一个 ```）
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 如果 AI 返回了包裹在对象中的数组，例如 {"suggestions": [...]}
  try {
    const maybeObj = JSON.parse(cleaned);
    if (maybeObj && typeof maybeObj === "object" && !Array.isArray(maybeObj)) {
      // 找到第一个数组类型的值
      const arrayVal = Object.values(maybeObj).find(Array.isArray);
      if (arrayVal) {
        cleaned = JSON.stringify(arrayVal);
      }
    }
  } catch {
    // 不是完整 JSON 对象，继续正常流程
  }

  // 提取 JSON 数组部分（找第一个 [ 到最后一个 ] 之间的内容）
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return {
      suggestions: [],
      rawResponse,
      parseError: `无法在 AI 返回中找到 JSON 数组。返回内容开头: "${cleaned.slice(0, 200)}..."`,
    };
  }

  const jsonStr = cleaned.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    // 尝试修复常见 JSON 问题：尾部逗号
    try {
      const fixed = jsonStr.replace(/,\s*([}\]])/g, "$1");
      parsed = JSON.parse(fixed);
    } catch {
      return {
        suggestions: [],
        rawResponse,
        parseError: `JSON 解析失败: ${e instanceof Error ? e.message : "未知错误"}。原始 JSON: "${jsonStr.slice(0, 300)}..."`,
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

  const skipped = parsed.length - suggestions.length;
  const parseError =
    skipped > 0
      ? `${parsed.length} 条结果中有 ${skipped} 条格式不符被跳过`
      : null;

  return { suggestions, rawResponse, parseError };
}
