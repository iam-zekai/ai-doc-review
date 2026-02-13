import { REVIEW_RULE_LABELS, type ReviewRule } from "@/types/review";

export interface ReviewPrompt {
  system: string;
  user: string;
}

/** 根据选中的规则生成规则描述文本 */
function buildRuleDescriptions(
  rules: ReviewRule[],
  customPrompt: string
): string {
  const ruleDescriptions = rules
    .filter((r) => r !== "custom")
    .map(
      (r) =>
        `- ${REVIEW_RULE_LABELS[r].name}：${REVIEW_RULE_LABELS[r].description}`
    )
    .join("\n");

  const customSection = customPrompt.trim()
    ? `\n- 自定义要求：${customPrompt.trim()}`
    : "";

  return ruleDescriptions + customSection;
}

/** 生成完整的 system prompt 文本 */
function buildSystemPrompt(ruleDescriptions: string): string {
  return `你是一个专业的文档审校助手。请严格按照以下规则审校用户提供的文档，并以 JSON 数组格式返回结果。

【审校规则】
${ruleDescriptions}

【输出要求】
返回一个 JSON 数组，每个元素包含以下字段：
- offset: number — 错误在原文中的字符偏移量（从 0 开始计数）
- length: number — 错误文本的字符长度
- type: "error" | "warning" | "suggestion" — 问题严重程度（错别字用 error，语气/逻辑用 warning，优化建议用 suggestion）
- original: string — 原文中的错误片段
- suggestion: string — 修改建议
- reason: string — 修改理由（简洁中文，一句话）

如果文档确实存在问题，你必须指出来。不要因为担心误报而遗漏真实的问题。
宁可多报一些疑似问题，也不要漏掉真实错误。

【输出格式要求】
- 只返回 JSON 数组，不要包含 \`\`\`json 标记或任何其他文字
- offset 必须精确对应原文中的字符位置
- original 必须与原文中对应位置的文本完全一致`;
}

/** 根据用户选择的规则和文档内容构造审校 prompt */
export function buildReviewPrompt(
  rules: ReviewRule[],
  customPrompt: string,
  documentText: string
): ReviewPrompt {
  const ruleDescriptions = buildRuleDescriptions(rules, customPrompt);
  const system = buildSystemPrompt(ruleDescriptions);
  return { system, user: documentText };
}

/** 预览 prompt（不含文档内容，仅展示 system prompt） */
export function previewPrompt(
  rules: ReviewRule[],
  customPrompt: string
): string {
  const ruleDescriptions = buildRuleDescriptions(rules, customPrompt);
  return buildSystemPrompt(ruleDescriptions);
}
