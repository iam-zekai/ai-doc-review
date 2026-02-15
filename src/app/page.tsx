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
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const rawText = useDocumentStore((s) => s.rawText);
  const fileName = useDocumentStore((s) => s.fileName);
  const setDocument = useDocumentStore((s) => s.setDocument);
  const updateText = useDocumentStore((s) => s.updateText);
  const {
    selectedRules,
    customPrompt,
    suggestions,
    reviewStatus,
    errorMessage,
    setSuggestions,
    setReviewStatus,
    setErrorMessage,
    updateSuggestionStatus,
    reset: resetReview,
  } = useReviewStore();
  const { apiKey, selectedModel, chunkSize } = useSettingsStore();

  /** 加载示例文本 */
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
    setActiveSuggestionId(null);
    setPopoverSuggestion(null);
    setReviewStatus("streaming");

    // 5 分钟前端超时（大文档 + 思维链模型需要更长时间）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

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

      // 后端已解析好，直接读取 JSON
      const data = await response.json();
      setRawAIResponse(data.rawResponse ?? "");

      if (data.error) {
        throw new Error(data.error);
      }

      const suggestions = data.suggestions ?? [];
      const serverParseError = data.parseError ?? null;

      setSuggestions(suggestions);
      setReviewStatus("complete");

      if (serverParseError) {
        setParseError(serverParseError);
      }

      if (suggestions.length === 0) {
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
          description: `共发现 ${suggestions.length} 处建议`,
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
    chunkSize,
    resetReview,
    setReviewStatus,
    setSuggestions,
    setErrorMessage,
    toast,
  ]);

  /** 编辑器中点击高亮 → 显示浮窗 */
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

  /** 右侧列表点击建议 → 编辑器高亮联动 */
  const handleListClickSuggestion = useCallback((id: string) => {
    setActiveSuggestionId(id);
    setPopoverSuggestion(null); // 关闭浮窗，只做联动
  }, []);

  /** 接受建议 */
  const handleAccept = useCallback(
    (s: Suggestion) => {
      // 通过编辑器 ref 应用修改
      if (editorRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = editorRef.current as any;
        if (el.__applySuggestion) el.__applySuggestion(s);
      }
      updateSuggestionStatus(s.id, "accepted");
      setPopoverSuggestion(null);
      setActiveSuggestionId(null);

      // 同步更新文本
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

  /** 拒绝建议 */
  const handleReject = useCallback(
    (s: Suggestion) => {
      updateSuggestionStatus(s.id, "rejected");
      setPopoverSuggestion(null);
      setActiveSuggestionId(null);
    },
    [updateSuggestionStatus]
  );

  /** 全部接受 */
  const handleAcceptAll = useCallback(() => {
    const pending = suggestions.filter((s) => s.status === "pending");
    // 从后往前接受，避免偏移量错位
    const sorted = [...pending].sort((a, b) => b.offset - a.offset);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = editorRef.current as any;
    for (const s of sorted) {
      if (el?.__applySuggestion) el.__applySuggestion(s);
      updateSuggestionStatus(s.id, "accepted");
    }
    // 同步文本
    if (el?.__getEditor) {
      const editor = el.__getEditor();
      if (editor) updateText(editor.getText());
    }
    setActiveSuggestionId(null);
    toast({ title: "已全部接受", description: `${pending.length} 条建议已应用` });
  }, [suggestions, updateSuggestionStatus, updateText, toast]);

  /** 全部拒绝 */
  const handleRejectAll = useCallback(() => {
    const pending = suggestions.filter((s) => s.status === "pending");
    for (const s of pending) {
      updateSuggestionStatus(s.id, "rejected");
    }
    setActiveSuggestionId(null);
    toast({ title: "已全部忽略", description: `${pending.length} 条建议已忽略` });
  }, [suggestions, updateSuggestionStatus, toast]);

  /** 导出 */
  const handleExportTxt = useCallback(() => {
    const baseName = fileName?.replace(/\.[^.]+$/, "") || "审校结果";
    exportAsTxt(rawText, baseName);
  }, [rawText, fileName]);

  const handleExportDocx = useCallback(async () => {
    const baseName = fileName?.replace(/\.[^.]+$/, "") || "审校结果";
    await exportAsDocx(rawText, baseName);
  }, [rawText, fileName]);

  /** 编辑器文本更新 */
  const handleTextUpdate = useCallback(
    (text: string) => {
      updateText(text);
    },
    [updateText]
  );

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel);
  const isStreaming = reviewStatus === "streaming";
  const hasResults =
    reviewStatus === "complete" && suggestions.length > 0;

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="space-y-2">
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
          {/* 文件信息 + 审校规则（审校前显示） */}
          {!hasResults && (
            <>
              <FileInfoCard />
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

          {/* ========== 审校结果：左右布局 ========== */}
          {hasResults && (
            <div className="space-y-4">
              {/* 顶部操作栏 */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">审校结果</h2>
                  <Badge variant="secondary" className="font-medium">
                    {suggestions.length} 处建议
                  </Badge>
                  {currentModel && (
                    <span className="text-xs text-muted-foreground">
                      {currentModel.name}
                    </span>
                  )}
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

              {/* 解析警告 */}
              {parseError && (
                <Card className="border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">{parseError}</p>
                </Card>
              )}

              {/* 左右分栏 */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* 左侧：编辑器 */}
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

                {/* 右侧：建议列表 */}
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

              {/* AI 原始响应（调试用） */}
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

      {/* 建议浮窗 */}
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
