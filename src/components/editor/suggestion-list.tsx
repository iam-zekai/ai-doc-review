"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Suggestion, SuggestionType } from "@/types/review";

interface SuggestionListProps {
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  onClickSuggestion: (id: string) => void;
  onAccept: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function SuggestionList({
  suggestions,
  activeSuggestionId,
  onClickSuggestion,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
}: SuggestionListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<SuggestionType | "all">("all");

  const pending = suggestions.filter((s) => s.status === "pending");
  const accepted = suggestions.filter((s) => s.status === "accepted");
  const rejected = suggestions.filter((s) => s.status === "rejected");

  const errorCount = suggestions.filter((s) => s.type === "error").length;
  const warningCount = suggestions.filter((s) => s.type === "warning").length;
  const suggestionCount = suggestions.filter(
    (s) => s.type === "suggestion"
  ).length;

  const filteredSuggestions =
    filterType === "all"
      ? suggestions
      : suggestions.filter((s) => s.type === filterType);

  // 滚动到激活的建议
  useEffect(() => {
    if (!activeSuggestionId || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-card-id="${activeSuggestionId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSuggestionId]);

  return (
    <div className="flex flex-col h-full">
      {/* 类型筛选 + 统计 + 批量操作 */}
      <div className="shrink-0 p-3 border-b space-y-2">
        {/* 类型筛选 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              filterType === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            全部 ({suggestions.length})
          </button>
          {errorCount > 0 && (
            <button
              onClick={() => setFilterType("error")}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                filterType === "error"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              错误 ({errorCount})
            </button>
          )}
          {warningCount > 0 && (
            <button
              onClick={() => setFilterType("warning")}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                filterType === "warning"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
            >
              警告 ({warningCount})
            </button>
          )}
          {suggestionCount > 0 && (
            <button
              onClick={() => setFilterType("suggestion")}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                filterType === "suggestion"
                  ? "bg-blue-500 text-white"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              建议 ({suggestionCount})
            </button>
          )}
        </div>

        {/* 状态统计 */}
        <div className="flex items-center gap-2 flex-wrap">
          {pending.length > 0 && (
            <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
              待处理 {pending.length}
            </Badge>
          )}
          {accepted.length > 0 && (
            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
              已接受 {accepted.length}
            </Badge>
          )}
          {rejected.length > 0 && (
            <Badge className="text-xs bg-gray-100 text-gray-500 hover:bg-gray-100">
              已忽略 {rejected.length}
            </Badge>
          )}
        </div>

        {pending.length > 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={onAcceptAll}
            >
              全部接受
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs"
              onClick={onRejectAll}
            >
              全部忽略
            </Button>
          </div>
        )}
      </div>

      {/* 建议列表 */}
      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-2">
        {filteredSuggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            暂无该类型的建议
          </p>
        ) : (
          filteredSuggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              isActive={s.id === activeSuggestionId}
              onClick={() => onClickSuggestion(s.id)}
              onAccept={() => onAccept(s)}
              onReject={() => onReject(s)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion: s,
  isActive,
  onClick,
  onAccept,
  onReject,
}: {
  suggestion: Suggestion;
  isActive: boolean;
  onClick: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isDone = s.status !== "pending";

  return (
    <Card
      data-card-id={s.id}
      className={`p-3 space-y-2 cursor-pointer transition-all text-sm ${
        isActive
          ? "ring-2 ring-blue-500 shadow-md"
          : "hover:shadow-sm"
      } ${isDone ? "opacity-50" : ""}`}
      onClick={onClick}
    >
      {/* 类型 badge + 状态 */}
      <div className="flex items-center gap-2">
        <Badge
          variant={
            s.type === "error"
              ? "destructive"
              : s.type === "warning"
                ? "default"
                : "secondary"
          }
          className="text-[10px] px-1.5 py-0"
        >
          {s.type === "error" ? "错误" : s.type === "warning" ? "警告" : "建议"}
        </Badge>
        {s.status === "accepted" && (
          <span className="text-[10px] text-green-600">已接受</span>
        )}
        {s.status === "rejected" && (
          <span className="text-[10px] text-gray-400">已忽略</span>
        )}
      </div>

      {/* 对比：diff 高亮 */}
      <div className="text-xs rounded bg-muted/50 p-2 space-y-1">
        <div className="leading-relaxed">
          <DiffView original={s.original} suggestion={s.suggestion} />
        </div>
      </div>

      {/* 理由 */}
      <p className="text-[11px] text-muted-foreground line-clamp-1">
        {s.reason}
      </p>

      {/* 操作按钮 */}
      {s.status === "pending" && (
        <div className="flex gap-1.5 pt-0.5">
          <Button
            size="sm"
            className="flex-1 h-6 text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            接受
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-6 text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
          >
            忽略
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * Diff 对比视图：对 original 和 suggestion 做简单字符级 diff，
 * 只对变化部分标红（删除）/ 标绿（新增），相同部分保持原样。
 */
function DiffView({
  original,
  suggestion,
}: {
  original: string;
  suggestion: string;
}) {
  // 找公共前缀和后缀
  let prefixLen = 0;
  const minLen = Math.min(original.length, suggestion.length);
  while (prefixLen < minLen && original[prefixLen] === suggestion[prefixLen]) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    original[original.length - 1 - suffixLen] ===
      suggestion[suggestion.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const commonPrefix = original.slice(0, prefixLen);
  const commonSuffix = suffixLen > 0 ? original.slice(original.length - suffixLen) : "";
  const removedMiddle = original.slice(prefixLen, original.length - suffixLen);
  const addedMiddle = suggestion.slice(prefixLen, suggestion.length - suffixLen);

  return (
    <span>
      {commonPrefix && <span className="text-foreground/70">{commonPrefix}</span>}
      {removedMiddle && (
        <span className="line-through text-destructive/70 bg-red-50">{removedMiddle}</span>
      )}
      {addedMiddle && (
        <span className="text-green-600 font-medium bg-green-50">{addedMiddle}</span>
      )}
      {commonSuffix && <span className="text-foreground/70">{commonSuffix}</span>}
    </span>
  );
}
