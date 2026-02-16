"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHistoryStore } from "@/stores/history-store";
import { useReviewStore } from "@/stores/review-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

function formatTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;

  const isToday = now.toDateString() === date.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  if (isToday) return `今天 ${time}`;
  if (isYesterday) return `昨天 ${time}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

export function ReviewHistory() {
  const { records, removeRecord, clearAll } = useHistoryStore();
  const { setActiveScenePack, setActiveCustomTemplate, setSelectedRuleIds, setCustomPrompt } = useReviewStore();
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const { toast } = useToast();

  if (records.length === 0) return null;

  const handleRestore = (record: (typeof records)[0]) => {
    if (record.activeScenePackId) {
      setActiveScenePack(record.activeScenePackId);
    } else if (record.activeCustomTemplateId) {
      setActiveCustomTemplate(record.activeCustomTemplateId);
    } else {
      setSelectedRuleIds(record.selectedRuleIds);
    }
    setCustomPrompt(record.customPrompt);
    setSelectedModel(record.modelId);
    toast({
      title: "已恢复审校配置",
      description: `${record.scenePackName ?? record.customTemplateName ?? "自定义组合"} · ${record.modelName}`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">最近审校</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-muted-foreground"
          onClick={() => {
            clearAll();
            toast({ title: "已清除全部历史" });
          }}
        >
          清除全部
        </Button>
      </div>

      <div className="space-y-2">
        {records.map((record) => (
          <div key={record.id} className="relative group">
            <Card
              className="p-3 cursor-pointer transition-all hover:shadow-sm hover:border-primary/30"
              onClick={() => handleRestore(record)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {record.fileName ?? "粘贴文本"}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                  {formatTime(record.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                {record.scenePackName && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {record.scenePackName}
                  </Badge>
                )}
                {record.customTemplateName && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    📌 {record.customTemplateName}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {record.modelName}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {record.stats.errors > 0 && (
                  <span className="text-destructive font-medium">
                    {record.stats.errors} 错误
                  </span>
                )}
                {record.stats.warnings > 0 && (
                  <span className="text-amber-600 font-medium">
                    {record.stats.warnings} 警告
                  </span>
                )}
                {record.stats.suggestions > 0 && (
                  <span className="text-blue-600 font-medium">
                    {record.stats.suggestions} 建议
                  </span>
                )}
              </div>
            </Card>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeRecord(record.id);
              }}
              className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 bg-background border rounded-full p-0.5 shadow-sm hover:bg-destructive hover:text-white transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
