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
  | { type: "prose-block"; book: any; chapter: number; verses: any[]; firstOrder: number; lastOrder: number };

export function useBibleReader(parentRef: React.RefObject<HTMLDivElement | null>) {
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);
  
  const setCurrentOrderStore = useReaderStore((state) => state.setCurrentOrder);
  const setTotalVerseCount = useReaderStore((state) => state.setTotalVerseCount);

  const [rows, setRows] = useState<BibleRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const lastSyncTime = useRef(0);
  const initialScrollDone = useRef(false);

  // 1. Multithreaded Worker Lifecycle
  useEffect(() => {
    workerRef.current = new Worker(new URL("../workers/bible-worker.ts", import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "READY") {
        setRowCount(payload.count);
        setIsWorkerReady(true);
        // Pre-fetch initial chunk
        workerRef.current?.postMessage({ type: "GET_ROWS", payload: { startIndex: 0, limit: 100 } });
      } else if (type === "ROWS_DATA") {
        const { startIndex, items } = payload;
        setRows(prev => {
          const next = [...prev];
          for (let i = 0; i < items.length; i++) {
            next[startIndex + i] = items[i];
          }
          return next;
        });
      } else if (type === "ORDER_INDEX") {
        const { index } = payload;
        if (index !== -1) {
          rowVirtualizer.scrollToIndex(index, { align: "start" });
        }
      } else if (type === "NOT_HYDRATED") {
        setIsHydrated(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  // 2. Worker Initialization
  useEffect(() => {
    if (workerRef.current) {
      setIsWorkerReady(false);
      workerRef.current.postMessage({ type: "INITIALIZE", payload: { slug: translationSlug } });
    }
  }, [translationSlug]);

  // 3. Background Sync (Fallback/Hydration)
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
      ).then(() => {
        setIsHydrated(true);
        // Re-init worker once hydrated
        workerRef.current?.postMessage({ type: "INITIALIZE", payload: { slug: translationSlug } });
      });
    }
  }, [totalVerseCount, translationSlug, utils]);

  // 4. Minecraft-like Chunk Loading
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (row?.type === "book-header") return 400;
      if (row?.type === "chapter-header") return 150;
      if (row?.type === "prose-block") return 30 * row.verses.length; 
      return 150;
    },
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Load missing chunks as we scroll
  useEffect(() => {
    if (virtualItems.length > 0 && isWorkerReady) {
      const firstIndex = virtualItems[0].index;
      const lastIndex = virtualItems[virtualItems.length - 1].index;
      
      // Check if we need to fetch data for these indices
      const missingIndices: number[] = [];
      for (let i = firstIndex; i <= lastIndex; i++) {
        if (!rows[i]) {
          missingIndices.push(i);
        }
      }

      if (missingIndices.length > 0) {
        const start = Math.min(...missingIndices);
        const limit = Math.max(...missingIndices) - start + 1;
        workerRef.current?.postMessage({ 
          type: "GET_ROWS", 
          payload: { startIndex: start, limit: Math.max(limit, 50) } 
        });
      }
    }
  }, [virtualItems, rows, isWorkerReady]);

  // 5. Initial Scroll
  useEffect(() => {
    if (!initialScrollDone.current && liturgicalReadings.length > 0 && isWorkerReady && rowCount > 0) {
      const firstReading = liturgicalReadings.find(r => r.type === "First Reading");
      if (firstReading && firstReading.orders.length > 0) {
        workerRef.current?.postMessage({ type: "FIND_ORDER", payload: { order: firstReading.orders[0] } });
        initialScrollDone.current = true;
      }
    }
  }, [liturgicalReadings, isWorkerReady, rowCount]);

  // 6. Navigation
  useEffect(() => {
    if (scrollToOrder !== null && isWorkerReady) {
      workerRef.current?.postMessage({ type: "FIND_ORDER", payload: { order: scrollToOrder } });
      setScrollToOrder(null);
    }
  }, [scrollToOrder, isWorkerReady, setScrollToOrder]);

  // 7. Sync Store
  useEffect(() => {
    if (virtualItems.length === 0 || !parentRef.current || rowCount === 0) return;
    const now = Date.now();
    if (now - lastSyncTime.current < 150) return;
    lastSyncTime.current = now;

    const visibleItem = virtualItems[0];
    const row = rows[visibleItem.index];
    if (!row) return;

    const state = useReaderStore.getState();
    if (state.totalVerseCount !== rowCount) setTotalVerseCount(rowCount);
    
    // SYNC GLOBAL ORDER
    let currentGlobalOrder = 1;
    if (row.type === "prose-block") {
      currentGlobalOrder = row.firstOrder;
    } else if (row.firstOrder) {
      currentGlobalOrder = row.firstOrder;
    }
    
    if (state.currentOrder !== currentGlobalOrder) setCurrentOrderStore(currentGlobalOrder);

    if (row.type === "prose-block") {
      const v = row.verses[0];
      if (state.currentBookId !== v.bookId) setCurrentBookId(v.bookId);
      if (state.currentChapter !== v.chapter) setCurrentChapter(v.chapter);
    } else {
      if (state.currentBookId !== row.book.id) setCurrentBookId(row.book.id);
      const ch = row.type === "chapter-header" ? row.chapter : 1;
      if (state.currentChapter !== ch) setCurrentChapter(ch);
    }
  }, [virtualItems, rows, rowCount]);

  return {
    rows,
    isLoading: !isWorkerReady && !isHydrated,
    rowVirtualizer,
    currentOrder: 0 // handled by store now
  };
}
