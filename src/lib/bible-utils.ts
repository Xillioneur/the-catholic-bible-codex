/**
 * Generates the URL for the Catechism of the Catholic Church for a given verse.
 * Note: Precise paragraph mapping for every verse is complex, so we often link to 
 * the index or a search based on the biblical reference.
 */
export function getCatechismUrl(bookName: string, chapter: number, verse?: number): string {
  const query = encodeURIComponent(`${bookName} ${chapter}${verse ? ':' + verse : ''}`);
  // Using a common public reference for CCC search
  return `https://www.vatican.va/archive/ENG0015/_INDEX.HTM`; 
  // More realistically, we might link to a known search aggregator
  // or a specific paragraph if we had the mapping.
}

/**
 * Generates the URL for Catena Aurea (Patristic Commentary by St. Thomas Aquinas)
 */
export function getCatenaAureaUrl(bookName: string, chapter: number): string {
  // Catena Aurea only covers the Gospels (Matthew, Mark, Luke, John)
  const gospels = ["Matthew", "Mark", "Luke", "John"];
  if (!gospels.includes(bookName)) return "";
  
  const bookSlug = bookName.toLowerCase();
  // Using a public site that hosts Catena Aurea (e.g., dhspriority.com or similar)
  return `https://www.ecatholic2000.com/catena/ca${chapter}.shtml`; // Example format
}

/**
 * Generates a link to the New Advent Bible commentary or similar public domain source
 */
export function getPatristicCommentaryUrl(bookName: string, chapter: number): string {
  const bookSlug = bookName.toLowerCase().replace(/\s+/g, '-');
  return `https://www.newadvent.org/bible/${bookSlug}${chapter.toString().padStart(3, '0')}.htm`;
}
