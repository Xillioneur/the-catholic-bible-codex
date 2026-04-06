"use client";

import { memo } from "react";

interface BookHeaderProps {
  book: any;
}

export const BookHeader = memo(({ book }: BookHeaderProps) => (
  <div className="max-w-3xl mx-auto px-6 pt-32 pb-24 text-center">
    <div className="border-b border-zinc-100 dark:border-zinc-900 pb-20">
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="h-px w-16 bg-primary/20" />
        <h2 className="text-[12px] font-black uppercase tracking-[0.7em] text-primary/40">The Holy Bible</h2>
        <div className="h-px w-16 bg-primary/20" />
      </div>
      <h1 className="text-6xl md:text-8xl font-serif font-black tracking-tighter text-zinc-900 dark:text-zinc-50 capitalize italic">
        {book.name}
      </h1>
    </div>
  </div>
));

BookHeader.displayName = "BookHeader";

interface ChapterHeaderProps {
  chapter: number;
}

export const ChapterHeader = memo(({ chapter }: ChapterHeaderProps) => (
  <div className="max-w-3xl mx-auto px-6 pt-20 pb-12">
    <div className="flex items-center gap-6">
      <span className="text-[13px] font-black uppercase tracking-[0.5em] text-primary/30">Chapter {chapter}</span>
      <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
    </div>
  </div>
));

ChapterHeader.displayName = "ChapterHeader";

interface LiturgicalReadingHeaderProps {
  type: string;
  citation: string;
  heading?: string;
}

export const LiturgicalReadingHeader = memo(({ type, citation, heading }: LiturgicalReadingHeaderProps) => (
  <div className="w-full flex flex-col items-center gap-1.5 mt-10 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
    <div className="flex items-center gap-2.5">
      <div className="h-[0.5px] w-6 bg-primary/25" />
      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/80">
        {type}
      </span>
      <div className="h-[0.5px] w-6 bg-primary/25" />
    </div>
    <h3 className="text-xl font-serif italic text-zinc-800 dark:text-zinc-200 tracking-tight text-center max-w-lg">
      {citation}
    </h3>
    {heading && (
      <p className="text-[10px] font-serif italic text-zinc-400 dark:text-zinc-500 tracking-tight text-center max-w-md mt-1">
        "{heading}"
      </p>
    )}
  </div>
));

LiturgicalReadingHeader.displayName = "LiturgicalReadingHeader";
