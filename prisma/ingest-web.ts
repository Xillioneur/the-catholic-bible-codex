import { PrismaClient } from "../generated/prisma";
import axios from "axios";

const prisma = new PrismaClient();

const WEB_BOOKS = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth",
  "1-samuel", "2-samuel", "1-kings", "2-kings", "1-chronicles", "2-chronicles", "ezra", "nehemiah",
  "tobit", "judith", "esther", "1-maccabees", "2-maccabees", "job", "psalms", "proverbs", "ecclesiastes",
  "song-of-solomon", "wisdom", "sirach", "isaiah", "jeremiah", "lamentations", "baruch", "ezekiel", "daniel",
  "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi",
  "matthew", "mark", "luke", "john", "acts", "romans", "1-corinthians", "2-corinthians", "galatians", "ephesians",
  "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy", "titus", "philemon",
  "hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude", "revelation"
];

async function ingestWebBook(bookSlug: string, translationId: string, startOrder: number) {
  const url = `https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/${bookSlug}.json`;
  console.log(`Fetching WEB ${bookSlug}...`);
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    const book = await prisma.book.findUnique({ where: { slug: bookSlug } });
    if (!book) {
      console.error(`Book ${bookSlug} not found in DB.`);
      return startOrder;
    }

    let order = startOrder;
    const verseMap = new Map<string, string>();

    for (const item of data) {
      if (["paragraph text", "stanza text", "line text"].includes(item.type)) {
        const key = `${item.chapterNumber}:${item.verseNumber}`;
        const existing = verseMap.get(key) ?? "";
        verseMap.set(key, existing + item.value);
      }
    }

    console.log(`Ingesting ${bookSlug} verses...`);
    for (const [key, text] of verseMap.entries()) {
      const [chapter, verse] = key.split(":").map(Number);
      await prisma.verse.upsert({
        where: {
          translationId_bookId_chapter_verse: {
            translationId,
            bookId: book.id,
            chapter: chapter!,
            verse: verse!,
          }
        },
        update: { text: text.trim(), globalOrder: order },
        create: {
          translationId,
          bookId: book.id,
          chapter: chapter!,
          verse: verse!,
          text: text.trim(),
          globalOrder: order,
        }
      });
      order++;
    }
    return order;
  } catch (error) {
    console.error(`Failed ${bookSlug}`);
    return startOrder;
  }
}

async function main() {
  const translation = await prisma.translation.findUnique({ where: { slug: "webbe" } });
  if (!translation) return;

  let currentOrder = 1;
  for (const slug of WEB_BOOKS) {
    currentOrder = await ingestWebBook(slug, translation.id, currentOrder);
  }
  console.log("WEB Ingestion complete.");
}

main().finally(() => prisma.$disconnect());
