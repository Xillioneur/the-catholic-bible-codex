"use client";

import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";

interface BibleReaderProps {
  initialTranslationId?: string;
}

export function BibleReader({ initialTranslationId }: BibleReaderProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Use selective subscriptions to avoid unnecessary re-renders
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const currentBookId = useReaderStore((state) => state.currentBookId);
  const currentChapter = useReaderStore((state) => state.currentChapter);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);

  const { data: translations } = api.bible.getTranslations.useQuery();
  
  const currentTranslation = translations?.find(t => t.slug === translationSlug);
  const translationId = currentTranslation?.id ?? initialTranslationId;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = api.bible.getVerses.useInfiniteQuery(
    {
      translationId,
      limit: 100,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!translationId,
    }
  );

  const allRows = data ? data.pages.flatMap((d) => d.items) : [];

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allRows.length + 1 : allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, 
    overscan: 40,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Track scroll and update current book/chapter in the store
  // Guarded with equality checks to prevent infinite loops
  useEffect(() => {
    if (virtualRows.length > 0) {
      const firstVisible = virtualRows[0];
      const verse = allRows[firstVisible!.index];
      if (verse) {
        if (verse.bookId !== currentBookId) {
          setCurrentBookId(verse.bookId);
        }
        if (verse.chapter !== currentChapter) {
          setCurrentChapter(verse.chapter);
        }
      }
    }
  }, [virtualRows, allRows, currentBookId, currentChapter, setCurrentBookId, setCurrentChapter]);

  // Handle scroll to order
  useEffect(() => {
    if (scrollToOrder !== null && allRows.length > 0) {
      const index = allRows.findIndex(v => v.globalOrder === scrollToOrder);
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: "start" });
        setScrollToOrder(null);
      } else if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    }
  }, [scrollToOrder, allRows, rowVirtualizer, setScrollToOrder, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle infinite scroll fetching
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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Loading Scripture</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return <div className="flex h-full items-center justify-center text-red-500 font-medium tracking-tight">An error occurred loading the Word.</div>;
  }

  return (
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
        className="max-w-4xl mx-auto"
      >
        {virtualRows.map((virtualRow) => {
          const isLoaderRow = virtualRow.index > allRows.length - 1;
          const verse = allRows[virtualRow.index];

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
              className="px-6 md:px-12 py-8 group"
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
                <div className="max-w-2xl mx-auto flex flex-col gap-3 transition-all duration-500">
                   <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600/60">
                      {verse?.book.name} {verse?.chapter}:{verse?.verse}
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-600/20 to-transparent" />
                  </div>
                  <div className="relative">
                    <span className="absolute -left-8 md:-left-12 top-1.5 text-[10px] font-bold text-zinc-300 select-none group-hover:text-blue-600 transition-colors">
                      {verse?.verse}
                    </span>
                    <p className="text-xl md:text-2xl font-serif leading-[1.8] text-zinc-800 dark:text-zinc-200 tracking-tight">
                      {verse?.text}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
