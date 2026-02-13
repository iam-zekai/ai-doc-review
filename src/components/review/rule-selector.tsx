"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useReviewStore } from "@/stores/review-store";
import { REVIEW_RULE_LABELS, type ReviewRule } from "@/types/review";
import { previewPrompt } from "@/lib/review/prompt-builder";

const PRESET_RULES: ReviewRule[] = ["typo", "tone", "logic", "conciseness"];

/** 审校规则选择组件 */
export function RuleSelector() {
  const { selectedRules, customPrompt, toggleRule, setCustomPrompt } =
    useReviewStore();
  const [showPrompt, setShowPrompt] = useState(false);

  const isCustomSelected = selectedRules.includes("custom");
  const promptPreview = previewPrompt(selectedRules, customPrompt);

  return (
    <Card className="p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">审校规则</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-muted-foreground"
          onClick={() => setShowPrompt(!showPrompt)}
        >
          {showPrompt ? "隐藏 Prompt" : "查看 Prompt"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PRESET_RULES.map((rule) => (
          <label
            key={rule}
            className="flex items-start gap-2 cursor-pointer rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <Checkbox
              checked={selectedRules.includes(rule)}
              onCheckedChange={() => toggleRule(rule)}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium">
                {REVIEW_RULE_LABELS[rule].name}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {REVIEW_RULE_LABELS[rule].description}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* 自定义规则 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={isCustomSelected}
            onCheckedChange={() => toggleRule("custom")}
          />
          <Label className="cursor-pointer text-sm font-medium">
            {REVIEW_RULE_LABELS.custom.name}
          </Label>
        </label>

        {isCustomSelected && (
          <Textarea
            placeholder="输入你的审校要求，例如：检查文档中的数据是否前后一致..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        )}
      </div>

      {/* Prompt 预览 */}
      {showPrompt && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            实际发送给 AI 的 System Prompt：
          </Label>
          <pre className="rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[300px] font-mono">
            {promptPreview}
          </pre>
        </div>
      )}
    </Card>
  );
}
