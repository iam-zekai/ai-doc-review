import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  /** OpenRouter API Key */
  apiKey: string;
  /** 选中的模型 ID（OpenRouter 格式） */
  selectedModel: string;
  /** 分块大小（字符数），0 表示不分块 */
  chunkSize: number;

  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setChunkSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      selectedModel: "anthropic/claude-sonnet-4",
      chunkSize: 0,

      setApiKey: (key) => set({ apiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setChunkSize: (size) => set({ chunkSize: size }),
    }),
    {
      name: "ai-doc-review-settings",
    }
  )
);
