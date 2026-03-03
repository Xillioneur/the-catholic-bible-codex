"use client";

import { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { VerseOverlay } from "./verse-overlay";

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
                    const verse = isParallelView ? (row as any).primary : row;
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
                            {(row as any).book.name} {(row as any).chapter}:{(row as any).verse}
                          </span>
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-600/20 to-transparent" />
                        </div>
                        <div className="relative">
                          <span className="absolute -left-8 md:-left-12 top-1.5 text-[10px] font-bold text-zinc-300 select-none group-hover:text-blue-600 transition-colors">
                            {(row as any).verse}
                          </span>
                          <p className="text-xl md:text-2xl font-serif leading-[1.8] text-zinc-800 dark:text-zinc-200 tracking-tight">
                            {(row as any).text}
                          </p>
                        </div>
                      </>
                    ) : (
                      // Parallel View
                      <div className="grid grid-cols-2 gap-8 md:gap-12">
                        <div className="flex flex-col gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                            {(row as any).primary.book.abbreviation} {(row as any).primary.chapter}:{(row as any).primary.verse}
                          </span>
                          <p className="text-base md:text-lg font-serif leading-relaxed text-zinc-800 dark:text-zinc-200">
                            {(row as any).primary.text}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 border-l border-zinc-100 pl-8 md:pl-12 dark:border-zinc-800">
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                            {parallelTranslationSlug?.toUpperCase()}
                          </span>
                          <p className="text-base md:text-lg font-serif leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {(row as any).parallel?.text ?? <span className="italic opacity-50">Translation unavailable</span>}
                          </p>
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
