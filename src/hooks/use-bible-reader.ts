"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { bibleService } from "~/lib/bible-service";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/lib/db";

export type BibleRow = 
  | { type: "book-header"; book: any }
  | { type: "chapter-header"; book: any; chapter: number }
  | { type: "verse"; verse: any };

export function useBibleReader(parentRef: React.RefObject<HTMLDivElement | null>) {
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);

  const [currentOrder, setCurrentOrder] = useState<number>(1);
  const lastSyncTime = useRef(0);

  // 1. Hydration
  const { data: totalCount } = api.bible.getVerseCount.useQuery(
    { translationSlug },
    { staleTime: Infinity }
  );

  const utils = api.useUtils();

  // 2. Background Sync
  useEffect(() => {
    if (totalCount) {
      void bibleService.syncBible(
        translationSlug, 
        totalCount, 
        (input) => utils.bible.getVersesByOrderRange.fetch(input)
      );
    }
  }, [totalCount, translationSlug, utils]);

  // 3. Optimized Data Stream
  const allVerses = useLiveQuery(
    () => db.verses.where("translationId").equals(translationSlug).sortBy("globalOrder"),
    [translationSlug]
  );

  const isLoading = !allVerses || allVerses.length === 0;

  // 4. Heavy linearization memoized strictly
  const flattenedRows = useMemo(() => {
    if (!allVerses) return [];
    const rows: BibleRow[] = [];
    let lastBookId: number | null = null;
    let lastChapter: number | null = null;

    for (let i = 0; i < allVerses.length; i++) {
      const v = allVerses[i]!;
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

  // 5. Virtualization Tuning
  const rowVirtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = flattenedRows[index];
      if (row?.type === "book-header") return 350;
      if (row?.type === "chapter-header") return 120;
      return 90; // Optimized tighter estimate
    },
    overscan: 30, // Reduced overscan to save CPU during scroll
  });

  // 6. Throttled Scroll Sync (The key to 20% CPU)
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0 || !parentRef.current || flattenedRows.length === 0) return;

    const now = Date.now();
    if (now - lastSyncTime.current < 150) return; // Sync only every 150ms
    lastSyncTime.current = now;

    const scrollTop = parentRef.current.scrollTop;
    const visibleItem = virtualItems.find(item => item.start >= scrollTop - 5) ?? virtualItems[0];
    const row = flattenedRows[visibleItem!.index];

    if (!row) return;

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

  // 7. Navigation
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
    isLoading,
    rowVirtualizer,
    currentOrder
  };
}
