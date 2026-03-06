"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { useVirtualizer } from "@tanstack/react-virtual";

export type BibleRow = 
  | { type: "book-header"; book: any }
  | { type: "chapter-header"; book: any; chapter: number }
  | { type: "verse"; verse: any };

/**
 * useBibleReader Hook
 * Flatten the 73 books into a single linear sequence of Headers and Verses.
 */
export function useBibleReader(parentRef: React.RefObject<HTMLDivElement | null>) {
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);

  const [currentOrder, setCurrentOrder] = useState<number>(1);

  // 1. Hydration
  const { data: allVerses, isLoading } = api.bible.getEntireBible.useQuery(
    { translationSlug },
    { staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // 2. Linearize the Bible: Interleave Headers with Verses
  const flattenedRows = useMemo(() => {
    if (!allVerses) return [];
    const rows: BibleRow[] = [];
    let lastBookId: number | null = null;
    let lastChapter: number | null = null;

    for (const v of allVerses) {
      if (v.bookId !== lastBookId) {
        rows.push({ type: "book-header", book: v.book });
        rows.push({ type: "chapter-header", book: v.book, chapter: v.chapter });
        lastBookId = v.bookId;
        lastChapter = v.chapter;
      } else if (v.chapter !== lastChapter) {
        rows.push({ type: "chapter-header", book: v.book, chapter: v.chapter });
        lastChapter = v.chapter;
      }
      rows.push({ type: "verse", verse: v });
    }
    return rows;
  }, [allVerses]);

  // 3. Virtualization
  const rowVirtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = flattenedRows[index];
      if (row?.type === "book-header") return 350;
      if (row?.type === "chapter-header") return 120;
      return 100;
    },
    overscan: 40,
  });

  // 4. Optimized Scroll Sync (Guarded to prevent jitter)
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0 || !parentRef.current || flattenedRows.length === 0) return;

    const scrollTop = parentRef.current.scrollTop;
    const visibleItem = virtualItems.find(item => item.start >= scrollTop - 10) ?? virtualItems[0];
    const row = flattenedRows[visibleItem!.index];

    if (!row) return;

    // Use store getState to check values before setting to avoid re-render loops
    const state = useReaderStore.getState();

    if (row.type === "verse") {
      if (currentOrder !== row.verse.globalOrder) setCurrentOrder(row.verse.globalOrder);
      if (state.currentBookId !== row.verse.bookId) state.setCurrentBookId(row.verse.bookId);
      if (state.currentChapter !== row.verse.chapter) state.setCurrentChapter(row.verse.chapter);
    } else if (row.type === "chapter-header" || row.type === "book-header") {
      if (state.currentBookId !== row.book.id) state.setCurrentBookId(row.book.id);
      const targetChapter = row.type === "chapter-header" ? row.chapter : 1;
      if (state.currentChapter !== targetChapter) state.setCurrentChapter(targetChapter);
    }
  }, [rowVirtualizer.getVirtualItems(), flattenedRows, currentOrder, parentRef]);

  // 5. Accurate Navigation
  useEffect(() => {
    if (scrollToOrder !== null && flattenedRows.length > 0) {
      const index = flattenedRows.findIndex(r => r.type === "verse" && r.verse.globalOrder === scrollToOrder);
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: "start" });
      }
      setScrollToOrder(null);
    }
  }, [scrollToOrder, flattenedRows, rowVirtualizer, setScrollToOrder]);

  return {
    rows: flattenedRows,
    allVerses,
    isLoading,
    rowVirtualizer,
    currentOrder
  };
}
