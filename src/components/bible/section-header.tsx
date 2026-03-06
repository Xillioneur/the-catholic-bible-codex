"use client";

import { memo } from "react";

interface BookHeaderProps {
  book: any;
}

export const BookHeader = memo(({ book }: BookHeaderProps) => (
  <div className="max-w-3xl mx-auto px-6 mb-12 mt-20 text-center border-b border-zinc-100 dark:border-zinc-900 pb-12">
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="h-px w-8 bg-primary/20" />
      <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/40">The Holy Bible</h2>
      <div className="h-px w-8 bg-primary/20" />
    </div>
    <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 font-serif lowercase italic">
      {book.name}
    </h1>
  </div>
));

BookHeader.displayName = "BookHeader";

interface ChapterHeaderProps {
  chapter: number;
}

export const ChapterHeader = memo(({ chapter }: ChapterHeaderProps) => (
  <div className="max-w-3xl mx-auto px-6 mt-10 mb-6 flex items-center gap-4">
    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/30">Chapter {chapter}</span>
    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
  </div>
));

ChapterHeader.displayName = "ChapterHeader";
