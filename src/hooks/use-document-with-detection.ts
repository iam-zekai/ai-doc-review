import { useCallback } from "react";
import { useDocumentStore } from "@/stores/document-store";
import { useReviewStore } from "@/stores/review-store";
import { useToast } from "@/hooks/use-toast";
import { detectScenePack } from "@/lib/review/scene-detector";
import type { FileType } from "@/types/document";

/**
 * 封装 setDocument + 自动场景包检测。
 * 上传/粘贴文档后自动分析文本内容并推荐场景包。
 */
export function useDocumentWithDetection() {
  const setDocument = useDocumentStore((s) => s.setDocument);
  const setActiveScenePack = useReviewStore((s) => s.setActiveScenePack);
  const { toast } = useToast();

  return useCallback(
    (
      text: string,
      fileName: string | null,
      fileType: FileType,
      wordCount: number,
      charCount: number
    ) => {
      setDocument(text, fileName, fileType, wordCount, charCount);

      const result = detectScenePack(text);
      if (result) {
        setActiveScenePack(result.scenePackId);
        toast({
          title: `检测到${result.scenePack.name}类文档`,
          description: `已推荐「${result.scenePack.name}」场景包，可随时更换`,
        });
      } else {
        setActiveScenePack("daily");
        toast({
          title: "已推荐「日常通用」场景包",
          description: "可随时切换其他场景包",
        });
      }
    },
    [setDocument, setActiveScenePack, toast]
  );
}
