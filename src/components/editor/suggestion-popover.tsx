"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/types/review";

interface SuggestionPopoverProps {
  suggestion: Suggestion;
  anchorRect: DOMRect | null;
  onAccept: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
  onClose: () => void;
}

export function SuggestionPopover({
  suggestion,
  anchorRect,
  onAccept,
  onReject,
  onClose,
}: SuggestionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // 计算位置
  useEffect(() => {
    if (!popoverRef.current || !anchorRect) return;
    const el = popoverRef.current;
    const popRect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // 默认在高亮下方显示
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    // 如果下方空间不足，则显示在上方
    if (top + popRect.height > viewportH - 16) {
      top = anchorRect.top - popRect.height - 8;
    }

    // 如果右侧超出，向左偏移
    if (left + popRect.width > viewportW - 16) {
      left = viewportW - popRect.width - 16;
    }

    // 保证不超出左边界
    if (left < 16) left = 16;

    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }, [anchorRect]);

  if (!anchorRect) return null;

  const typeConfig = {
    error: { label: "错误", variant: "destructive" as const },
    warning: { label: "警告", variant: "default" as const },
    suggestion: { label: "建议", variant: "secondary" as const },
  };

  const config = typeConfig[suggestion.type];

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 rounded-lg border bg-white shadow-xl p-4 space-y-3 animate-in fade-in-0 zoom-in-95"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <Badge variant={config.variant} className="text-xs">
          {config.label}
        </Badge>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ✕
        </button>
      </div>

      {/* 对比：diff 高亮 */}
      <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed">
        <PopoverDiffView
          original={suggestion.original}
          suggestion={suggestion.suggestion}
        />
      </div>

      {/* 理由 */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {suggestion.reason}
      </p>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onAccept(suggestion)}
        >
          接受
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onReject(suggestion)}
        >
          忽略
        </Button>
      </div>
    </div>
  );
}

/**
 * 浮窗的 diff 对比：找公共前后缀，只对变化部分标红/标绿。
 */
function PopoverDiffView({
  original,
  suggestion,
}: {
  original: string;
  suggestion: string;
}) {
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
  const commonSuffix =
    suffixLen > 0 ? original.slice(original.length - suffixLen) : "";
  const removedMiddle = original.slice(
    prefixLen,
    original.length - suffixLen
  );
  const addedMiddle = suggestion.slice(
    prefixLen,
    suggestion.length - suffixLen
  );

  return (
    <span>
      {commonPrefix && (
        <span className="text-foreground/70">{commonPrefix}</span>
      )}
      {removedMiddle && (
        <span className="line-through text-destructive/80 bg-red-50">
          {removedMiddle}
        </span>
      )}
      {addedMiddle && (
        <span className="text-green-600 font-medium bg-green-50">
          {addedMiddle}
        </span>
      )}
      {commonSuffix && (
        <span className="text-foreground/70">{commonSuffix}</span>
      )}
    </span>
  );
}
