"use client";

import { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { VerseOverlay } from "./verse-overlay";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Bookmark, MessageSquare } from "lucide-react";
import { cn } from "~/lib/utils";

interface BibleReaderProps {
  initialTranslationId?: string;
}

export function BibleReader({ initialTranslationId }: BibleReaderProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const parallelTranslationSlug = useReaderStore((state) => state.parallelTranslationSlug);
  const isParallelView = useReaderStore((state) => state.isParallelView);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const currentBookId = useReaderStore((state) => state.currentBookId);
  const currentChapter = useReaderStore((state) => state.currentChapter);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);
  const startOrder = useReaderStore((state) => state.startOrder);

  const [activeVerse, setActiveVerse] = useState<any | null>(null);

  // Local user data
  const localHighlights = useLiveQuery(() => db.highlights.toArray()) ?? [];
  const localBookmarks = useLiveQuery(() => db.bookmarks.toArray()) ?? [];
  const localNotes = useLiveQuery(() => db.notes.toArray()) ?? [];

  const { data: translations } = api.bible.getTranslations.useQuery();
  const currentTranslation = translations?.find(t => t.slug === translationSlug);
  const translationId = currentTranslation?.id ?? initialTranslationId;

  // Normal view query
  const normalQuery = api.bible.getVerses.useInfiniteQuery(
    {
      translationId,
      limit: 100,
      cursor: startOrder > 1 ? startOrder - 1 : undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!translationId && !isParallelView,
    }
  );

  // Parallel view query
  const parallelQuery = api.bible.getParallelVerses.useInfiniteQuery(
    {
      primaryTranslationSlug: translationSlug,
      parallelTranslationSlug: parallelTranslationSlug ?? "webbe",
      limit: 50,
      cursor: startOrder > 1 ? startOrder - 1 : undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!translationId && isParallelView,
    }
  );

  const query = isParallelView ? parallelQuery : normalQuery;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = query;

  const allRows = data ? data.pages.flatMap((d) => d.items) : [];

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allRows.length + 1 : allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isParallelView ? 180 : 120, 
    overscan: 40,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (virtualRows.length > 0) {
      const firstVisible = virtualRows[0];
      const row = allRows[firstVisible!.index];
      if (row) {
        const verse = isParallelView ? (row as any).primary : row;
        if (verse.bookId !== currentBookId) {
          setCurrentBookId(verse.bookId);
        }
        if (verse.chapter !== currentChapter) {
          setCurrentChapter(verse.chapter);
        }
      }
    }
  }, [virtualRows, allRows, currentBookId, currentChapter, setCurrentBookId, setCurrentChapter, isParallelView]);

  useEffect(() => {
    if (scrollToOrder !== null && allRows.length > 0) {
      const index = allRows.findIndex(row => {
        const verse = isParallelView ? (row as any).primary : row;
        return verse.globalOrder === scrollToOrder;
      });
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: "start" });
        setScrollToOrder(null);
      }
    }
  }, [scrollToOrder, allRows, rowVirtualizer, setScrollToOrder, isParallelView]);

  useEffect(() => {
    const [lastItem] = [...virtualRows].reverse();
    if (!lastItem) return;
    if (
      lastItem.index >= allRows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, allRows.length, isFetchingNextPage, virtualRows]);

  if (status === "pending") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Opening the Word</p>
        </div>
      </div>
    );
  }

  const renderVerseText = (verse: any, isPrimary: boolean = true) => {
    if (!verse) return <span className="italic opacity-50">Translation unavailable</span>;
    
    const hasHighlight = localHighlights.find(h => h.verseId === verse.id);
    const isFirstVerse = verse.verse === 1;
    const text = verse.text;

    return (
      <p className={cn(
        "text-xl md:text-2xl font-serif leading-[1.8] tracking-tight transition-colors",
        !isPrimary && "text-base md:text-lg text-zinc-600 dark:text-zinc-400",
        hasHighlight ? "bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg px-1 -mx-1" : "text-zinc-800 dark:text-zinc-200"
      )}>
        {isFirstVerse ? (
          <>
            <span className="float-left text-[3.5em] leading-[0.8] font-black text-blue-600 mr-2 mt-[-0.1em] font-serif">
              {text.charAt(0)}
            </span>
            {text.slice(1)}
          </>
        ) : (
          text
        )}
      </p>
    );
  };

  return (
    <>
      <div
        ref={parentRef}
        className="h-full w-full overflow-auto bg-transparent scroll-smooth selection:bg-blue-100 selection:text-blue-900"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
          className="max-w-5xl mx-auto"
        >
          {virtualRows.map((virtualRow) => {
            const isLoaderRow = virtualRow.index > allRows.length - 1;
            const row = allRows[virtualRow.index];
            const verse = isParallelView ? (row as any)?.primary : row;
            
            const hasBookmark = localBookmarks.find(b => b.verseId === verse?.id);
            const hasNote = localNotes.find(n => n.verseId === verse?.id);

            return (
              <div
                key={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="px-6 md:px-12 py-8 group cursor-pointer"
                onClick={() => {
                  if (!isLoaderRow) {
                    setActiveVerse(verse);
                  }
                }}
              >
                {isLoaderRow ? (
                  hasNextPage ? (
                    <div className="flex justify-center p-12">
                      <div className="h-1 w-12 rounded-full bg-zinc-200 animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex justify-center p-12 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">Selah</div>
                  )
                ) : (
                  <div className="max-w-4xl mx-auto flex flex-col gap-3 transition-all duration-500">
                    {!isParallelView ? (
                      // Single View
                      <>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-black uppercase tracking-widest text-blue-600/60">
                            {verse.book.name} {verse.chapter}:{verse.verse}
                          </span>
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-600/20 to-transparent" />
                          <div className="flex gap-2">
                            {hasBookmark && <Bookmark className="h-3 w-3 text-blue-600 fill-blue-600" />}
                            {hasNote && <MessageSquare className="h-3 w-3 text-blue-600" />}
                          </div>
                        </div>
                        <div className="relative">
                          {verse.verse !== 1 && (
                            <span className={cn(
                              "absolute -left-8 md:-left-12 top-1.5 text-[10px] font-bold select-none transition-colors",
                              hasBookmark ? "text-blue-600" : "text-zinc-300 group-hover:text-blue-600"
                            )}>
                              {verse.verse}
                            </span>
                          )}
                          {renderVerseText(verse, true)}
                        </div>
                      </>
                    ) : (
                      // Parallel View
                      <div className="grid grid-cols-2 gap-8 md:gap-12">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                              {verse.book.abbreviation} {verse.chapter}:{verse.verse}
                            </span>
                            {hasBookmark && <Bookmark className="h-2.5 w-2.5 text-blue-600 fill-blue-600" />}
                          </div>
                          {renderVerseText(verse, true)}
                        </div>
                        <div className="flex flex-col gap-2 border-l border-zinc-100 dark:border-zinc-800 pl-8 md:pl-12">
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                            {parallelTranslationSlug?.toUpperCase()}
                          </span>
                          {renderVerseText((row as any).parallel, false)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {activeVerse && (
        <VerseOverlay 
          verseId={activeVerse.id}
          bookId={activeVerse.bookId}
          bookName={activeVerse.book.name}
          chapter={activeVerse.chapter}
          verse={activeVerse.verse}
          text={activeVerse.text}
          onClose={() => setActiveVerse(null)}
        />
      )}
    </>
  );
}
