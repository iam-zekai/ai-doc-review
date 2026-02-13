import { create } from "zustand";
import type { ReviewRule, ReviewStatus, Suggestion } from "@/types/review";

interface ReviewState {
  /** 选中的审校规则 */
  selectedRules: ReviewRule[];
  /** 自定义 prompt */
  customPrompt: string;
  /** 审校建议列表 */
  suggestions: Suggestion[];
  /** 审校状态 */
  reviewStatus: ReviewStatus;
  /** 错误信息 */
  errorMessage: string | null;

  setRules: (rules: ReviewRule[]) => void;
  toggleRule: (rule: ReviewRule) => void;
  setCustomPrompt: (prompt: string) => void;
  setSuggestions: (suggestions: Suggestion[]) => void;
  addSuggestion: (suggestion: Suggestion) => void;
  updateSuggestionStatus: (
    id: string,
    status: Suggestion["status"]
  ) => void;
  setReviewStatus: (status: ReviewStatus) => void;
  setErrorMessage: (message: string | null) => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  selectedRules: ["typo"],
  customPrompt: "",
  suggestions: [],
  reviewStatus: "idle",
  errorMessage: null,

  setRules: (rules) => set({ selectedRules: rules }),
  toggleRule: (rule) =>
    set((state) => {
      const has = state.selectedRules.includes(rule);
      return {
        selectedRules: has
          ? state.selectedRules.filter((r) => r !== rule)
          : [...state.selectedRules, rule],
      };
    }),
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
  reset: () =>
    set({
      suggestions: [],
      reviewStatus: "idle",
      errorMessage: null,
    }),
}));
