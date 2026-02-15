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
  return `你是一个专业的文档审校与改写助手。请按照以下规则审校用户提供的文档，以语句为单位给出改写建议，并以 JSON 数组格式返回。

【审校规则】
${ruleDescriptions}

【核心原则——最小修改范围】
1. original 必须是包含修改点的最小分句片段，绝对不能选整段或整句。
2. 如果只改了几个字（如"处在"→"处于"），original 只选包含这几个字的那个分句（以逗号、句号、分号等为界），长度控制在 10-50 字。
3. 严禁把整段话作为 original。如果一段话有多个逗号分隔的分句，只选有问题的那一小段。
4. 如果一个分句有多个小问题，合并为一条建议即可，但 original 仍然只选那一个分句。
5. 改写时保持作者的整体风格和用词习惯，不要过度改写。

【反面示例——不要这样做】
- ✗ 原文整段有100字，只改了"处在"→"处于"，却把整段都作为 original
- ✓ 只选"经济学教育也处在以新常态为特征的新阶段"作为 original，改为"经济学教育也处于以新常态为特征的新阶段"

【输出要求】
返回一个 JSON 数组，每个元素包含：
- offset: number — 原文片段在文档中的字符偏移量（从 0 开始）
- length: number — 原文片段的字符长度
- type: "error" | "warning" | "suggestion" — 严重程度（错别字/病句用 error，可改可不改用 suggestion，介于两者之间用 warning）
- original: string — 原文中需要改写的完整语句（必须与原文完全一致）
- suggestion: string — 改写后的完整语句
- reason: string — 改写理由（简洁中文，一句话说明改了什么）

【输出格式要求】
- 只返回 JSON 数组，不要包含 \`\`\`json 标记或任何其他文字
- offset 必须精确对应原文中的字符位置
- original 必须与原文中对应位置的文本完全一致，不要截断或遗漏

【效率要求】
- 直接给出审校结果，不要过度思考
- 一个句子只出一条建议，不要对同一句重复提多条`;
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
