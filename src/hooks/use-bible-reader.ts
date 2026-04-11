"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { bibleService } from "~/lib/bible-service";
import { db } from "~/lib/db";

export type BibleRow = 
  | { type: "book-header"; book: any; firstOrder: number; lastOrder?: number }
  | { type: "chapter-header"; book: any; chapter: number; firstOrder: number; lastOrder?: number }
  | { type: "liturgical-header"; readingType: string; citation: string; firstOrder: number; lastOrder?: number; heading?: string }
  | { type: "prose-block"; book: any; chapter: number; verses: any[]; firstOrder: number; lastOrder: number };

export function useBibleReader(parentRef: React.RefObject<HTMLDivElement | null>) {
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const scrollToOrder = useReaderStore((state) => state.scrollToOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentBookId = useReaderStore((state) => state.setCurrentBookId);
  const setCurrentChapter = useReaderStore((state) => state.setCurrentChapter);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  
  const fontSize = useReaderStore((state) => state.fontSize);
  const currentOrderStore = useReaderStore((state) => state.currentOrder);
  const setCurrentOrderStore = useReaderStore((state) => state.setCurrentOrder);
  const setLastVisibleOrderStore = useReaderStore((state) => state.setLastVisibleOrder);
  const setTotalVerseCount = useReaderStore((state) => state.setTotalVerseCount);

  const utils = api.useUtils();

  const [rows, setRows] = useState<BibleRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const lastSyncTime = useRef(0);
  const initialScrollDone = useRef(false);

  // 1. STABLE WORKER LIFECYCLE (Fool-proof: Only starts once)
  useEffect(() => {
    const worker = new Worker(new URL("../workers/bible-worker.ts", import.meta.url));
    workerRef.current = worker;
    
    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "READY") {
        setRowCount(payload.count);
        setIsWorkerReady(true);
        worker.postMessage({ type: "GET_ROWS", payload: { startIndex: 0, limit: 100 } });
      } else if (type === "ROWS_DATA") {
        const { startIndex, items } = payload;
        setRows(prev => {
          if (startIndex === 0 && prev.length === 0) return items;
          const next = [...prev];
          for (let i = 0; i < items.length; i++) {
            next[startIndex + i] = items[i];
          }
          return next;
        });
      } else if (type === "ORDER_INDEX") {
        const { index } = payload;
        if (index !== -1) {
          requestAnimationFrame(() => {
            rowVirtualizer.scrollToIndex(index, { align: "start", behavior: "auto" });
          });
        }
      } else if (type === "NOT_HYDRATED") {
        setIsHydrated(false);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // EMPTY DEPENDENCY ARRAY IS CRITICAL FOR STABILITY

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index) => {
      const row = rows[index];
      if (row?.type === "book-header") return 400;
      if (row?.type === "chapter-header") return 150;
      if (row?.type === "liturgical-header") return 120;
      if (row?.type === "prose-block") {
        return (fontSize * 1.8 * 2.5) * row.verses.length; 
      }
      return 200;
    }, [rows, fontSize]),
    overscan: 20,
    paddingEnd: 100,
  });

  // 2. UNIFIED INITIALIZATION & CONTEXT SWITCHING
  const { data: serverVerseCount } = api.bible.getVerseCount.useQuery(
    { translationSlug },
    { staleTime: Infinity }
  );

  useEffect(() => {
    let isMounted = true;

    async function initializeContext() {
      // 1. Wait for worker to exist (future-proof against race conditions)
      if (!workerRef.current) {
        let attempts = 0;
        while (!workerRef.current && attempts < 20) {
          await new Promise(r => setTimeout(r, 50));
          attempts++;
        }
      }
      if (!workerRef.current || !isMounted) return;

      const localCount = await db.verses.where("translationId").equals(translationSlug).count();
      const totalCount = serverVerseCount || 35809;

      // 2. Enter clean state for the new translation
      setIsWorkerReady(false);
      setRows([]);
      setRowCount(0);

      // 3. Hydrate if missing
      if (localCount < totalCount) {
        setIsHydrated(false);
        await bibleService.syncBible(
          translationSlug, 
          totalCount, 
          (input) => utils.bible.getVersesByOrderRange.fetch(input)
        );
      }

      if (!isMounted) return;
      setIsHydrated(true);
      
      // 4. Command the worker to switch to the new translation
      workerRef.current.postMessage({ 
        type: "INITIALIZE", 
        payload: { slug: translationSlug, liturgicalReadings } 
      });
    }

    void initializeContext();

    return () => { isMounted = false; };
  }, [translationSlug, serverVerseCount, utils, liturgicalReadings]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  // 3. CHUNK LOADING
  useEffect(() => {
    if (virtualItems.length > 0 && isWorkerReady && workerRef.current) {
      const firstIndex = virtualItems[0].index;
      const lastIndex = virtualItems[virtualItems.length - 1].index;
      
      const missingIndices: number[] = [];
      for (let i = firstIndex; i <= lastIndex; i++) {
        if (!rows[i]) missingIndices.push(i);
      }

      if (missingIndices.length > 0) {
        const start = Math.min(...missingIndices);
        const limit = Math.max(...missingIndices) - start + 1;
        workerRef.current.postMessage({ 
          type: "GET_ROWS", 
          payload: { startIndex: start, limit: Math.max(limit, 50) } 
        });
      }
    }
  }, [virtualItems, rows, isWorkerReady]);

  // 4. INITIAL SCROLL & PERSISTENCE
  useEffect(() => {
    if (!initialScrollDone.current && isWorkerReady && rowCount > 0 && workerRef.current) {
      if (currentOrderStore > 1) {
        workerRef.current.postMessage({ type: "FIND_ORDER", payload: { order: currentOrderStore } });
        initialScrollDone.current = true;
        return;
      }

      if (liturgicalReadings.length > 0) {
        const firstReading = liturgicalReadings.find(r => r.type === "First Reading");
        if (firstReading && firstReading.orders.length > 0) {
          workerRef.current.postMessage({ type: "FIND_ORDER", payload: { order: firstReading.orders[0] } });
          initialScrollDone.current = true;
        }
      }
    }
  }, [liturgicalReadings, isWorkerReady, rowCount, currentOrderStore]);

  // 5. NAVIGATION
  useEffect(() => {
    if (scrollToOrder !== null && isWorkerReady && workerRef.current) {
      const element = document.getElementById(`verse-${scrollToOrder}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setScrollToOrder(null);
      } else {
        workerRef.current.postMessage({ type: "FIND_ORDER", payload: { order: scrollToOrder } });
        setScrollToOrder(null);
      }
    }
  }, [scrollToOrder, isWorkerReady, setScrollToOrder]);

  // 6. SYNC STORE (Visibility Tracking)
  useEffect(() => {
    if (virtualItems.length === 0 || !parentRef.current || rowCount === 0) return;
    const now = Date.now();
    if (now - lastSyncTime.current < 150) return;
    lastSyncTime.current = now;

    const visibleItem = virtualItems[0];
    if (!visibleItem) return;

    const row = rows[visibleItem.index];
    if (!row) return;

    const state = useReaderStore.getState();
    if (state.totalVerseCount !== rowCount) setTotalVerseCount(rowCount);
    
    const scrollTop = parentRef.current.scrollTop;
    const scrollBottom = scrollTop + parentRef.current.clientHeight;
    
    let currentGlobalOrder = state.currentOrder;
    let lastGlobalOrder = state.lastVisibleOrder;
    
    const topVisibleItem = virtualItems.find(item => (item.start + item.size) > scrollTop);
    const bottomVisibleItem = [...virtualItems].reverse().find(item => item.start < scrollBottom);

    if (topVisibleItem) {
      const row = rows[topVisibleItem.index];
      if (row) {
        if (row.type === "prose-block") {
          const delta = Math.max(0, scrollTop - topVisibleItem.start);
          const percentScrolled = delta / topVisibleItem.size;
          const verseIndex = Math.min(row.verses.length - 1, Math.floor(percentScrolled * row.verses.length));
          currentGlobalOrder = row.verses[verseIndex].globalOrder;
        } else if (row.firstOrder) {
          currentGlobalOrder = row.firstOrder;
        }
      }
    }

    if (bottomVisibleItem) {
      const row = rows[bottomVisibleItem.index];
      if (row) {
        if (row.type === "prose-block") {
          const delta = Math.min(bottomVisibleItem.size, scrollBottom - bottomVisibleItem.start);
          const percentVisible = delta / bottomVisibleItem.size;
          const verseIndex = Math.min(row.verses.length - 1, Math.floor(percentVisible * row.verses.length));
          lastGlobalOrder = row.verses[verseIndex].globalOrder;
        } else if (row.lastOrder || row.firstOrder) {
          lastGlobalOrder = row.lastOrder || row.firstOrder;
        }
      }
    }
    
    if (state.currentOrder !== currentGlobalOrder) setCurrentOrderStore(currentGlobalOrder);
    if (state.lastVisibleOrder !== lastGlobalOrder) setLastVisibleOrderStore(lastGlobalOrder);

    if (topVisibleItem) {
      const row = rows[topVisibleItem.index];
      if (row) {
        if (row.type === "prose-block") {
          const v = row.verses[0];
          if (state.currentBookId !== v.bookId) setCurrentBookId(v.bookId);
          if (state.currentChapter !== v.chapter) setCurrentChapter(v.chapter);
        } else if (row.type === "book-header" || row.type === "chapter-header") {
          if (state.currentBookId !== row.book.id) setCurrentBookId(row.book.id);
          const ch = row.type === "chapter-header" ? row.chapter : 1;
          if (state.currentChapter !== ch) setCurrentChapter(ch);
        }
      }
    }
  }, [virtualItems, rows, rowCount]);

  return {
    rows,
    isLoading: !isWorkerReady && !isHydrated,
    rowVirtualizer
  };
}
