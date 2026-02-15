"use client";

import { useCallback, useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadZone } from "@/components/upload/upload-zone";
import { TextPasteInput } from "@/components/upload/text-paste-input";
import { FileInfoCard } from "@/components/upload/file-info-card";
import { RuleSelector } from "@/components/review/rule-selector";
import { ReviewEditor } from "@/components/editor/review-editor";
import { SuggestionList } from "@/components/editor/suggestion-list";
import { SuggestionPopover } from "@/components/editor/suggestion-popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useDocumentStore } from "@/stores/document-store";
import { useReviewStore } from "@/stores/review-store";
import { useSettingsStore } from "@/stores/settings-store";
import { exportAsTxt } from "@/lib/export/export-txt";
import { exportAsDocx } from "@/lib/export/export-docx";
import { countWords, countChars } from "@/lib/utils";
import { getRuleTemplate, getScenePack } from "@/lib/review/rule-store";
import { AI_MODELS } from "@/types/review";
import type { Suggestion } from "@/types/review";
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
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    null
  );
  const [popoverSuggestion, setPopoverSuggestion] =
    useState<Suggestion | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);
  const [chunkProgress, setChunkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const rawText = useDocumentStore((s) => s.rawText);
  const fileName = useDocumentStore((s) => s.fileName);
  const setDocument = useDocumentStore((s) => s.setDocument);
  const updateText = useDocumentStore((s) => s.updateText);
  const {
    selectedRuleIds,
    activeScenePackId,
    customPrompt,
    suggestions,
    reviewStatus,
    errorMessage,
    isEditingConfig,
    setSuggestions,
    setReviewStatus,
    setErrorMessage,
    setEditingConfig,
    updateSuggestionStatus,
    reset: resetReview,
  } = useReviewStore();
  const { apiKey, selectedModel, chunkSize } = useSettingsStore();

  const handleLoadSample = useCallback(() => {
    setDocument(
      SAMPLE_TEXT,
      "示例文本.txt",
      "paste",
      countWords(SAMPLE_TEXT),
      countChars(SAMPLE_TEXT)
    );
    toast({
      title: "已加载示例文本",
      description: "包含错别字和语气问题，可直接开始审校",
    });
  }, [setDocument, toast]);

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

  const handleStartReview = useCallback(async () => {
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "未配置 API Key",
        description: "请先点击右上角「设置」配置 OpenRouter API Key",
      });
      return;
    }

    if (selectedRuleIds.length === 0) {
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
    setActiveSuggestionId(null);
    setPopoverSuggestion(null);
    setChunkProgress(null);
    setEditingConfig(false);
    setReviewStatus("streaming");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: rawText,
          ruleIds: selectedRuleIds,
          customPrompt,
          model: selectedModel,
          apiKey,
          chunkSize,
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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);

            if (event.type === "progress") {
              setChunkProgress({
                current: event.current,
                total: event.total,
              });
            } else if (event.type === "result") {
              setRawAIResponse(event.rawResponse ?? "");
              const resultSuggestions = event.suggestions ?? [];
              const serverParseError = event.parseError ?? null;

              setSuggestions(resultSuggestions);
              setReviewStatus("complete");
              setChunkProgress(null);

              if (serverParseError) {
                setParseError(serverParseError);
              }

              if (resultSuggestions.length === 0) {
                if (serverParseError) {
                  setShowRawResponse(true);
                  toast({
                    variant: "destructive",
                    title: "解析失败",
                    description: serverParseError,
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
                  description: `共发现 ${resultSuggestions.length} 处建议`,
                });
              }
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== line) {
              throw parseErr;
            }
            console.error("[review] Failed to parse event:", line);
          }
        }
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
      setChunkProgress(null);
      toast({
        variant: "destructive",
        title: "审校失败",
        description: message,
      });
    }
  }, [
    apiKey,
    selectedRuleIds,
    customPrompt,
    rawText,
    selectedModel,
    chunkSize,
    resetReview,
    setReviewStatus,
    setSuggestions,
    setErrorMessage,
    setEditingConfig,
    toast,
  ]);

  const handleEditorClickSuggestion = useCallback(
    (id: string, rect: DOMRect) => {
      const s = suggestions.find((s) => s.id === id);
      if (s && s.status === "pending") {
        setActiveSuggestionId(id);
        setPopoverSuggestion(s);
        setPopoverRect(rect);
      }
    },
    [suggestions]
  );

  const handleListClickSuggestion = useCallback((id: string) => {
    setActiveSuggestionId(id);
    setPopoverSuggestion(null);
  }, []);

  const handleAccept = useCallback(
    (s: Suggestion) => {
      if (editorRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = editorRef.current as any;
        if (el.__applySuggestion) el.__applySuggestion(s);
      }
      updateSuggestionStatus(s.id, "accepted");
      setPopoverSuggestion(null);
      setActiveSuggestionId(null);

      if (editorRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = editorRef.current as any;
        if (el.__getEditor) {
          const editor = el.__getEditor();
          if (editor) updateText(editor.getText());
        }
      }
    },
    [updateSuggestionStatus, updateText]
  );

  const handleReject = useCallback(
    (s: Suggestion) => {
      updateSuggestionStatus(s.id, "rejected");
      setPopoverSuggestion(null);
      setActiveSuggestionId(null);
    },
    [updateSuggestionStatus]
  );

  const handleAcceptAll = useCallback(() => {
    const pending = suggestions.filter((s) => s.status === "pending");
    const sorted = [...pending].sort((a, b) => b.offset - a.offset);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = editorRef.current as any;
    for (const s of sorted) {
      if (el?.__applySuggestion) el.__applySuggestion(s);
      updateSuggestionStatus(s.id, "accepted");
    }
    if (el?.__getEditor) {
      const editor = el.__getEditor();
      if (editor) updateText(editor.getText());
    }
    setActiveSuggestionId(null);
    toast({
      title: "已全部接受",
      description: `${pending.length} 条建议已应用`,
    });
  }, [suggestions, updateSuggestionStatus, updateText, toast]);

  const handleRejectAll = useCallback(() => {
    const pending = suggestions.filter((s) => s.status === "pending");
    for (const s of pending) {
      updateSuggestionStatus(s.id, "rejected");
    }
    setActiveSuggestionId(null);
    toast({
      title: "已全部忽略",
      description: `${pending.length} 条建议已忽略`,
    });
  }, [suggestions, updateSuggestionStatus, toast]);

  const handleExportTxt = useCallback(() => {
    const baseName = fileName?.replace(/\.[^.]+$/, "") || "审校结果";
    exportAsTxt(rawText, baseName);
  }, [rawText, fileName]);

  const handleExportDocx = useCallback(async () => {
    const baseName = fileName?.replace(/\.[^.]+$/, "") || "审校结果";
    await exportAsDocx(rawText, baseName);
  }, [rawText, fileName]);

  const handleTextUpdate = useCallback(
    (text: string) => {
      updateText(text);
    },
    [updateText]
  );

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel);
  const isStreaming = reviewStatus === "streaming";
  const hasResults = reviewStatus === "complete" && suggestions.length > 0;
  const showConfig = !hasResults || isEditingConfig;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          文档审校
        </h1>
        <p className="text-base text-muted-foreground max-w-lg">
          上传文档或粘贴文本，选择审校规则，AI 帮你智能审校
        </p>
      </div>

      {rawText ? (
        <div className="space-y-6">
          {showConfig && (
            <>
              <FileInfoCard />
              <RuleSelector />
              <div className="flex items-center gap-3">
                <Button
                  className="flex-1 h-11 text-base font-semibold shadow-sm"
                  size="lg"
                  onClick={handleStartReview}
                  disabled={isStreaming || selectedRuleIds.length === 0}
                >
                  {isStreaming ? "审校中..." : "开始审校"}
                </Button>
                {currentModel && (
                  <Badge
                    variant="secondary"
                    className="h-11 px-4 text-xs font-medium"
                  >
                    {currentModel.name}
                  </Badge>
                )}
              </div>
            </>
          )}

          {isStreaming && (
            <Card className="p-5 space-y-3">
              <Progress
                value={
                  chunkProgress
                    ? (chunkProgress.current / chunkProgress.total) * 100
                    : undefined
                }
                className="h-2"
              />
              <p className="text-sm text-muted-foreground text-center">
                {chunkProgress && chunkProgress.total > 1
                  ? `正在审校第 ${chunkProgress.current}/${chunkProgress.total} 块...`
                  : `正在使用 ${currentModel?.name ?? selectedModel} 审校文档...`}
              </p>
            </Card>
          )}

          {reviewStatus === "error" && errorMessage && (
            <Card className="border-destructive/50 bg-destructive/5 p-5">
              <p className="text-sm text-destructive font-medium">
                {errorMessage}
              </p>
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

          {hasResults && (
            <div className="space-y-4">
              {/* 上下文条 */}
              <Card className="p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      审校配置:
                    </span>
                    {activeScenePackId ? (
                      <Badge variant="outline" className="text-xs">
                        {getScenePack(activeScenePackId)?.icon}{" "}
                        {getScenePack(activeScenePackId)?.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        自定义组合
                      </Badge>
                    )}
                    {selectedRuleIds.map((ruleId) => {
                      const rule = getRuleTemplate(ruleId);
                      if (!rule) return null;
                      return (
                        <Badge
                          key={ruleId}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {rule.name}
                        </Badge>
                      );
                    })}
                    {currentModel && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          |
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {currentModel.name}
                        </span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditingConfig(true);
                      setReviewStatus("idle");
                    }}
                  >
                    修改规则
                  </Button>
                </div>
              </Card>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">审校结果</h2>
                  <Badge variant="secondary" className="font-medium">
                    {suggestions.length} 处建议
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleExportTxt}
                  >
                    导出 TXT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleExportDocx}
                  >
                    导出 DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleStartReview}
                  >
                    重新审校
                  </Button>
                </div>
              </div>

              {parseError && (
                <Card className="border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">{parseError}</p>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                  <div ref={editorRef}>
                    <ReviewEditor
                      content={rawText}
                      suggestions={suggestions}
                      activeSuggestionId={activeSuggestionId}
                      onClickSuggestion={handleEditorClickSuggestion}
                      onTextUpdate={handleTextUpdate}
                      editable={false}
                    />
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="border rounded-lg bg-white lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
                    <SuggestionList
                      suggestions={suggestions}
                      activeSuggestionId={activeSuggestionId}
                      onClickSuggestion={handleListClickSuggestion}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onAcceptAll={handleAcceptAll}
                      onRejectAll={handleRejectAll}
                    />
                  </div>
                </div>
              </div>

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
            </div>
          )}

          {reviewStatus === "complete" && suggestions.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                {parseError
                  ? "AI 返回了内容但解析失败，请查看下方原始响应"
                  : "文档审校完成，未发现需要修改的地方"}
              </p>
            </Card>
          )}
        </div>
      ) : (
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

      {popoverSuggestion && popoverRect && (
        <SuggestionPopover
          suggestion={popoverSuggestion}
          anchorRect={popoverRect}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={() => {
            setPopoverSuggestion(null);
            setPopoverRect(null);
          }}
        />
      )}
    </div>
  );
}
