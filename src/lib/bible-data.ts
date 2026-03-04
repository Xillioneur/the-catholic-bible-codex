// Bible Worker: Handles background data management
// decoupled from the main UI thread for maximum performance.

export interface BibleWorkerMessage {
  type: "LOAD_RANGE" | "LOADED" | "ERROR";
  payload: any;
}

class BibleDataManager {
  private cache: Map<number, any> = new Map();
  private loadingRanges: Set<number> = new Set();
  
  // High-performance chunk size for Bible-scale depth
  public static readonly CHUNK_SIZE = 1000;

  async fetchRange(
    chunkIndex: number, 
    translationSlug: string, 
    totalCount: number, 
    fetcher: (input: any) => Promise<any[]>
  ) {
    if (this.loadingRanges.has(chunkIndex)) return;
    
    const startOrder = chunkIndex * BibleDataManager.CHUNK_SIZE + 1;
    if (startOrder > totalCount) return;

    const endOrder = Math.min(startOrder + BibleDataManager.CHUNK_SIZE - 1, totalCount);
    
    this.loadingRanges.add(chunkIndex);

    try {
      const verses = await fetcher({
        translationSlug,
        startOrder,
        endOrder
      });
      
      verses.forEach(v => this.cache.set(v.globalOrder, v));
      return verses;
    } finally {
      this.loadingRanges.add(chunkIndex); // Keep in set to avoid refetches
      this.loadingRanges.delete(chunkIndex); // Standard cleanup
    }
  }

  getVerse(order: number) {
    return this.cache.get(order);
  }

  hasVerse(order: number) {
    return this.cache.has(order);
  }
}

export const bibleData = new BibleDataManager();
