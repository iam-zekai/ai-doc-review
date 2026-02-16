"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReviewStore } from "@/stores/review-store";
import { useTemplateStore } from "@/stores/template-store";
import {
  SCENE_PACKS,
  RULE_TEMPLATES,
  getRuleTemplate,
  CATEGORY_LABELS,
  type RuleCategory,
} from "@/lib/review/rule-store";
import { previewPrompt } from "@/lib/review/prompt-builder";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

/** 审校规则选择组件 */
export function RuleSelector() {
  const {
    selectedRuleIds,
    activeScenePackId,
    activeCustomTemplateId,
    customPrompt,
    setActiveScenePack,
    setActiveCustomTemplate,
    removeRuleId,
    toggleRuleId,
    setCustomPrompt,
  } = useReviewStore();
  const { templates, removeTemplate } = useTemplateStore();
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

      {/* 我的模板 */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">我的模板:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((tpl) => (
              <div key={tpl.id} className="relative group shrink-0">
                <button
                  onClick={() => setActiveCustomTemplate(tpl.id)}
                  className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                    activeCustomTemplateId === tpl.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{tpl.icon}</span>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {tpl.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-[140px] leading-tight">
                    {tpl.ruleIds.length} 条规则
                    {tpl.customPrompt ? " + 自定义要求" : ""}
                  </p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTemplate(tpl.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 bg-background border rounded-full p-0.5 shadow-sm hover:bg-destructive hover:text-white transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* 保存为模板 */}
      {selectedRuleIds.length > 0 && <SaveTemplateForm />}

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

/** 保存为模板表单 */
function SaveTemplateForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const selectedRuleIds = useReviewStore((s) => s.selectedRuleIds);
  const customPrompt = useReviewStore((s) => s.customPrompt);
  const { templates, addTemplate } = useTemplateStore();
  const { toast } = useToast();

  const handleSave = () => {
    if (!name.trim()) return;
    if (templates.length >= 10) {
      toast({
        variant: "destructive",
        title: "模板数量已达上限",
        description: "最多保存 10 个自定义模板，请先删除旧模板",
      });
      return;
    }
    addTemplate({
      id: crypto.randomUUID(),
      name: name.trim(),
      icon: "📌",
      ruleIds: [...selectedRuleIds],
      customPrompt,
      createdAt: Date.now(),
    });
    setName("");
    setIsOpen(false);
    toast({ title: "模板已保存", description: `「${name.trim()}」` });
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-7 gap-1"
        onClick={() => setIsOpen(true)}
      >
        保存为模板
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="输入模板名称"
        className="flex h-7 flex-1 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        maxLength={20}
      />
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={handleSave}
        disabled={!name.trim()}
      >
        保存
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => {
          setIsOpen(false);
          setName("");
        }}
      >
        取消
      </Button>
    </div>
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
