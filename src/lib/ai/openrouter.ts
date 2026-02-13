import { createOpenAI } from "@ai-sdk/openai";

/** 创建指向 OpenRouter 的 AI 客户端 */
export function createOpenRouterClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}
