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

/** 用户自定义模板 */
export interface CustomTemplate {
  id: string;
  name: string;
  icon: string;
  ruleIds: string[];
  customPrompt: string;
  createdAt: number;
}

/** 审校历史记录 */
export interface ReviewHistoryRecord {
  id: string;
  timestamp: number;
  fileName: string | null;
  modelId: string;
  modelName: string;
  activeScenePackId: string | null;
  scenePackName: string | null;
  activeCustomTemplateId: string | null;
  customTemplateName: string | null;
  selectedRuleIds: string[];
  ruleNames: string[];
  customPrompt: string;
  stats: {
    total: number;
    errors: number;
    warnings: number;
    suggestions: number;
  };
}

/** AI 提供商 */
export type AIProvider = "claude" | "openai" | "google" | "deepseek" | "kimi";

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
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    provider: "claude",
    note: "最强校对能力，价格较高",
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    note: "OpenAI 旗舰模型，无区域限制",
  },
  {
    id: "openai/o4-mini",
    name: "o4-mini",
    provider: "openai",
    note: "推理模型，适合逻辑审查",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    note: "1M上下文，65K输出，适合大文档精细审查",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    note: "1M上下文，65K输出，快速便宜",
  },
  {
    id: "qwen/qwen3-235b-a22b",
    name: "Qwen 3 235B",
    provider: "deepseek",
    note: "131K上下文，中文能力极强，性价比高",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "deepseek",
    note: "思维链推理，中文能力强",
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "kimi",
    note: "思维链模型，响应较慢",
  },
];
