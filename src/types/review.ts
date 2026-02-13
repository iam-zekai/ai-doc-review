/** 审校规则类型 */
export type ReviewRule = "typo" | "tone" | "logic" | "conciseness" | "custom";

/** 预设规则的描述 */
export const REVIEW_RULE_LABELS: Record<ReviewRule, { name: string; description: string }> = {
  typo: {
    name: "错别字检查",
    description: "找出所有拼写错误和错别字，给出正确写法",
  },
  tone: {
    name: "语气优化",
    description: "将生硬的表达优化为更友好、专业的语气",
  },
  logic: {
    name: "逻辑审查",
    description: "检查文档中逻辑不通、表达不清的地方，给出改进建议",
  },
  conciseness: {
    name: "简洁优化",
    description: "删除冗余表达，让文档更简洁有力",
  },
  custom: {
    name: "自定义",
    description: "输入你自己的审校要求",
  },
};

/** 建议的严重程度 */
export type SuggestionType = "error" | "warning" | "suggestion";

/** 建议的状态 */
export type SuggestionStatus = "pending" | "accepted" | "rejected";

/** 单条审校建议 */
export interface Suggestion {
  id: string;
  offset: number;
  length: number;
  type: SuggestionType;
  original: string;
  suggestion: string;
  reason: string;
  ruleCategory: string;
  status: SuggestionStatus;
}

/** 审校流程状态 */
export type ReviewStatus = "idle" | "streaming" | "complete" | "error";

/** AI 提供商 */
export type AIProvider = "claude" | "kimi" | "google";

/** OpenRouter 上可用的模型 */
export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  note?: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "claude",
    note: "推荐，稳定快速",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    note: "快速便宜",
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "kimi",
    note: "思维链模型，响应较慢",
  },
];
