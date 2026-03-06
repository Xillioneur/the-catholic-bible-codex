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

    const CHUNK_SIZE = 2000;
    const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);
    
    // Process in parallel "threads" (max 4 concurrent requests to stay within HTTP/2 limits)
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
            translationId: translationSlug // use slug as ID for simplicity in local DB
          })));
          
          console.log(`[BibleService] Hydrated chunk ${chunkIndex + 1}/${totalChunks}`);
        } catch (e) {
          console.error(`[BibleService] Failed chunk ${chunkIndex}`, e);
          chunks.push(chunkIndex); // retry later
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    };

    // Spawn "threads"
    await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => worker()));
    
    this.isSyncing = false;
    console.log(`[BibleService] Hydration complete.`);
  }

  async getLocalVerses(translationSlug: string) {
    return db.verses
      .where("translationId")
      .equals(translationSlug)
      .sortBy("globalOrder");
  }
}

export const bibleService = BibleService.getInstance();
