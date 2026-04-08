"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { bibleService } from "~/lib/bible-service";

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

  // 4. Minecraft-like Chunk Loading
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index) => {
      const row = rows[index];
      if (row?.type === "book-header") return 400;
      if (row?.type === "chapter-header") return 150;
      if (row?.type === "liturgical-header") return 120;
      if (row?.type === "prose-block") {
        // Average verse height is roughly 1.8 * fontSize * (line length estimation)
        // A prose block has 5 verses. 
        return (fontSize * 1.8 * 2.5) * row.verses.length; 
      }
      return 200;
    }, [rows, fontSize]),
    overscan: 20,
    paddingEnd: 100,
  });

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
          // IMPORTANT: Use a small timeout to allow React to process any row updates
          // and the virtualizer to have the latest heights.
          requestAnimationFrame(() => {
            rowVirtualizer.scrollToIndex(index, { align: "start", behavior: "auto" });
          });
        }
      } else if (type === "NOT_HYDRATED") {
        setIsHydrated(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, [rowVirtualizer]);

  // 2. Worker Initialization
  useEffect(() => {
    if (workerRef.current) {
      setIsWorkerReady(false);
      workerRef.current.postMessage({ 
        type: "INITIALIZE", 
        payload: { 
          slug: translationSlug,
          liturgicalReadings
        } 
      });
    }
  }, [translationSlug, liturgicalReadings]);

  // 3. Background Sync (Fallback/Hydration)
  const { data: totalVerseCount } = api.bible.getVerseCount.useQuery(
    { translationSlug },
    { staleTime: Infinity }
  );

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

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Load missing chunks as we scroll
  useEffect(() => {
    if (virtualItems.length > 0 && isWorkerReady) {
      const firstItem = virtualItems[0];
      const lastItem = virtualItems[virtualItems.length - 1];
      if (!firstItem || !lastItem) return;

      const firstIndex = firstItem.index;
      const lastIndex = lastItem.index;
      
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
    if (!initialScrollDone.current && isWorkerReady && rowCount > 0) {
      // 1. Prioritize Persisted Position (if not at the very beginning)
      if (currentOrderStore > 1) {
        console.log("[READER] Initial scroll to persisted position:", currentOrderStore);
        workerRef.current?.postMessage({ type: "FIND_ORDER", payload: { order: currentOrderStore } });
        initialScrollDone.current = true;
        return;
      }

      // 2. Fallback to Daily Reading
      if (liturgicalReadings.length > 0) {
        const firstReading = liturgicalReadings.find(r => r.type === "First Reading");
        if (firstReading && firstReading.orders.length > 0) {
          console.log("[READER] Initial scroll to daily reading");
          workerRef.current?.postMessage({ type: "FIND_ORDER", payload: { order: firstReading.orders[0] } });
          initialScrollDone.current = true;
        }
      }
    }
  }, [liturgicalReadings, isWorkerReady, rowCount, currentOrderStore]);

  // 6. Navigation
  useEffect(() => {
    if (scrollToOrder !== null && isWorkerReady) {
      // Hybrid Scroll: Try to find the specific verse element first
      const element = document.getElementById(`verse-${scrollToOrder}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setScrollToOrder(null);
      } else {
        // Fallback to Worker/Virtualizer if verse is off-screen (not rendered)
        workerRef.current?.postMessage({ type: "FIND_ORDER", payload: { order: scrollToOrder } });
        setScrollToOrder(null);
      }
    }
  }, [scrollToOrder, isWorkerReady, setScrollToOrder]);

  // 7. Sync Store
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
    
    // SYNC GLOBAL ORDER (Precise Visibility Calculation)
    const scrollTop = parentRef.current.scrollTop;
    const viewportHeight = parentRef.current.clientHeight;
    const scrollBottom = scrollTop + viewportHeight;
    
    let currentGlobalOrder = state.currentOrder;
    let lastGlobalOrder = state.lastVisibleOrder;
    
    // Find the first item that is actually visible (crosses scrollTop)
    const topVisibleItem = virtualItems.find(item => {
      const itemEnd = item.start + item.size;
      return itemEnd > scrollTop;
    });

    // Find the last item that is actually visible (crosses scrollBottom)
    const bottomVisibleItem = [...virtualItems].reverse().find(item => {
      return item.start < scrollBottom;
    });

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
    
    if (state.currentOrder !== currentGlobalOrder) {
      setCurrentOrderStore(currentGlobalOrder);
    }
    if (state.lastVisibleOrder !== lastGlobalOrder) {
      setLastVisibleOrderStore(lastGlobalOrder);
    }

    // Sync Book/Chapter based on the same precise row
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
    rowVirtualizer,
    currentOrder: 0 // handled by store now
  };
}
