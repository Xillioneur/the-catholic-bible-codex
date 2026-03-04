"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { VerseOverlay } from "./verse-overlay";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Bookmark, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { ScriptureGuide } from "./scripture-guide";
import { bibleData } from "~/lib/bible-data";

const VERSE_HEIGHT = 80;
const CHAPTER_HEADER_HEIGHT = 100;
const BOOK_HEADER_HEIGHT = 300;
const CHUNK_SIZE = 1000;

export function BibleReader() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [_, setTick] = useState(0);
  
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);
  const highlightedOrders = useReaderStore((state) => state.highlightedOrders);
  const liturgicalGuide = useReaderStore((state) => state.liturgicalGuide);
  const searchHighlight = useReaderStore((state) => state.searchHighlight);

  const [activeVerse, setActiveVerse] = useState<any | null>(null);
  const [currentOrder, setCurrentOrder] = useState<number>(1);
  const [stabilizeTarget, setStabilizeTarget] = useState<number | null>(null);
  const [isWarping, setIsWarping] = useState(false);

  const { data: totalCount } = api.bible.getVerseCount.useQuery({ translationSlug }, { staleTime: Infinity });
  const utils = api.useUtils();

  const rowVirtualizer = useVirtualizer({
    count: totalCount ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const verse = bibleData.getVerse(index + 1);
      if (verse?.chapter === 1 && verse?.verse === 1) return BOOK_HEADER_HEIGHT;
      if (verse?.verse === 1) return CHAPTER_HEADER_HEIGHT;
      return VERSE_HEIGHT;
    },
    overscan: 150,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const fetchChunk = useCallback(async (chunkIndex: number) => {
    if (!totalCount) return;
    await bibleData.fetchRange(chunkIndex, translationSlug, totalCount, (input) => utils.bible.getVersesByOrderRange.fetch(input));
    setTick(t => t + 1);
    rowVirtualizer.measure();
  }, [totalCount, translationSlug, utils, rowVirtualizer]);

  useEffect(() => {
    if (!totalCount) return;
    const neededChunks = new Set<number>();
    virtualRows.forEach(r => {
      if (!bibleData.hasVerse(r.index + 1)) neededChunks.add(Math.floor(r.index / CHUNK_SIZE));
    });
    neededChunks.forEach(c => fetchChunk(c));
  }, [virtualRows, totalCount, fetchChunk]);

  // Pass 1: Warp Teleportation
  useEffect(() => {
    if (scrollToOrder !== null && totalCount && parentRef.current) {
      setIsWarping(true);
      
      // 1. Initial jump
      rowVirtualizer.scrollToIndex(scrollToOrder - 1, { align: "start" });
      
      // 2. Fetch data
      const chunkIndex = Math.floor((scrollToOrder - 1) / CHUNK_SIZE);
      void fetchChunk(chunkIndex);
      
      // 3. Smart Verification:
      // Capture the offset immediately. If we are already stable, don't trigger Pass 2.
      const targetOffset = rowVirtualizer.getOffsetForIndex(scrollToOrder - 1, "start")[0] ?? 0;
      const currentScroll = parentRef.current.scrollTop;
      
      if (Math.abs(targetOffset - currentScroll) > 5) {
        setStabilizeTarget(scrollToOrder);
      }
      
      setScrollToOrder(null);
      setTimeout(() => setIsWarping(false), 800);
    }
  }, [scrollToOrder, totalCount, rowVirtualizer, setScrollToOrder, fetchChunk]);

  // Pass 2: Precise Adjustment (Conditional)
  useEffect(() => {
    if (stabilizeTarget !== null && bibleData.hasVerse(stabilizeTarget)) {
      setTimeout(() => {
        rowVirtualizer.scrollToIndex(stabilizeTarget - 1, { align: "start" });
        setStabilizeTarget(null);
      }, 30);
    }
  }, [stabilizeTarget, rowVirtualizer]);

  useEffect(() => {
    if (virtualRows.length > 0 && parentRef.current) {
      const scrollTop = parentRef.current.scrollTop;
      const visibleRow = virtualRows.find(r => r.start >= scrollTop - 5) ?? virtualRows[0];
      const verse = bibleData.getVerse(visibleRow!.index + 1);
      if (verse) {
        setCurrentOrder(verse.globalOrder);
        setCurrentBookId(verse.bookId);
        setCurrentChapter(verse.chapter);
      }
    }
  }, [virtualRows, setCurrentBookId, setCurrentChapter]);

  const localHighlights = useLiveQuery(() => db.highlights.toArray()) ?? [];
  const localBookmarks = useLiveQuery(() => db.bookmarks.toArray()) ?? [];
  const localNotes = useLiveQuery(() => db.notes.toArray()) ?? [];

  const renderVerseText = (verse: any) => {
    if (!verse) return null;
    if (isWarping) return (
      <div className="text-[17px] font-serif leading-[1.65] text-zinc-300 dark:text-zinc-700 blur-[1px]">
        {verse.text}
      </div>
    );

    const hasHighlight = localHighlights.find(h => h.verseId === verse.id);
    const isLiturgical = highlightedOrders.includes(verse.globalOrder);
    const isSearchTarget = searchHighlight?.targetOrder === verse.globalOrder;
    const query = searchHighlight?.query;
    
    const highlightTerms = (content: string, term: string | undefined) => {
      if (!term || term.length < 2) return content;
      const parts = content.split(new RegExp(`(${term})`, 'gi'));
      return parts.map((part, i) => part.toLowerCase() === term.toLowerCase() ? <mark key={i} className="bg-primary/20 text-inherit p-0 rounded-sm">{part}</mark> : part);
    };

    return (
      <div className={cn(
        "text-[17px] md:text-[18px] font-serif leading-[1.65] transition-all duration-500 rounded-lg",
        hasHighlight ? "bg-yellow-100/30 dark:bg-yellow-900/10 px-1 -mx-1 shadow-sm" : "text-zinc-800 dark:text-zinc-200",
        isLiturgical && "bg-primary/5 ring-1 ring-primary/10 px-4 -mx-4 py-2 my-1 shadow-md border-l-2 border-primary",
        isSearchTarget && "bg-primary/10 ring-2 ring-primary/20 px-4 -mx-4 py-2 my-1 shadow-md"
      )}>
        {verse.verse === 1 ? (
          <p><span className="float-left text-[2.8em] leading-[0.8] font-black text-primary mr-3 mt-1 font-serif opacity-90">{verse.text.charAt(0)}</span>{highlightTerms(verse.text.slice(1), query)}</p>
        ) : (
          <p>{highlightTerms(verse.text, query)}</p>
        )}
      </div>
    );
  };

  if (!totalCount) return (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <>
      <div ref={parentRef} className="h-full w-full overflow-auto bg-transparent scroll-smooth selection:bg-primary/10 scrollbar-none">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }} className="max-w-3xl mx-auto">
          {virtualRows.map((virtualRow) => {
            const order = virtualRow.index + 1;
            const verse = bibleData.getVerse(order);
            if (!verse) return (
              <div key={virtualRow.index} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="px-12 py-10 opacity-10">
                <div className="h-3 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              </div>
            );

            const hasBookmark = localBookmarks.find(b => b.verseId === verse.id);
            const hasNote = localNotes.find(n => n.verseId === verse.id);
            const isBookStart = verse.chapter === 1 && verse.verse === 1;

            return (
              <div
                key={virtualRow.index}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                className="group cursor-pointer"
                onClick={() => setActiveVerse(verse)}
              >
                {isBookStart && (
                  <div className="mb-12 mt-16 text-center border-b border-zinc-100 dark:border-zinc-900 pb-12 mx-6">
                    <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/50 mb-3">The Holy Bible</h2>
                    <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 font-serif lowercase italic">
                      {verse.book.name}
                    </h1>
                  </div>
                )}

                {verse.verse === 1 && !isBookStart && (
                  <div className="mt-8 mb-6 flex items-center gap-3 px-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Chapter {verse.chapter}</span>
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                  </div>
                )}

                <div className="flex gap-4 items-start px-6 py-1">
                  <div className="w-8 flex-shrink-0 pt-1.5 flex flex-col items-end gap-1.5">
                    <span className={cn("text-[10px] font-black tabular-nums transition-colors", hasBookmark ? "text-primary scale-110" : "text-zinc-300 group-hover:text-zinc-500")}>
                      {verse.verse}
                    </span>
                    <div className="flex flex-col gap-1">
                      {hasBookmark && <Bookmark className="h-2 w-2 text-primary fill-primary" />}
                      {hasNote && <MessageSquare className="h-2 w-2 text-primary/60" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">{renderVerseText(verse)}</div>
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
