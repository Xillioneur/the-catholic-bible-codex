"use client";

import { memo } from "react";
import { Bookmark, MessageSquare } from "lucide-react";
import { cn } from "~/lib/utils";

interface VerseItemProps {
  verse: any;
  hasHighlight: boolean;
  isLiturgical: boolean;
  isSearchTarget: boolean;
  searchQuery?: string;
  hasBookmark: boolean;
  hasNote: boolean;
  onClick: () => void;
}

export const VerseItem = memo(({ 
  verse, 
  hasHighlight, 
  isLiturgical, 
  isSearchTarget, 
  searchQuery,
  hasBookmark,
  hasNote,
  onClick
}: VerseItemProps) => {
  const highlightTerms = (content: string, term: string | undefined) => {
    if (!term || term.length < 2) return content;
    const parts = content.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() 
        ? <mark key={i} className="bg-primary/20 text-inherit p-0 rounded-sm font-inherit">{part}</mark> 
        : part
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-1 group cursor-pointer" onClick={onClick}>
      <div className="flex gap-6 items-start">
        <div className="w-8 flex-shrink-0 pt-2 flex flex-col items-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
          <span className={cn("text-[10px] font-black tabular-nums transition-colors", hasBookmark ? "text-primary opacity-100" : "text-zinc-400")}>
            {verse.verse}
          </span>
          <div className="flex flex-col gap-1">
            {hasBookmark && <Bookmark className="h-2.5 w-2.5 text-primary fill-primary" />}
            {hasNote && <MessageSquare className="h-2.5 w-2.5 text-primary/60" />}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={cn(
            "text-[18px] md:text-[20px] font-serif leading-[1.8] tracking-normal rounded-xl transition-all duration-500 px-4 -mx-4 py-2",
            hasHighlight ? "bg-yellow-100/30 dark:bg-yellow-900/10 shadow-sm" : "text-zinc-800 dark:text-zinc-200",
            isLiturgical && "bg-primary/5 ring-1 ring-primary/10 border-l-4 border-primary shadow-md",
            isSearchTarget && "bg-primary/10 ring-2 ring-primary/20"
          )}>
            <p>{highlightTerms(verse.text, searchQuery)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

VerseItem.displayName = "VerseItem";
