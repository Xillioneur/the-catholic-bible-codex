import { db } from "~/lib/db";

// The worker's internal state: a pre-processed map of the Bible structure
let translationSlug = "";
let rows: any[] = [];
let isReady = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "INITIALIZE") {
    const { slug, liturgicalReadings = [] } = payload;
    
    translationSlug = slug;
    isReady = false;
    
    try {
      // 1. Load all verses once (Multithreaded Dexie access)
      const allVerses = await db.verses
        .where("translationId")
        .equals(slug)
        .sortBy("globalOrder");

      if (allVerses.length === 0) {
        self.postMessage({ type: "NOT_HYDRATED" });
        return;
      }

      // 2. Pre-process into Prose Blocks (The "Minecraft Chunk" Generation)
      const processedRows: any[] = [];
      let lastBookId: number | null = null;
      let lastChapter: number | null = null;
      let currentProseVerses: any[] = [];

      const flushProse = () => {
        if (currentProseVerses.length > 0) {
          const first = currentProseVerses[0];
          processedRows.push({ 
            type: "prose-block", 
            book: first.book, 
            chapter: first.chapter, 
            verses: [...currentProseVerses],
            firstOrder: first.globalOrder,
            lastOrder: currentProseVerses[currentProseVerses.length - 1].globalOrder
          });
          currentProseVerses = [];
        }
      };

      for (const v of allVerses) {
        // INJECT LITURGICAL HEADERS
        const reading = liturgicalReadings.find((r: any) => r.orders[0] === v.globalOrder);
        if (reading) {
          flushProse();
          processedRows.push({ 
            type: "liturgical-header", 
            readingType: reading.type, 
            citation: reading.citation,
            heading: reading.heading,
            firstOrder: v.globalOrder 
          });
        }

        if (v.bookId !== lastBookId) {
          flushProse();
          processedRows.push({ type: "book-header", book: v.book, firstOrder: v.globalOrder });
          processedRows.push({ type: "chapter-header", book: v.book, chapter: v.chapter, firstOrder: v.globalOrder });
          lastBookId = v.bookId;
          lastChapter = v.chapter;
        } else if (v.chapter !== lastChapter) {
          flushProse();
          processedRows.push({ type: "chapter-header", book: v.book, chapter: v.chapter, firstOrder: v.globalOrder });
          lastChapter = v.chapter;
        }

        currentProseVerses.push(v);
        if (currentProseVerses.length >= 5) flushProse();
      }
      flushProse();

      rows = processedRows;
      isReady = true;
      self.postMessage({ type: "READY", payload: { count: rows.length } });
    } catch (err) {
      self.postMessage({ type: "ERROR", payload: err });
    }
  }

  if (type === "GET_ROWS") {
    const { startIndex, limit } = payload;
    const chunk = rows.slice(startIndex, startIndex + limit);
    self.postMessage({ type: "ROWS_DATA", payload: { startIndex, items: chunk } });
  }

  if (type === "FIND_ORDER") {
    const { order } = payload;
    const index = rows.findIndex(r => {
      if (r.type === "prose-block") {
        return order >= r.firstOrder && order <= r.lastOrder;
      }
      return r.firstOrder === order;
    });
    self.postMessage({ type: "ORDER_INDEX", payload: { order, index } });
  }
};
