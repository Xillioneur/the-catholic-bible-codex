"use client";

import { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { VerseOverlay } from "./verse-overlay";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Bookmark, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { ScriptureGuide } from "./scripture-guide";

export function BibleReader() {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);
  const highlightedOrders = useReaderStore((state) => state.highlightedOrders);
  const liturgicalGuide = useReaderStore((state) => state.liturgicalGuide);

  const [activeVerse, setActiveVerse] = useState<any | null>(null);
  const [currentOrder, setCurrentOrder] = useState<number>(1);

  const { data: totalCount } = api.bible.getVerseCount.useQuery(
    { translationSlug },
    { staleTime: Infinity }
  );

  const utils = api.useUtils();
  const [verseCache, setVerseMap] = useState<Map<number, any>>(new Map());

  const rowVirtualizer = useVirtualizer({
    count: totalCount ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 30,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!totalCount) return;
    const missingIndices = virtualRows
      .map(r => r.index + 1)
      .filter(order => !verseCache.has(order));

    if (missingIndices.length > 0) {
      const startOrder = Math.min(...missingIndices);
      const endOrder = Math.max(...missingIndices);
      void utils.bible.getVersesByOrderRange.fetch({
        translationSlug,
        startOrder,
        endOrder
      }).then(verses => {
        setVerseMap(prev => {
          const next = new Map(prev);
          verses.forEach(v => next.set(v.globalOrder, v));
          return next;
        });
      });
    }
  }, [virtualRows, translationSlug, totalCount, verseCache, utils]);

  useEffect(() => {
    if (virtualRows.length > 0 && parentRef.current) {
      const scrollTop = parentRef.current.scrollTop;
      const visibleRow = virtualRows.find(r => r.start >= scrollTop - 20) ?? virtualRows[0];
      const verse = verseCache.get(visibleRow!.index + 1);
      if (verse) {
        setCurrentOrder(verse.globalOrder);
        setCurrentBookId(verse.bookId);
        setCurrentChapter(verse.chapter);
      }
    }
  }, [virtualRows, verseCache, setCurrentBookId, setCurrentChapter]);

  useEffect(() => {
    if (scrollToOrder !== null && totalCount) {
      rowVirtualizer.scrollToIndex(scrollToOrder - 1, { align: "start" });
      setScrollToOrder(null);
    }
  }, [scrollToOrder, totalCount, rowVirtualizer, setScrollToOrder]);

  const localHighlights = useLiveQuery(() => db.highlights.toArray()) ?? [];
  const localBookmarks = useLiveQuery(() => db.bookmarks.toArray()) ?? [];
  const localNotes = useLiveQuery(() => db.notes.toArray()) ?? [];

  const renderVerseText = (verse: any) => {
    if (!verse) return null;
    
    const hasHighlight = localHighlights.find(h => h.verseId === verse.id);
    
    // FUTURE-PROOF: Check if this absolute order is in our highlighted list
    const isLiturgical = highlightedOrders.includes(verse.globalOrder);

    const isFirstVerse = verse.verse === 1;
    const text = verse.text;

    return (
      <div className={cn(
        "text-[17px] md:text-[19px] font-serif leading-[1.7] tracking-normal transition-all duration-500 rounded-lg",
        hasHighlight ? "bg-yellow-100/40 dark:bg-yellow-900/20 px-1 -mx-1" : "text-zinc-800 dark:text-zinc-200",
        isLiturgical && "bg-primary/5 ring-1 ring-primary/10 px-3 -mx-3 py-1 my-0.5 shadow-sm border-l-2 border-primary"
      )}>
        {isFirstVerse ? (
          <p><span className="float-left text-[2.8em] leading-[0.8] font-black text-primary mr-2 mt-1 font-serif">{text.charAt(0)}</span>{text.slice(1)}</p>
        ) : (
          <p>{text}</p>
        )}
      </div>
    );
  };

  if (!totalCount) return null;

  return (
    <>
      <div ref={parentRef} className="h-full w-full overflow-auto bg-transparent scroll-smooth selection:bg-primary/10">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }} className="max-w-3xl mx-auto px-4">
          {virtualRows.map((virtualRow) => {
            const order = virtualRow.index + 1;
            const verse = verseCache.get(order);
            
            if (!verse) {
              return (
                <div key={virtualRow.index} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="py-4">
                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900/50 animate-pulse rounded-full" />
                </div>
              );
            }

            const hasBookmark = localBookmarks.find(b => b.verseId === verse.id);
            const hasNote = localNotes.find(n => n.verseId === verse.id);

            return (
              <div
                key={virtualRow.index}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                className="py-2 group cursor-pointer"
                onClick={() => setActiveVerse(verse)}
              >
                <div className="flex gap-4 items-start">
                  <div className="w-8 flex-shrink-0 pt-1.5 flex flex-col items-end gap-1">
                    <span className={cn("text-[10px] font-bold transition-colors", hasBookmark ? "text-primary" : "text-zinc-300 group-hover:text-zinc-500")}>
                      {verse.verse}
                    </span>
                    {hasNote && <div className="h-1 w-1 rounded-full bg-primary/50" />}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {verse.verse === 1 && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{verse.book.name} {verse.chapter}</span>
                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                      </div>
                    )}
                    {renderVerseText(verse)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ScriptureGuide currentOrder={currentOrder} />

      {activeVerse && (
        <VerseOverlay 
          verseId={activeVerse.id} bookId={activeVerse.bookId} bookName={activeVerse.book.name}
          chapter={activeVerse.chapter} verse={activeVerse.verse} text={activeVerse.text}
          onClose={() => setActiveVerse(null)}
        />
      )}
    </>
  );
}
