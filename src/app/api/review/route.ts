import { generateText } from "ai";
import { createOpenRouterClient } from "@/lib/ai/openrouter";
import { buildReviewPrompt } from "@/lib/review/prompt-builder";
import type { ReviewRule } from "@/types/review";

export const maxDuration = 120; // Next.js route timeout

// 思维链模型需要更长超时
const THINKING_MODELS = ["moonshotai/kimi-k2.5", "deepseek/deepseek-r1", "openai/o4-mini"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, rules, customPrompt, model, apiKey } = body as {
      text: string;
      rules: ReviewRule[];
      customPrompt?: string;
      model: string;
      apiKey: string;
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

    // 构造 prompt
    const prompt = buildReviewPrompt(rules, customPrompt ?? "", text);
    const provider = createOpenRouterClient(apiKey);

    // 思维链模型给 100 秒，普通模型 55 秒
    const isThinkingModel = THINKING_MODELS.includes(model);
    const timeoutMs = isThinkingModel ? 100000 : 55000;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    let result;
    try {
      result = await generateText({
        model: provider(model),
        system: prompt.system,
        prompt: prompt.user,
        temperature: 0.3,
        maxOutputTokens: 16384,
        abortSignal: abortController.signal,
      });
    } catch (err) {
      clearTimeout(timeout);

      if (err instanceof Error && err.name === "AbortError") {
        return Response.json(
          { error: `请求超时（${timeoutMs / 1000}秒），请缩短文档或更换响应更快的模型` },
          { status: 504 }
        );
      }

      // 解析 AI SDK 的错误
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        return Response.json(
          { error: "API Key 无效或已过期，请在设置中检查你的 OpenRouter API Key" },
          { status: 401 }
        );
      }
      if (msg.includes("402")) {
        return Response.json(
          { error: "OpenRouter 账户余额不足，请充值后重试" },
          { status: 402 }
        );
      }
      if (msg.includes("429")) {
        return Response.json(
          { error: "请求频率过高，请稍后再试" },
          { status: 429 }
        );
      }

      console.error("[review] AI SDK error:", msg);
      return Response.json(
        { error: `AI 调用失败: ${msg.slice(0, 200)}` },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const content = result.text ?? "";

    if (!content.trim()) {
      // 思维链模型可能推理耗尽 token 导致 content 为空
      if (result.finishReason === "length") {
        return Response.json(
          { error: "AI 推理过程过长，输出被截断。请缩短文档或更换模型（推荐 Claude Sonnet 4 或 Gemini Flash）" },
          { status: 502 }
        );
      }
      return Response.json(
        { error: "AI 返回了空内容，请重试或更换模型" },
        { status: 502 }
      );
    }

    return new Response(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[review] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "审校服务出现未知错误";
    return Response.json({ error: message }, { status: 500 });
  }
}
