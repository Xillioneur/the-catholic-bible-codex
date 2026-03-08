
import { parseCitation } from "../lib/liturgical.js";

const citations = [
  "Gen 37:3-4, 12-13a, 17b-28a",
  "Matt 21:33-43, 45-46",
  "Ps 105:16-17, 18-19, 20-21"
];

for (const citation of citations) {
  const result = parseCitation(citation);
  console.log(`Citation: ${citation}`);
  console.log(`Parsed: ${result.bookSlug} ${result.chapter}:${result.verses.join(',')}`);
  console.log('---');
}
