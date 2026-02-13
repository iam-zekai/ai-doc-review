import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  /** OpenRouter API Key */
  apiKey: string;
  /** 选中的模型 ID（OpenRouter 格式） */
  selectedModel: string;

  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      selectedModel: "anthropic/claude-sonnet-4",

      setApiKey: (key) => set({ apiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: "ai-doc-review-settings",
    }
  )
);
