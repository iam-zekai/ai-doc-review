import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomTemplate } from "@/types/review";

const MAX_TEMPLATES = 10;

interface TemplateState {
  templates: CustomTemplate[];
  addTemplate: (template: CustomTemplate) => void;
  removeTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: [],

      addTemplate: (template) =>
        set((state) => ({
          templates: [...state.templates, template].slice(-MAX_TEMPLATES),
        })),

      removeTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "ai-doc-review-templates",
    }
  )
);
