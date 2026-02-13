"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadZone } from "@/components/upload/upload-zone";
import { TextPasteInput } from "@/components/upload/text-paste-input";
import { FileInfoCard } from "@/components/upload/file-info-card";
import { RuleSelector } from "@/components/review/rule-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useDocumentStore } from "@/stores/document-store";
import { useReviewStore } from "@/stores/review-store";
import { useSettingsStore } from "@/stores/settings-store";
import { parseReviewResponse } from "@/lib/review/response-parser";
import { countWords, countChars } from "@/lib/utils";
import { AI_MODELS } from "@/types/review";
import type { FileValidationError } from "@/types/document";

const SAMPLE_TEXT = `尊敬的各位领导、同事们：

大家好！我今天想就我们公司的季度工作进行一个简单的汇报。

首先，在过去的三个月里，我们团队工获了显著的成绩。销售额同比增长了百分之十五，这离不开每一位同事的辛勤付出和努力。但是，我们也应该看到，虽然销售额增长了，但是利润率却有所下滑，这说明我们在成本控制方面还有很大的提升空间。

其次，关于产品研发方面。我们新推出的智能助手产品受到了市场的热列欢迎。用户反馈显示，该产品的用户满意度达到了92%，这是一个非常令人鼓午的数据。然而，我们也收到了一些关于产品稳定性的投诉，研发团队需要尽快解决这些问题。

第三，在人才储备方面，我们本季度新招聘了15名优秀的工程师和3名产品经理。但是人员流失率偏高的问题仍然没有得到有效的改善，这个需要人力资源部门重点关注，并制定相应的人才保留计划。

最后，展望下一季度，我们计划将重点放在以下几个方面：一是继续扩大市场份额；二是优化产品体验；三是加强团队建设。我相信，只要我们齐心协力、共同奋斗，一定能够取得更加辉煌的成就！

谢谢大家！`;


export default function HomePage() {
  const [activeTab, setActiveTab] = useState("upload");
  const [rawAIResponse, setRawAIResponse] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const { toast } = useToast();

  const rawText = useDocumentStore((s) => s.rawText);
  const setDocument = useDocumentStore((s) => s.setDocument);
  const {
    selectedRules,
    customPrompt,
    suggestions,
    reviewStatus,
    errorMessage,
    setSuggestions,
    setReviewStatus,
    setErrorMessage,
    reset: resetReview,
  } = useReviewStore();
  const { apiKey, selectedModel } = useSettingsStore();

  /** 加载示例文本 */
  const handleLoadSample = useCallback(() => {
    setDocument(
      SAMPLE_TEXT,
      "示例文本.txt",
      "paste",
      countWords(SAMPLE_TEXT),
      countChars(SAMPLE_TEXT)
    );
    toast({ title: "已加载示例文本", description: "包含错别字和语气问题，可直接开始审校" });
  }, [setDocument, toast]);

  /** 处理文件验证错误 */
  const handleError = useCallback(
    (error: FileValidationError) => {
      toast({
        variant: "destructive",
        title: "文件错误",
        description: error.message,
      });
    },
    [toast]
  );

  /** 开始审校 */
  const handleStartReview = useCallback(async () => {
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "未配置 API Key",
        description: "请先点击右上角「设置」配置 OpenRouter API Key",
      });
      return;
    }

    if (selectedRules.length === 0) {
      toast({
        variant: "destructive",
        title: "未选择规则",
        description: "请至少选择一条审校规则",
      });
      return;
    }

    resetReview();
    setRawAIResponse("");
    setParseError(null);
    setShowRawResponse(false);
    setReviewStatus("streaming");

    // 120 秒前端超时（思维链模型需要更长时间）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: rawText,
          rules: selectedRules,
          customPrompt,
          model: selectedModel,
          apiKey,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorMsg = `请求失败 (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData?.error) errorMsg = errorData.error;
        } catch {
          if (errorText) errorMsg = errorText;
        }
        throw new Error(errorMsg);
      }

      // 直接读取文本（后端已非流式）
      const accumulated = await response.text();

      // 保存原始响应用于调试
      setRawAIResponse(accumulated);

      if (!accumulated.trim()) {
        throw new Error("AI 返回了空内容，请检查 API Key 是否有效，或尝试更换模型");
      }

      // 解析响应
      const result = parseReviewResponse(accumulated);
      setSuggestions(result.suggestions);
      setReviewStatus("complete");

      if (result.parseError) {
        setParseError(result.parseError);
      }

      if (result.suggestions.length === 0) {
        if (result.parseError) {
          // 解析失败，自动展开原始响应
          setShowRawResponse(true);
          toast({
            variant: "destructive",
            title: "解析失败",
            description: result.parseError,
          });
        } else {
          toast({
            title: "审校完成",
            description: "未发现需要修改的地方",
          });
        }
      } else {
        toast({
          title: "审校完成",
          description: `共发现 ${result.suggestions.length} 处建议`,
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      let message: string;
      if (err instanceof DOMException && err.name === "AbortError") {
        message = "请求超时，请缩短文档或更换响应更快的模型";
      } else {
        message = err instanceof Error ? err.message : "审校过程中出现错误";
      }
      setErrorMessage(message);
      setReviewStatus("error");
      toast({
        variant: "destructive",
        title: "审校失败",
        description: message,
      });
    }
  }, [
    apiKey,
    selectedRules,
    customPrompt,
    rawText,
    selectedModel,
    resetReview,
    setReviewStatus,
    setSuggestions,
    setErrorMessage,
    toast,
  ]);

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel);
  const isStreaming = reviewStatus === "streaming";

  return (
    <div className="space-y-8">
      {/* 标题区域 */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          文档审校
        </h1>
        <p className="text-base text-muted-foreground max-w-lg">
          上传文档或粘贴文本，选择审校规则，AI 帮你智能审校
        </p>
      </div>

      {/* 文件已加载 */}
      {rawText ? (
        <div className="space-y-6">
          <FileInfoCard />

          {/* 审校规则选择 */}
          <RuleSelector />

          {/* 审校操作按钮 */}
          <div className="flex items-center gap-3">
            <Button
              className="flex-1 h-11 text-base font-semibold shadow-sm"
              size="lg"
              onClick={handleStartReview}
              disabled={isStreaming || selectedRules.length === 0}
            >
              {isStreaming ? "审校中..." : "开始审校"}
            </Button>
            {currentModel && (
              <Badge variant="secondary" className="h-11 px-4 text-xs font-medium">
                {currentModel.name}
              </Badge>
            )}
          </div>

          {/* 审校进度 */}
          {isStreaming && (
            <Card className="p-5 space-y-3">
              <Progress className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                正在使用 {currentModel?.name ?? selectedModel} 审校文档...
              </p>
            </Card>
          )}

          {/* 错误信息 */}
          {reviewStatus === "error" && errorMessage && (
            <Card className="border-destructive/50 bg-destructive/5 p-5">
              <p className="text-sm text-destructive font-medium">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleStartReview}
              >
                重试
              </Button>
            </Card>
          )}

          {/* 审校结果 */}
          {reviewStatus === "complete" && suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">审校结果</h2>
                <Badge variant="secondary" className="font-medium">
                  {suggestions.length} 处建议
                </Badge>
              </div>

              {/* 解析警告 */}
              {parseError && (
                <Card className="border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">
                    {parseError}
                  </p>
                </Card>
              )}

              <div className="space-y-3">
                {suggestions.map((s) => (
                  <Card key={s.id} className="p-4 space-y-3 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          s.type === "error"
                            ? "destructive"
                            : s.type === "warning"
                              ? "default"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {s.type === "error"
                          ? "错误"
                          : s.type === "warning"
                            ? "警告"
                            : "建议"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        位置：第 {s.offset + 1} 字符
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm rounded-md bg-muted/50 p-2.5">
                      <span className="line-through text-destructive/80 decoration-destructive/40">
                        {s.original}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {s.suggestion}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {s.reason}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 审校完成但无建议 */}
          {reviewStatus === "complete" && suggestions.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                {parseError
                  ? "AI 返回了内容但解析失败，请查看下方原始响应"
                  : "文档审校完成，未发现需要修改的地方"}
              </p>
            </Card>
          )}

          {/* AI 原始响应（调试用） */}
          {reviewStatus === "complete" && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setShowRawResponse(!showRawResponse)}
              >
                {showRawResponse
                  ? "隐藏 AI 原始响应"
                  : "查看 AI 原始响应"}
              </Button>
              {showRawResponse && (
                <pre className="rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[400px] font-mono">
                  {rawAIResponse || "(AI 返回了空内容)"}
                </pre>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 上传区域：文件上传 / 粘贴文本 */
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">上传文件</TabsTrigger>
              <TabsTrigger value="paste">粘贴文本</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-4">
              <UploadZone onError={handleError} />
            </TabsContent>

            <TabsContent value="paste" className="mt-4">
              <TextPasteInput onError={handleError} />
            </TabsContent>
          </Tabs>

          {/* 示例文本快捷入口 */}
          <div className="flex justify-center">
            <Button
              variant="link"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleLoadSample}
            >
              没有文档？加载示例文本试试
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
