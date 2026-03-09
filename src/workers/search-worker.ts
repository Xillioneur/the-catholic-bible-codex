import { db } from "~/lib/db";

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "SEARCH") {
    const { query, translationSlug, bookId, chapter, mode } = payload;
    
    try {
      if (!query || query.length < 2) {
        self.postMessage({ type: "SEARCH_RESULTS", payload: { items: [], total: 0 } });
        return;
      }

      let collection = db.verses.where("translationId").equals(translationSlug);
      
      // Parse advanced query
      // "exact phrase" -> matches whole phrase
      // word1 word2 -> matches both words (AND logic)
      const isExact = query.startsWith('"') && query.endsWith('"');
      const cleanQuery = isExact ? query.slice(1, -1) : query;
      const terms = isExact ? [cleanQuery.toLowerCase()] : cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);

      const searchResults = await collection
        .filter(v => {
          const text = v.text.toLowerCase();
          
          // Apply Book/Chapter filters in-memory for precision
          if (mode === "book" && v.bookId !== bookId) return false;
          if (mode === "chapter" && (v.bookId !== bookId || v.chapter !== chapter)) return false;

          if (isExact) {
            return text.includes(cleanQuery.toLowerCase());
          } else {
            // ALL terms must be present (AND logic)
            return terms.every(term => text.includes(term));
          }
        })
        .sortBy("globalOrder"); // Keep biblical order

      self.postMessage({ 
        type: "SEARCH_RESULTS", 
        payload: { 
          items: searchResults, 
          total: searchResults.length 
        } 
      });
    } catch (err) {
      self.postMessage({ type: "ERROR", payload: err });
    }
  }
};
