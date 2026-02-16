import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReviewHistoryRecord } from "@/types/review";

const MAX_RECORDS = 20;

interface HistoryState {
  records: ReviewHistoryRecord[];
  addRecord: (record: ReviewHistoryRecord) => void;
  removeRecord: (id: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records].slice(0, MAX_RECORDS),
        })),
      removeRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),
      clearAll: () => set({ records: [] }),
    }),
    { name: "ai-doc-review-history" }
  )
);
