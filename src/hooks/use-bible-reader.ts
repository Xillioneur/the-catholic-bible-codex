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
  | { type: "prose-block"; book: any; chapter: number; verses: any[] };

export function useBibleReader(parentRef: React.RefObject<HTMLDivElement | null>) {
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);
  
  const setCurrentOrderStore = useReaderStore((state) => state.setCurrentOrder);
  const setTotalVerseCount = useReaderStore((state) => state.setTotalVerseCount);

  const [currentOrder, setCurrentOrder] = useState<number>(1);
  const lastSyncTime = useRef(0);
  const initialScrollDone = useRef(false);

  const { data: totalVerseCount } = api.bible.getVerseCount.useQuery(
    { translationSlug },
    { staleTime: Infinity }
  );

  const utils = api.useUtils();
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);

  useEffect(() => {
    if (totalVerseCount) {
      void bibleService.syncBible(
        translationSlug, 
        totalVerseCount, 
        (input) => utils.bible.getVersesByOrderRange.fetch(input)
      );
    }
  }, [totalVerseCount, translationSlug, utils]);

  const allVerses = useLiveQuery(
    () => db.verses.where("translationId").equals(translationSlug).sortBy("globalOrder"),
    [translationSlug]
  );

  const isLoading = !allVerses || allVerses.length === 0;

  // 4. Grouping into Prose Blocks
  const flattenedRows = useMemo(() => {
    if (!allVerses) return [];
    const rows: BibleRow[] = [];
    let lastBookId: number | null = null;
    let lastChapter: number | null = null;
    let currentProseVerses: any[] = [];

    const flushProse = () => {
      if (currentProseVerses.length > 0) {
        const first = currentProseVerses[0];
        rows.push({ 
          type: "prose-block", 
          book: first.book, 
          chapter: first.chapter, 
          verses: [...currentProseVerses] 
        });
        currentProseVerses = [];
      }
    };

    for (let i = 0; i < allVerses.length; i++) {
      const v = allVerses[i]!;
      
      if (v.bookId !== lastBookId) {
        flushProse();
        rows.push({ type: "book-header", book: v.book });
        rows.push({ type: "chapter-header", book: v.book, chapter: v.chapter });
        lastBookId = v.bookId;
        lastChapter = v.chapter;
      } else if (v.chapter !== lastChapter) {
        flushProse();
        rows.push({ type: "chapter-header", book: v.book, chapter: v.chapter });
        lastChapter = v.chapter;
      }

      currentProseVerses.push(v);

      // Simple paragraph logic: group every 5 verses or on chapter/book breaks
      if (currentProseVerses.length >= 5) {
        flushProse();
      }
    }
    flushProse();
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
      if (row?.type === "prose-block") return 100 * row.verses.length; // rough estimate
      return 100;
    },
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // 6. INITIAL SCROLL TO LITURGICAL
  useEffect(() => {
    if (!initialScrollDone.current && liturgicalReadings.length > 0 && flattenedRows.length > 0) {
      const firstReading = liturgicalReadings.find(r => r.type === "First Reading");
      if (firstReading && firstReading.orders.length > 0) {
        const order = firstReading.orders[0];
        const index = flattenedRows.findIndex(r => 
          r.type === "prose-block" && r.verses.some(v => v.globalOrder === order)
        );
        if (index !== -1) {
          rowVirtualizer.scrollToIndex(index, { align: "start" });
          initialScrollDone.current = true;
        }
      }
    }
  }, [liturgicalReadings, flattenedRows, rowVirtualizer]);

  // 7. REACTIVE SCROLL SYNC
  useEffect(() => {
    if (virtualItems.length === 0 || !parentRef.current || flattenedRows.length === 0) return;

    const now = Date.now();
    if (now - lastSyncTime.current < 100) return;
    lastSyncTime.current = now;

    const scrollTop = parentRef.current.scrollTop;
    const visibleItem = virtualItems.find(item => item.start >= scrollTop - 10) ?? virtualItems[0];
    if (!visibleItem) return;

    const row = flattenedRows[visibleItem.index];
    if (!row) return;

    const state = useReaderStore.getState();
    
    if (state.totalVerseCount !== flattenedRows.length) {
      setTotalVerseCount(flattenedRows.length);
    }

    if (state.currentOrder !== visibleItem.index + 1) {
      setCurrentOrderStore(visibleItem.index + 1);
    }

    if (row.type === "prose-block") {
      const firstVerse = row.verses[0];
      setCurrentOrder(firstVerse.globalOrder);
      if (state.currentBookId !== firstVerse.bookId) setCurrentBookId(firstVerse.bookId);
      if (state.currentChapter !== firstVerse.chapter) setCurrentChapter(firstVerse.chapter);
    } else if (row.type === "chapter-header" || row.type === "book-header") {
      if (state.currentBookId !== row.book.id) setCurrentBookId(row.book.id);
      const targetChapter = row.type === "chapter-header" ? row.chapter : 1;
      if (state.currentChapter !== targetChapter) setCurrentChapter(targetChapter);
    }
  }, [virtualItems, flattenedRows, parentRef, setTotalVerseCount, setCurrentOrderStore, setCurrentBookId, setCurrentChapter]);

  // 8. Navigation
  useEffect(() => {
    if (scrollToOrder !== null && flattenedRows.length > 0) {
      const index = flattenedRows.findIndex(r => 
        r.type === "prose-block" && r.verses.some(v => v.globalOrder === scrollToOrder)
      );
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
