import { db, type LocalVerse } from "./db";

/**
 * BibleService handles background synchronization and 
 * high-performance data retrieval from local IndexedDB.
 */
export class BibleService {
  private static instance: BibleService;
  private isSyncing = false;

  static getInstance() {
    if (!BibleService.instance) {
      BibleService.instance = new BibleService();
    }
    return BibleService.instance;
  }

  /**
   * Performs high-speed parallel background hydration.
   * Spawns multiple "threads" (concurrent requests) to load the whole Bible.
   */
  async syncBible(translationSlug: string, totalCount: number, fetcher: (input: any) => Promise<any[]>) {
    if (this.isSyncing) return;
    
    // Check if we already have the complete translation locally
    const localCount = await db.verses.where("translationId").equals(translationSlug).count();
    if (localCount >= totalCount) {
      console.log(`[BibleService] ${translationSlug} already hydrated.`);
      return;
    }

    console.log(`[BibleService] Starting Multithreaded Hydration for ${translationSlug}...`);
    this.isSyncing = true;

    try {
      // 1. Try to fetch from the server in chunks (efficient for delta syncs)
      const CHUNK_SIZE = 2000;
      const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);
      const MAX_CONCURRENCY = 4;
      const chunks = Array.from({ length: totalChunks }, (_, i) => i);

      const worker = async () => {
        while (chunks.length > 0) {
          const chunkIndex = chunks.shift();
          if (chunkIndex === undefined) break;

          const startOrder = chunkIndex * CHUNK_SIZE + 1;
          const endOrder = Math.min(startOrder + CHUNK_SIZE - 1, totalCount);

          try {
            const verses = await fetcher({
              translationSlug,
              startOrder,
              endOrder
            });
            
            await db.verses.bulkPut(verses.map(v => ({
              ...v,
              translationId: translationSlug
            })));
          } catch (e) {
            console.warn(`[BibleService] Server chunk ${chunkIndex} failed. Moving to full local fallback.`);
            throw e; // Break and go to full local fallback
          }
        }
      };

      await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => worker()));
    } catch (err) {
      console.log(`[BibleService] Server sync failed (likely offline). Attempting full local JSON hydration...`);
      try {
        // 2. EMERGENCY FALLBACK: Fetch the entire JSON source (cached in SW) and populate Dexie
        const response = await fetch(`/data/${translationSlug}.json`);
        if (!response.ok) throw new Error("Local JSON source not found.");
        
        const allVerses = await response.json();
        await db.verses.bulkPut(allVerses.map((v: any) => ({
          ...v,
          translationId: translationSlug
        })));
        console.log(`[BibleService] Full local hydration successful.`);
      } catch (e) {
        console.error(`[BibleService] Critical error: Full hydration failed.`, e);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async getLocalVerses(translationSlug: string) {
    return db.verses
      .where("translationId")
      .equals(translationSlug)
      .sortBy("globalOrder");
  }
}

export const bibleService = BibleService.getInstance();
