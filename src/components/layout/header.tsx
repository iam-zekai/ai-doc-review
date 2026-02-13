"use client";

import { SettingsDialog } from "@/components/layout/settings-dialog";

/** 应用顶部导航栏 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            AI 文档审校
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
}
