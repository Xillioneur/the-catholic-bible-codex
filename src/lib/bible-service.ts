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

    console.log(`[BibleService] Starting Hydration for ${translationSlug}...`);
    this.isSyncing = true;

    try {
      // 1. PREFER JSON HYDRATION (Static files in /public/data are MUCH faster)
      console.log(`[BibleService] Attempting fast JSON hydration for ${translationSlug}...`);
      const response = await fetch(`/data/${translationSlug}.json`);
      if (response.ok) {
        const allVerses = await response.json();
        if (Array.isArray(allVerses) && allVerses.length > 0) {
          await db.verses.bulkPut(allVerses.map((v: any) => ({
            ...v,
            translationId: translationSlug
          })));
          console.log(`[BibleService] Fast JSON hydration successful for ${translationSlug}.`);
          return;
        }
      }
      throw new Error("JSON source not available or empty.");
    } catch (err) {
      console.log(`[BibleService] JSON hydration failed or skipped. Falling back to tRPC chunking...`);
      try {
        // 2. FALLBACK: Fetch from the server in chunks (useful for custom translations or delta syncs)
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

            const verses = await fetcher({
              translationSlug,
              startOrder,
              endOrder
            });
            
            await db.verses.bulkPut(verses.map(v => ({
              ...v,
              translationId: translationSlug
            })));
          }
        };

        await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => worker()));
        console.log(`[BibleService] tRPC chunked hydration successful for ${translationSlug}.`);
      } catch (e) {
        console.error(`[BibleService] Critical error: All hydration paths failed for ${translationSlug}.`, e);
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
