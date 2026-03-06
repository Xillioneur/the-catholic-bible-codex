"use client";

import { Loader2, Sparkles } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary text-center">Hydrating Codex</p>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest text-center">Preparing 73 Books of the Word</p>
        </div>
      </div>
    </div>
  );
}
