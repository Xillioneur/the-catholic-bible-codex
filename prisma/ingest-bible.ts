import { PrismaClient } from "../generated/prisma";
import axios from "axios";

const prisma = new PrismaClient();

const DR_BOOK_MAPPING: Record<string, string> = {
  "Genesis": "genesis",
  "Exodus": "exodus",
  "Leviticus": "leviticus",
  "Numbers": "numbers",
  "Deuteronomy": "deuteronomy",
  "Josue": "joshua",
  "Judges": "judges",
  "Ruth": "ruth",
  "1 Kings": "1-samuel",
  "2 Kings": "2-samuel",
  "3 Kings": "1-kings",
  "4 Kings": "2-kings",
  "1 Paralipomenon": "1-chronicles",
  "2 Paralipomenon": "2-chronicles",
  "1 Esdras": "ezra",
  "2 Esdras": "nehemiah",
  "Tobias": "tobit",
  "Judith": "judith",
  "Esther": "esther",
  "Job": "job",
  "Psalms": "psalms",
  "Proverbs": "proverbs",
  "Ecclesiastes": "ecclesiastes",
  "Canticle of Canticles": "song-of-solomon",
  "Wisdom": "wisdom",
  "Ecclesiasticus": "sirach",
  "Isaias": "isaiah",
  "Jeremias": "jeremiah",
  "Lamentations": "lamentations",
  "Baruch": "baruch",
  "Ezechiel": "ezekiel",
  "Daniel": "daniel",
  "Osee": "hosea",
  "Joel": "joel",
  "Amos": "amos",
  "Abdias": "obadiah",
  "Jonas": "jonah",
  "Micheas": "micah",
  "Nahum": "nahum",
  "Habacuc": "habakkuk",
  "Sophonias": "zephaniah",
  "Aggeus": "haggai",
  "Zacharias": "zechariah",
  "Malachias": "malachi",
  "1 Machabees": "1-maccabees",
  "2 Machabees": "2-maccabees",
  "Matthew": "matthew",
  "Mark": "mark",
  "Luke": "luke",
  "John": "john",
  "Acts": "acts",
  "Romans": "romans",
  "1 Corinthians": "1-corinthians",
  "2 Corinthians": "2-corinthians",
  "Galatians": "galatians",
  "Ephesians": "ephesians",
  "Philippians": "philippians",
  "Colossians": "colossians",
  "1 Thessalonians": "1-thessalonians",
  "2 Thessalonians": "2-thessalonians",
  "1 Timothy": "1-timothy",
  "2 Timothy": "2-timothy",
  "Titus": "titus",
  "Philemon": "philemon",
  "Hebrews": "hebrews",
  "James": "james",
  "1 Peter": "1-peter",
  "2 Peter": "2-peter",
  "1 John": "1-john",
  "2 John": "2-john",
  "3 John": "3-john",
  "Jude": "jude",
  "Apocalypse": "revelation",
};

async function ingestBook(drBookName: string, translationSlug: string, startOrder: number) {
  const slug = DR_BOOK_MAPPING[drBookName];
  if (!slug) {
    console.error(`No mapping for DR book: ${drBookName}`);
    return startOrder;
  }

  const url = `https://raw.githubusercontent.com/xxruyle/Bible-DouayRheims/master/Douay-Rheims/${encodeURIComponent(drBookName)}.json`;
  
  try {
    const response = await axios.get(url);
    const data = response.data; // Object: { "chapter": { "verse": "text" } }
    
    const translation = await prisma.translation.findUnique({ where: { slug: translationSlug } });
    const book = await prisma.book.findUnique({ where: { slug } });

    if (!translation || !book) {
      console.error(`Translation (${translationSlug}) or Book (${slug}) not found.`);
      return startOrder;
    }

    console.log(`Ingesting ${drBookName} (${slug})...`);
    let order = startOrder;
    
    for (const chapterNum in data) {
      const verses = data[chapterNum];
      for (const verseNum in verses) {
        const text = verses[verseNum];
        await prisma.verse.upsert({
          where: {
            translationId_bookId_chapter_verse: {
              translationId: translation.id,
              bookId: book.id,
              chapter: parseInt(chapterNum),
              verse: parseInt(verseNum),
            },
          },
          update: { text, globalOrder: order },
          create: {
            translationId: translation.id,
            bookId: book.id,
            chapter: parseInt(chapterNum),
            verse: parseInt(verseNum),
            text,
            globalOrder: order,
          },
        });
        order++;
      }
    }
    
    console.log(`Finished ${drBookName}. Next order start: ${order}`);
    return order;
  } catch (error) {
    console.error(`Failed to ingest ${drBookName}:`, error);
    return startOrder;
  }
}

async function main() {
  const booksToIngest = Object.keys(DR_BOOK_MAPPING);
  let currentOrder = 1;

  console.log("Starting full 73-book Catholic Bible (Douay-Rheims) ingestion...");
  
  for (const bookName of booksToIngest) {
    currentOrder = await ingestBook(bookName, "drb", currentOrder);
  }

  console.log("Full Bible ingestion complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
