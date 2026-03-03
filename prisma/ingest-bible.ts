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
  "Canticles": "song-of-solomon",
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

async function main() {
  const url = "https://raw.githubusercontent.com/xxruyle/Bible-DouayRheims/master/EntireBible-DR.json";
  console.log("Fetching entire Douay-Rheims Bible...");
  const response = await axios.get(url);
  const entireBible = response.data;

  const translation = await prisma.translation.findUnique({ where: { slug: "drb" } });
  if (!translation) {
    console.error("Translation 'drb' not found.");
    return;
  }

  const allBooks = await prisma.book.findMany();
  const bookMap = new Map(allBooks.map(b => [b.slug, b.id]));

  console.log("Starting ingestion of all 73 books...");
  let globalOrder = 1;

  for (const drBookName in entireBible) {
    const slug = DR_BOOK_MAPPING[drBookName];
    if (!slug) {
      console.warn(`No mapping for: ${drBookName}`);
      continue;
    }

    const bookId = bookMap.get(slug);
    if (!bookId) {
      console.error(`Book ID not found for slug: ${slug}`);
      continue;
    }

    console.log(`Ingesting ${drBookName}...`);
    const bookData = entireBible[drBookName];
    
    for (const chapterNum in bookData) {
      const chapterData = bookData[chapterNum];
      for (const verseNum in chapterData) {
        const text = chapterData[verseNum];
        await prisma.verse.upsert({
          where: {
            translationId_bookId_chapter_verse: {
              translationId: translation.id,
              bookId,
              chapter: parseInt(chapterNum),
              verse: parseInt(verseNum),
            },
          },
          update: { text, globalOrder },
          create: {
            translationId: translation.id,
            bookId,
            chapter: parseInt(chapterNum),
            verse: parseInt(verseNum),
            text,
            globalOrder,
          },
        });
        globalOrder++;
      }
    }
  }

  console.log("Full Bible ingestion complete.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
