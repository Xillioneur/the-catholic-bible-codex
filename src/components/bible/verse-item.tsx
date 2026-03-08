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
      <div className="flex gap-6 items-start relative py-1">
        {/* Margin Area */}
        <div className="w-10 flex-shrink-0 pt-1 flex flex-col items-end gap-1 relative">
          {metadata?.isStart && (
            <div className="absolute right-full mr-4 top-1 flex items-center pointer-events-none animate-in fade-in slide-in-from-right-2 duration-700">
               <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary whitespace-nowrap bg-white dark:bg-zinc-950 px-2 py-1 rounded shadow-sm border border-primary/20">
                {metadata.type}
              </span>
            </div>
          )}
          
          <span className={cn("text-[10px] font-black tabular-nums transition-colors", hasBookmark ? "text-primary opacity-100" : "text-zinc-400 group-hover:text-zinc-600")}>
            {verse.verse}
          </span>
          <div className="flex flex-col gap-1">
            {hasBookmark && <Bookmark className="h-2.5 w-2.5 text-primary fill-primary" />}
            {hasNote && <MessageSquare className="h-2.5 w-2.5 text-primary/60" />}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-serif tracking-normal rounded-xl transition-all duration-500 px-4 -mx-4 py-1 relative",
            hasHighlight ? "bg-yellow-100/30 dark:bg-yellow-900/10 shadow-sm" : "text-zinc-800 dark:text-zinc-200",
            isLiturgical && "bg-primary/[0.03] border-l-4 border-primary/40 shadow-sm",
            isSearchTarget && "bg-primary/10 ring-2 ring-primary/20"
          )} style={{ fontSize: `${fontSize}px`, lineHeight: "1.7" }}>
            <p className={cn(isLiturgical && "font-medium")}>{content}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

VerseItem.displayName = "VerseItem";
