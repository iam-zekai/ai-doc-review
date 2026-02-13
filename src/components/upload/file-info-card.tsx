"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDocumentStore } from "@/stores/document-store";

/** 文件信息展示卡片：显示已加载文档的元数据 */
export function FileInfoCard() {
  const { rawText, fileName, fileType, wordCount, charCount, clearDocument } =
    useDocumentStore();

  if (!rawText) return null;

  return (
    <Card className="p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          {/* 文件名和类型标签 */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold truncate">
                {fileName ?? "粘贴的文本"}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {fileType === "docx"
                    ? ".docx"
                    : fileType === "txt"
                      ? ".txt"
                      : "文本"}
                </Badge>
                <span>{wordCount.toLocaleString()} 字</span>
                <span>{charCount.toLocaleString()} 字符</span>
              </div>
            </div>
          </div>

          {/* 文本预览 */}
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {rawText.slice(0, 200)}
            {rawText.length > 200 && "..."}
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={clearDocument} className="shrink-0 text-muted-foreground hover:text-destructive">
          移除
        </Button>
      </div>
    </Card>
  );
}
