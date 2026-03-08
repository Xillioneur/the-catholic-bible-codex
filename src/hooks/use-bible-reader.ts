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
  
  // Get reactive setters
  const setCurrentOrderStore = useReaderStore((state) => state.setCurrentOrder);
  const setTotalVerseCount = useReaderStore((state) => state.setTotalVerseCount);

  const [currentOrder, setCurrentOrder] = useState<number>(1);
  const lastSyncTime = useRef(0);

  // 1. Hydration Info
  const { data: totalVerseCount } = api.bible.getVerseCount.useQuery(
    { translationSlug },
    { staleTime: Infinity }
  );

  const utils = api.useUtils();

  // 2. Background Sync
  useEffect(() => {
    if (totalVerseCount) {
      void bibleService.syncBible(
        translationSlug, 
        totalVerseCount, 
        (input) => utils.bible.getVersesByOrderRange.fetch(input)
      );
    }
  }, [totalVerseCount, translationSlug, utils]);

  // 3. Data Stream
  const allVerses = useLiveQuery(
    () => db.verses.where("translationId").equals(translationSlug).sortBy("globalOrder"),
    [translationSlug]
  );

  const isLoading = !allVerses || allVerses.length === 0;

  // 4. Linearization
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

  // 5. Virtualization
  const rowVirtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = flattenedRows[index];
      if (row?.type === "book-header") return 400;
      if (row?.type === "chapter-header") return 150;
      return 100;
    },
    overscan: 30,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // 6. REACTIVE SCROLL SYNC
  useEffect(() => {
    if (virtualItems.length === 0 || !parentRef.current || flattenedRows.length === 0) return;

    const now = Date.now();
    if (now - lastSyncTime.current < 50) return; // Faster sync (50ms)
    lastSyncTime.current = now;

    const scrollTop = parentRef.current.scrollTop;
    const visibleItem = virtualItems.find(item => item.start >= scrollTop - 5) ?? virtualItems[0];
    if (!visibleItem) return;

    const row = flattenedRows[visibleItem.index];
    if (!row) return;

    // Use current store state for guards
    const state = useReaderStore.getState();
    
    // SYNC TOTALS (Use flattened length for accurate progress bar)
    if (state.totalVerseCount !== flattenedRows.length) {
      setTotalVerseCount(flattenedRows.length);
    }

    // SYNC POSITION
    // Use the index directly for the "canonical" progress number
    if (state.currentOrder !== visibleItem.index + 1) {
      setCurrentOrderStore(visibleItem.index + 1);
    }

    if (row.type === "verse") {
      setCurrentOrder(row.verse.globalOrder);
      if (state.currentBookId !== row.verse.bookId) setCurrentBookId(row.verse.bookId);
      if (state.currentChapter !== row.verse.chapter) setCurrentChapter(row.verse.chapter);
    } else if (row.type === "chapter-header" || row.type === "book-header") {
      if (state.currentBookId !== row.book.id) setCurrentBookId(row.book.id);
      const targetChapter = row.type === "chapter-header" ? row.chapter : 1;
      if (state.currentChapter !== targetChapter) setCurrentChapter(targetChapter);
    }
  }, [virtualItems, flattenedRows, parentRef, setTotalVerseCount, setCurrentOrderStore, setCurrentBookId, setCurrentChapter]);

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
