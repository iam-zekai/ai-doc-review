"use client";

import { useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { countWords, countChars, validateTextLength } from "@/lib/utils";
import { useDocumentWithDetection } from "@/hooks/use-document-with-detection";
import { MAX_CHAR_COUNT, type FileValidationError } from "@/types/document";

interface TextPasteInputProps {
  onError: (error: FileValidationError) => void;
}

export function TextPasteInput({ onError }: TextPasteInputProps) {
  const [text, setText] = useState("");
  const setDocument = useDocumentWithDetection();

  const charCount = text.replace(/\s/g, "").length;
  const isOverLimit = charCount > MAX_CHAR_COUNT;

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;

    const sizeError = validateTextLength(text);
    if (sizeError) {
      onError(sizeError);
      return;
    }

    setDocument(text, null, "paste", countWords(text), countChars(text));
  }, [text, onError, setDocument]);

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="在此粘贴或输入文档内容..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[200px] resize-y font-mono text-sm"
      />

      <div className="flex items-center justify-between">
        <p
          className={`text-sm ${isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}
        >
          {charCount.toLocaleString()} / {MAX_CHAR_COUNT.toLocaleString()} 字符
        </p>

        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isOverLimit}
          size="sm"
        >
          使用此文本
        </Button>
      </div>
    </div>
  );
}
