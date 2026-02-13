"use client";

import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, validateFile, validateTextLength } from "@/lib/utils";
import { parseTxtFile } from "@/lib/parsers/txt-parser";
import { parseDocxFile } from "@/lib/parsers/docx-parser";
import { useDocumentStore } from "@/stores/document-store";
import type { ParsedDocument, FileValidationError } from "@/types/document";

interface UploadZoneProps {
  onError: (error: FileValidationError) => void;
}

export function UploadZone({ onError }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setDocument = useDocumentStore((s) => s.setDocument);

  /** 处理文件解析 */
  const handleFile = useCallback(
    async (file: File) => {
      // 验证文件格式
      const formatError = validateFile(file);
      if (formatError) {
        onError(formatError);
        return;
      }

      setIsLoading(true);
      try {
        let result: ParsedDocument;
        if (file.name.endsWith(".docx")) {
          result = await parseDocxFile(file);
        } else {
          result = await parseTxtFile(file);
        }

        // 验证字符数
        const sizeError = validateTextLength(result.text);
        if (sizeError) {
          onError(sizeError);
          return;
        }

        setDocument(
          result.text,
          result.fileName,
          result.fileType,
          result.wordCount,
          result.charCount
        );
      } catch {
        onError({
          type: "parse",
          message: "文件解析失败，请确认文件未损坏后重试。",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onError, setDocument]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // 重置 input 以便再次上传同名文件
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <Card
      className={cn(
        "relative flex flex-col items-center justify-center gap-5 border-2 border-dashed p-14 transition-all duration-200 cursor-pointer rounded-xl",
        isDragging
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30",
        isLoading && "pointer-events-none opacity-60"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 上传图标 */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold">
          {isLoading ? "正在解析文件..." : "拖拽文件到此处，或点击上传"}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          支持 .txt、.docx 格式，最大 30,000 字符
        </p>
      </div>

      <Button variant="outline" size="sm" disabled={isLoading} className="shadow-sm">
        选择文件
      </Button>
    </Card>
  );
}
