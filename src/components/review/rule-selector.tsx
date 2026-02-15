"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReviewStore } from "@/stores/review-store";
import {
  SCENE_PACKS,
  RULE_TEMPLATES,
  getRuleTemplate,
  CATEGORY_LABELS,
  type RuleCategory,
} from "@/lib/review/rule-store";
import { previewPrompt } from "@/lib/review/prompt-builder";
import { Plus, X } from "lucide-react";

/** 审校规则选择组件 */
export function RuleSelector() {
  const {
    selectedRuleIds,
    activeScenePackId,
    customPrompt,
    setActiveScenePack,
    removeRuleId,
    toggleRuleId,
    setCustomPrompt,
  } = useReviewStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showRulePicker, setShowRulePicker] = useState(false);

  const promptPreview = previewPrompt(selectedRuleIds, customPrompt);

  return (
    <Card className="p-5 space-y-4 shadow-sm">
      {/* 标题 + 查看 Prompt */}
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

      {/* 场景包选择 */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">快速选择场景:</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SCENE_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => setActiveScenePack(pack.id)}
              className={`shrink-0 rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                activeScenePackId === pack.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{pack.icon}</span>
                <span className="text-sm font-medium whitespace-nowrap">
                  {pack.name}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-[140px] leading-tight">
                {pack.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 已选规则 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            已选规则 ({selectedRuleIds.length}):
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowRulePicker(!showRulePicker)}
          >
            <Plus className="h-3 w-3" />
            添加规则
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedRuleIds.length === 0 ? (
            <p className="text-xs text-muted-foreground">未选择任何规则</p>
          ) : (
            selectedRuleIds.map((ruleId) => {
              const rule = getRuleTemplate(ruleId);
              if (!rule) return null;
              return (
                <Badge
                  key={ruleId}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 text-xs flex items-center gap-1"
                >
                  {rule.name}
                  <button
                    onClick={() => removeRuleId(ruleId)}
                    className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          )}
        </div>
      </div>

      {/* 规则选择面板（展开式） */}
      {showRulePicker && (
        <RulePickerPanel
          selectedRuleIds={selectedRuleIds}
          onToggle={toggleRuleId}
          onClose={() => setShowRulePicker(false)}
        />
      )}

      {/* 自定义审校要求 */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          自定义审校要求 (可选):
        </p>
        <Textarea
          placeholder="输入额外的审校要求，例如：检查文档中的数据是否前后一致..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          className="min-h-[60px] text-sm"
        />
      </div>

      {/* Prompt 预览 */}
      {showPrompt && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            实际发送给 AI 的 System Prompt：
          </p>
          <pre className="rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[300px] font-mono">
            {promptPreview}
          </pre>
        </div>
      )}
    </Card>
  );
}

/** 规则选择面板（按分类展示） */
function RulePickerPanel({
  selectedRuleIds,
  onToggle,
  onClose,
}: {
  selectedRuleIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const categories: RuleCategory[] = [
    "basic",
    "style",
    "professional",
    "compliance",
  ];

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">选择审校规则</p>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {categories.map((category) => {
        const rules = RULE_TEMPLATES.filter((r) => r.category === category);
        return (
          <div key={category} className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {rules.map((rule) => {
                const isSelected = selectedRuleIds.includes(rule.id);
                return (
                  <button
                    key={rule.id}
                    onClick={() => onToggle(rule.id)}
                    className={`text-left rounded-md border p-2 text-xs transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-background hover:border-border"
                    }`}
                  >
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {rule.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
