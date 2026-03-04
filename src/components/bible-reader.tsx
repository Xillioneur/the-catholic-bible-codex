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
  const liturgicalHighlight = useReaderStore((state) => state.liturgicalHighlight);
  const liturgicalGuide = useReaderStore((state) => state.liturgicalGuide);

  const [activeVerse, setActiveVerse] = useState<any | null>(null);
  const [currentOrder, setCurrentOrder] = useState<number>(1);

  // 1. Get total verse count
  const { data: totalCount } = api.bible.getVerseCount.useQuery(
    { translationSlug },
    { staleTime: Infinity }
  );

  // 2. Fetcher for visible verses
  const utils = api.useUtils();
  const [verseCache, setVerseMap] = useState<Map<number, any>>(new Map());

  const rowVirtualizer = useVirtualizer({
    count: totalCount ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, 
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Load missing data for visible rows
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

  // Track scroll position - Finding the actual visible top verse
  useEffect(() => {
    if (virtualRows.length > 0 && parentRef.current) {
      const scrollTop = parentRef.current.scrollTop;
      
      // Find the first virtual row that is actually at or below the scroll top
      const visibleRow = virtualRows.find(r => r.start >= scrollTop - 50) ?? virtualRows[0];
      
      const verse = verseCache.get(visibleRow!.index + 1);
      if (verse) {
        setCurrentOrder(verse.globalOrder);
        setCurrentBookId(verse.bookId);
        setCurrentChapter(verse.chapter);
      }
    }
  }, [virtualRows, verseCache, setCurrentBookId, setCurrentChapter]);

  // Handle navigation
  useEffect(() => {
    if (scrollToOrder !== null && totalCount) {
      rowVirtualizer.scrollToIndex(scrollToOrder - 1, { align: "start" });
      setScrollToOrder(null);
    }
  }, [scrollToOrder, totalCount, rowVirtualizer, setScrollToOrder]);

  // Local user data
  const localHighlights = useLiveQuery(() => db.highlights.toArray()) ?? [];
  const localBookmarks = useLiveQuery(() => db.bookmarks.toArray()) ?? [];
  const localNotes = useLiveQuery(() => db.notes.toArray()) ?? [];

  if (!totalCount) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Opening Codex</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={parentRef} className="h-full w-full overflow-auto bg-transparent scroll-smooth selection:bg-blue-100 selection:text-blue-900">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }} className="max-w-5xl mx-auto">
          {virtualRows.map((virtualRow) => {
            const order = virtualRow.index + 1;
            const verse = verseCache.get(order);
            
            if (!verse) {
              return (
                <div key={virtualRow.index} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="px-12 py-8">
                  <div className="h-4 w-3/4 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded" />
                </div>
              );
            }

            const hasBookmark = localBookmarks.find(b => b.verseId === verse.id);
            const hasNote = localNotes.find(n => n.verseId === verse.id);
            const hasHighlight = localHighlights.find(h => h.verseId === verse.id);
            const isLiturgical = (liturgicalHighlight || liturgicalGuide) && (
              (liturgicalHighlight?.bookSlug === verse.book.slug && liturgicalHighlight?.chapter === verse.chapter && liturgicalHighlight?.verses.includes(verse.verse)) ||
              (liturgicalGuide?.bookSlug === verse.book.slug && liturgicalGuide?.chapter === verse.chapter && liturgicalGuide?.verses.includes(verse.verse))
            );

            return (
              <div
                key={virtualRow.index}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                className="px-6 md:px-12 py-8 group cursor-pointer"
                onClick={() => setActiveVerse(verse)}
              >
                <div className="max-w-4xl mx-auto flex flex-col gap-3 transition-all duration-500">
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600/60">{verse.book.name} {verse.chapter}:{verse.verse}</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-600/20 to-transparent" />
                    <div className="flex gap-2">
                      {hasBookmark && <Bookmark className="h-3 w-3 text-blue-600 fill-blue-600" />}
                      {hasNote && <MessageSquare className="h-3 w-3 text-blue-600" />}
                    </div>
                  </div>
                  <div className="relative">
                    {verse.verse !== 1 && (
                      <span className={cn("absolute -left-8 md:-left-12 top-1.5 text-[10px] font-bold select-none transition-colors", hasBookmark ? "text-blue-600" : "text-zinc-300 group-hover:text-blue-600")}>{verse.verse}</span>
                    )}
                    <div className={cn(
                      "text-xl md:text-2xl font-serif leading-[1.8] tracking-tight transition-all duration-700",
                      hasHighlight ? "bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg px-1 -mx-1" : "text-zinc-800 dark:text-zinc-200",
                      isLiturgical && "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-100 dark:ring-blue-900/30 rounded-2xl px-6 -mx-6 shadow-sm py-2 my-1"
                    )}>
                      {verse.verse === 1 ? (
                        <p><span className="float-left text-[3.5em] leading-[0.8] font-black text-blue-600 mr-2 mt-[-0.1em] font-serif">{verse.text.charAt(0)}</span>{verse.text.slice(1)}</p>
                      ) : (
                        <p>{verse.text}</p>
                      )}
                    </div>
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
