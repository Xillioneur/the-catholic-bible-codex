"use client";

import { memo, useMemo } from "react";
import { Bookmark, MessageSquare } from "lucide-react";
import { cn } from "~/lib/utils";
import { useReaderStore } from "~/hooks/use-reader-store";

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
  
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const fontSize = useReaderStore((state) => state.fontSize);

  const content = useMemo(() => {
    const text = verse.text;
    if (!searchQuery || searchQuery.length < 2) return text;

    try {
      const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
      return parts.map((part: string, i: number) => 
        part.toLowerCase() === searchQuery.toLowerCase() 
          ? <mark key={i} className="bg-primary/20 text-inherit p-0 rounded-sm font-inherit">{part}</mark> 
          : part
      );
    } catch (e) {
      return text;
    }
  }, [verse.text, searchQuery]);

  // Find the metadata for this verse if it is liturgical
  const metadata = useMemo(() => {
    if (!isLiturgical) return null;
    const reading = liturgicalReadings.find(r => r.orders.includes(verse.globalOrder));
    if (!reading) return null;
    const isStart = reading.orders[0] === verse.globalOrder;
    return { type: reading.type, isStart };
  }, [isLiturgical, liturgicalReadings, verse.globalOrder]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-0.5 group cursor-pointer" onClick={onClick}>
      <div className="flex gap-4 items-start relative py-0.5">
        
        {/* Margin Area - Now houses the Liturgical Bar */}
        <div className="w-10 flex-shrink-0 pt-1 flex flex-col items-end gap-1 relative">
          {metadata?.isStart && (
            <div className="absolute right-full mr-3 top-1 flex items-center pointer-events-none animate-in fade-in slide-in-from-right-1 duration-700">
               <span className="text-[6px] font-black uppercase tracking-[0.2em] text-primary whitespace-nowrap bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                {metadata.type}
              </span>
            </div>
          )}

          {/* THE COMPACT LITURGICAL BAR */}
          {isLiturgical && (
            <div className="absolute -right-2 top-0.5 bottom-0.5 w-0.5 bg-primary/30 rounded-full" />
          )}
          
          <span className={cn("text-[10px] font-black tabular-nums transition-colors", hasBookmark ? "text-primary opacity-100" : "text-zinc-400 group-hover:text-zinc-600")}>
            {verse.verse}
          </span>
          <div className="flex flex-col gap-1">
            {hasBookmark && <Bookmark className="h-2 w-2 text-primary fill-primary" />}
            {hasNote && <MessageSquare className="h-2 w-2 text-primary/60" />}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-serif tracking-normal transition-all duration-500 px-1 relative",
            hasHighlight ? "bg-yellow-400/10 border-b border-yellow-400/30" : "text-zinc-800 dark:text-zinc-200",
            isSearchTarget && "bg-primary/10 ring-1 ring-primary/20 rounded-md"
          )} style={{ fontSize: `${fontSize}px`, lineHeight: "1.7" }}>
            <p className={cn(isLiturgical && "text-zinc-900 dark:text-zinc-100")}>{content}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

VerseItem.displayName = "VerseItem";
