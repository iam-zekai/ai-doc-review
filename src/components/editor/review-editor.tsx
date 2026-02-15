"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ReviewDecoration,
  reviewDecorationKey,
} from "@/extensions/review-decoration";
import type { Suggestion } from "@/types/review";

interface ReviewEditorProps {
  content: string;
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  onClickSuggestion: (id: string, rect: DOMRect) => void;
  onTextUpdate?: (text: string) => void;
  editable?: boolean;
}

/**
 * Tiptap 编辑器：显示文档内容，审校完成后用 Decoration 高亮标注问题区域
 */
export function ReviewEditor({
  content,
  suggestions,
  activeSuggestionId,
  onClickSuggestion,
  onTextUpdate,
  editable = false,
}: ReviewEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      ReviewDecoration,
    ],
    content: textToHTML(content),
    editable,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 text-sm leading-relaxed",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onTextUpdate?.(ed.getText());
    },
  });

  // 监听 Decoration 的点击自定义事件
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, rect } = (e as CustomEvent).detail;
      onClickSuggestion(id, rect);
    };
    window.addEventListener("review:click-suggestion", handler);
    return () =>
      window.removeEventListener("review:click-suggestion", handler);
  }, [onClickSuggestion]);

  // 当 content 变化时重置编辑器内容
  useEffect(() => {
    if (editor && content) {
      const currentText = editor.getText();
      if (currentText !== content) {
        editor.commands.setContent(textToHTML(content));
      }
    }
  }, [editor, content]);

  // 当 suggestions 变化时，通过 transaction meta 更新 decorations
  useEffect(() => {
    if (!editor) return;

    // suggestions 为空时也需要发一次，清除旧的 decorations
    editor.view.dispatch(
      editor.state.tr.setMeta(reviewDecorationKey, { suggestions })
    );
  }, [editor, suggestions]);

  // 高亮当前选中的建议
  useEffect(() => {
    if (!editorRef.current) return;
    const allDecos = editorRef.current.querySelectorAll(
      "[data-suggestion-id]"
    );
    allDecos.forEach((el) => {
      el.classList.remove("review-decoration-active");
    });
    if (activeSuggestionId) {
      const activeDeco = editorRef.current.querySelector(
        `[data-suggestion-id="${activeSuggestionId}"]`
      );
      if (activeDeco) {
        activeDeco.classList.add("review-decoration-active");
        activeDeco.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSuggestionId]);

  /** 公开方法：用建议文本替换原文 */
  const applySuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (!editor) return;

      // 从 DecorationSet 中查找目标 decoration 的 from/to
      const decoState = reviewDecorationKey.getState(editor.state);
      if (!decoState) return;

      let targetFrom: number | null = null;
      let targetTo: number | null = null;

      // DecorationSet.find 返回匹配范围内的 decorations
      const found = decoState.find(
        undefined,
        undefined,
        (spec: Record<string, string>) =>
          spec["data-suggestion-id"] === suggestion.id
      );

      if (found.length > 0) {
        targetFrom = found[0].from;
        targetTo = found[0].to;
      }

      if (targetFrom === null || targetTo === null) return;

      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: targetFrom, to: targetTo },
          suggestion.suggestion
        )
        .run();
    },
    [editor]
  );

  // 通过 ref 暴露 applySuggestion 方法
  useEffect(() => {
    if (editorRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el = editorRef.current as any;
      el.__applySuggestion = applySuggestion;
      el.__getEditor = () => editor;
    }
  }, [applySuggestion, editor]);

  return (
    <div
      ref={editorRef}
      className="review-editor border rounded-lg bg-white overflow-auto"
    >
      <EditorContent editor={editor} />
    </div>
  );
}

/** 纯文本转为带段落的 HTML */
function textToHTML(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("");
}

// 导出用于外部调用
export type ReviewEditorRef = {
  applySuggestion: (suggestion: Suggestion) => void;
};
