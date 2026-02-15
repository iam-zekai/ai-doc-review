import { create } from "zustand";
import { getScenePack } from "@/lib/review/rule-store";
import type { ReviewStatus, Suggestion } from "@/types/review";

interface ReviewState {
  /** 当前选中的规则 ID 列表 */
  selectedRuleIds: string[];
  /** 当前激活的场景包 ID（null 表示自定义组合） */
  activeScenePackId: string | null;
  /** 自定义 prompt */
  customPrompt: string;
  /** 审校建议列表 */
  suggestions: Suggestion[];
  /** 审校状态 */
  reviewStatus: ReviewStatus;
  /** 错误信息 */
  errorMessage: string | null;
  /** 是否处于"结果页回到配置"状态 */
  isEditingConfig: boolean;

  setActiveScenePack: (packId: string | null) => void;
  setSelectedRuleIds: (ruleIds: string[]) => void;
  toggleRuleId: (ruleId: string) => void;
  removeRuleId: (ruleId: string) => void;
  setCustomPrompt: (prompt: string) => void;
  setSuggestions: (suggestions: Suggestion[]) => void;
  addSuggestion: (suggestion: Suggestion) => void;
  updateSuggestionStatus: (
    id: string,
    status: Suggestion["status"]
  ) => void;
  setReviewStatus: (status: ReviewStatus) => void;
  setErrorMessage: (message: string | null) => void;
  setEditingConfig: (editing: boolean) => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  selectedRuleIds: ["typo", "punctuation", "grammar"],
  activeScenePackId: null,
  customPrompt: "",
  suggestions: [],
  reviewStatus: "idle",
  errorMessage: null,
  isEditingConfig: false,

  setActiveScenePack: (packId) => {
    if (packId === null) {
      set({ activeScenePackId: null });
    } else {
      const pack = getScenePack(packId);
      if (pack) {
        set({
          activeScenePackId: packId,
          selectedRuleIds: [...pack.ruleIds],
        });
      }
    }
  },

  setSelectedRuleIds: (ruleIds) => set({ selectedRuleIds: ruleIds }),

  toggleRuleId: (ruleId) =>
    set((state) => {
      const has = state.selectedRuleIds.includes(ruleId);
      return {
        selectedRuleIds: has
          ? state.selectedRuleIds.filter((id) => id !== ruleId)
          : [...state.selectedRuleIds, ruleId],
        activeScenePackId: null,
      };
    }),

  removeRuleId: (ruleId) =>
    set((state) => ({
      selectedRuleIds: state.selectedRuleIds.filter((id) => id !== ruleId),
      activeScenePackId: null,
    })),

  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
  setSuggestions: (suggestions) => set({ suggestions }),
  addSuggestion: (suggestion) =>
    set((state) => ({ suggestions: [...state.suggestions, suggestion] })),
  updateSuggestionStatus: (id, status) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    })),
  setReviewStatus: (status) => set({ reviewStatus: status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setEditingConfig: (editing) => set({ isEditingConfig: editing }),
  reset: () =>
    set({
      suggestions: [],
      reviewStatus: "idle",
      errorMessage: null,
      isEditingConfig: false,
    }),
}));
