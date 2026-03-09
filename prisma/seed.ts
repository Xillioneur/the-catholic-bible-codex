import { PrismaClient } from "../generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const CATHOLIC_BOOKS = [
  // Pentateuch
  { id: 1, name: "Genesis", slug: "genesis", abbreviation: "Gen", testament: "OT", category: "Pentateuch", order: 1 },
  { id: 2, name: "Exodus", slug: "exodus", abbreviation: "Exo", testament: "OT", category: "Pentateuch", order: 2 },
  { id: 3, name: "Leviticus", slug: "leviticus", abbreviation: "Lev", testament: "OT", category: "Pentateuch", order: 3 },
  { id: 4, name: "Numbers", slug: "numbers", abbreviation: "Num", testament: "OT", category: "Pentateuch", order: 4 },
  { id: 5, name: "Deuteronomy", slug: "deuteronomy", abbreviation: "Deu", testament: "OT", category: "Pentateuch", order: 5 },
  // History
  { id: 6, name: "Joshua", slug: "joshua", abbreviation: "Jos", testament: "OT", category: "History", order: 6 },
  { id: 7, name: "Judges", slug: "judges", abbreviation: "Jdg", testament: "OT", category: "History", order: 7 },
  { id: 8, name: "Ruth", slug: "ruth", abbreviation: "Rut", testament: "OT", category: "History", order: 8 },
  { id: 9, name: "1 Samuel", slug: "1-samuel", abbreviation: "1Sa", testament: "OT", category: "History", order: 9 },
  { id: 10, name: "2 Samuel", slug: "2-samuel", abbreviation: "2Sa", testament: "OT", category: "History", order: 10 },
  { id: 11, name: "1 Kings", slug: "1-kings", abbreviation: "1Ki", testament: "OT", category: "History", order: 11 },
  { id: 12, name: "2 Kings", slug: "2-kings", abbreviation: "2Ki", testament: "OT", category: "History", order: 12 },
  { id: 13, name: "1 Chronicles", slug: "1-chronicles", abbreviation: "1Ch", testament: "OT", category: "History", order: 13 },
  { id: 14, name: "2 Chronicles", slug: "2-chronicles", abbreviation: "2Ch", testament: "OT", category: "History", order: 14 },
  { id: 15, name: "Ezra", slug: "ezra", abbreviation: "Ezr", testament: "OT", category: "History", order: 15 },
  { id: 16, name: "Nehemiah", slug: "nehemiah", abbreviation: "Neh", testament: "OT", category: "History", order: 16 },
  { id: 17, name: "Tobit", slug: "tobit", abbreviation: "Tob", testament: "OT", category: "History", order: 17 },
  { id: 18, name: "Judith", slug: "judith", abbreviation: "Jdt", testament: "OT", category: "History", order: 18 },
  { id: 19, name: "Esther", slug: "esther", abbreviation: "Est", testament: "OT", category: "History", order: 19 },
  { id: 20, name: "1 Maccabees", slug: "1-maccabees", abbreviation: "1Ma", testament: "OT", category: "History", order: 20 },
  { id: 21, name: "2 Maccabees", slug: "2-maccabees", abbreviation: "2Ma", testament: "OT", category: "History", order: 21 },
  // Wisdom
  { id: 22, name: "Job", slug: "job", abbreviation: "Job", testament: "OT", category: "Wisdom", order: 22 },
  { id: 23, name: "Psalms", slug: "psalms", abbreviation: "Psa", testament: "OT", category: "Wisdom", order: 23 },
  { id: 24, name: "Proverbs", slug: "proverbs", abbreviation: "Pro", testament: "OT", category: "Wisdom", order: 24 },
  { id: 25, name: "Ecclesiastes", slug: "ecclesiastes", abbreviation: "Ecc", testament: "OT", category: "Wisdom", order: 25 },
  { id: 26, name: "Song of Solomon", slug: "song-of-solomon", abbreviation: "Sos", testament: "OT", category: "Wisdom", order: 26 },
  { id: 27, name: "Wisdom", slug: "wisdom", abbreviation: "Wis", testament: "OT", category: "Wisdom", order: 27 },
  { id: 28, name: "Sirach", slug: "sirach", abbreviation: "Sir", testament: "OT", category: "Wisdom", order: 28 },
  // Prophets
  { id: 29, name: "Isaiah", slug: "isaiah", abbreviation: "Isa", testament: "OT", category: "Prophets", order: 29 },
  { id: 30, name: "Jeremiah", slug: "jeremiah", abbreviation: "Jer", testament: "OT", category: "Prophets", order: 30 },
  { id: 31, name: "Lamentations", slug: "lamentations", abbreviation: "Lam", testament: "OT", category: "Prophets", order: 31 },
  { id: 32, name: "Baruch", slug: "baruch", abbreviation: "Bar", testament: "OT", category: "Prophets", order: 32 },
  { id: 33, name: "Ezekiel", slug: "ezekiel", abbreviation: "Eze", testament: "OT", category: "Prophets", order: 33 },
  { id: 34, name: "Daniel", slug: "daniel", abbreviation: "Dan", testament: "OT", category: "Prophets", order: 34 },
  { id: 35, name: "Hosea", slug: "hosea", abbreviation: "Hos", testament: "OT", category: "Prophets", order: 35 },
  { id: 36, name: "Joel", slug: "joel", abbreviation: "Joe", testament: "OT", category: "Prophets", order: 36 },
  { id: 37, name: "Amos", slug: "amos", abbreviation: "Amo", testament: "OT", category: "Prophets", order: 37 },
  { id: 38, name: "Obadiah", slug: "obadiah", abbreviation: "Oba", testament: "OT", category: "Prophets", order: 38 },
  { id: 39, name: "Jonah", slug: "jonah", abbreviation: "Jon", testament: "OT", category: "Prophets", order: 39 },
  { id: 40, name: "Micah", slug: "micah", abbreviation: "Mic", testament: "OT", category: "Prophets", order: 40 },
  { id: 41, name: "Nahum", slug: "nahum", abbreviation: "Nah", testament: "OT", category: "Prophets", order: 41 },
  { id: 42, name: "Habakkuk", slug: "habakkuk", abbreviation: "Hab", testament: "OT", category: "Prophets", order: 42 },
  { id: 43, name: "Zephaniah", slug: "zephaniah", abbreviation: "Zep", testament: "OT", category: "Prophets", order: 43 },
  { id: 44, name: "Haggai", slug: "haggai", abbreviation: "Hag", testament: "OT", category: "Prophets", order: 44 },
  { id: 45, name: "Zechariah", slug: "zechariah", abbreviation: "Zec", testament: "OT", category: "Prophets", order: 45 },
  { id: 46, name: "Malachi", slug: "malachi", abbreviation: "Mal", testament: "OT", category: "Prophets", order: 46 },
  // Gospels
  { id: 47, name: "Matthew", slug: "matthew", abbreviation: "Mat", testament: "NT", category: "Gospels", order: 47 },
  { id: 48, name: "Mark", slug: "mark", abbreviation: "Mar", testament: "NT", category: "Gospels", order: 48 },
  { id: 49, name: "Luke", slug: "luke", abbreviation: "Luk", testament: "NT", category: "Gospels", order: 49 },
  { id: 50, name: "John", slug: "john", abbreviation: "Joh", testament: "NT", category: "Gospels", order: 50 },
  // Acts
  { id: 51, name: "Acts", slug: "acts", abbreviation: "Act", testament: "NT", category: "Acts", order: 51 },
  // Epistles
  { id: 52, name: "Romans", slug: "romans", abbreviation: "Rom", testament: "NT", category: "Epistles", order: 52 },
  { id: 53, name: "1 Corinthians", slug: "1-corinthians", abbreviation: "1Co", testament: "NT", category: "Epistles", order: 53 },
  { id: 54, name: "2 Corinthians", slug: "2-corinthians", abbreviation: "2Co", testament: "NT", category: "Epistles", order: 54 },
  { id: 55, name: "Galatians", slug: "galatians", abbreviation: "Gal", testament: "NT", category: "Epistles", order: 55 },
  { id: 56, name: "Ephesians", slug: "ephesians", abbreviation: "Eph", testament: "NT", category: "Epistles", order: 56 },
  { id: 57, name: "Philippians", slug: "philippians", abbreviation: "Phi", testament: "NT", category: "Epistles", order: 57 },
  { id: 58, name: "Colossians", slug: "colossians", abbreviation: "Col", testament: "NT", category: "Epistles", order: 58 },
  { id: 59, name: "1 Thessalonians", slug: "1-thessalonians", abbreviation: "1Th", testament: "NT", category: "Epistles", order: 59 },
  { id: 60, name: "2 Thessalonians", slug: "2-thessalonians", abbreviation: "2Th", testament: "NT", category: "Epistles", order: 60 },
  { id: 61, name: "1 Timothy", slug: "1-timothy", abbreviation: "1Ti", testament: "NT", category: "Epistles", order: 61 },
  { id: 62, name: "2 Timothy", slug: "2-timothy", abbreviation: "2Ti", testament: "NT", category: "Epistles", order: 62 },
  { id: 63, name: "Titus", slug: "titus", abbreviation: "Tit", testament: "NT", category: "Epistles", order: 63 },
  { id: 64, name: "Philemon", slug: "philemon", abbreviation: "Phm", testament: "NT", category: "Epistles", order: 64 },
  { id: 65, name: "Hebrews", slug: "hebrews", abbreviation: "Heb", testament: "NT", category: "Epistles", order: 65 },
  { id: 66, name: "James", slug: "james", abbreviation: "Jam", testament: "NT", category: "Epistles", order: 66 },
  { id: 67, name: "1 Peter", slug: "1-peter", abbreviation: "1Pe", testament: "NT", category: "Epistles", order: 67 },
  { id: 68, name: "2 Peter", slug: "2-peter", abbreviation: "2Pe", testament: "NT", category: "Epistles", order: 68 },
  { id: 69, name: "1 John", slug: "1-john", abbreviation: "1Jo", testament: "NT", category: "Epistles", order: 69 },
  { id: 70, name: "2 John", slug: "2-john", abbreviation: "2Jo", testament: "NT", category: "Epistles", order: 70 },
  { id: 71, name: "3 John", slug: "3-john", abbreviation: "3Jo", testament: "NT", category: "Epistles", order: 71 },
  { id: 72, name: "Jude", slug: "jude", abbreviation: "Jud", testament: "NT", category: "Epistles", order: 72 },
  // Revelation
  { id: 73, name: "Revelation", slug: "revelation", abbreviation: "Rev", testament: "NT", category: "Revelation", order: 73 },
];

const TRANSLATIONS = [
  { slug: "webbe", name: "World English Bible (Catholic Edition)", abbreviation: "WEB-CE", language: "en", isPublic: true },
  { slug: "drb", name: "Douay-Rheims Bible", abbreviation: "DRB", language: "en", isPublic: true },
  { slug: "vul", name: "Clementine Vulgate", abbreviation: "VUL", language: "la", isPublic: true },
];

async function main() {
  console.log("Seeding Catholic Books...");
  for (const book of CATHOLIC_BOOKS) {
    await prisma.book.upsert({
      where: { id: book.id },
      update: book,
      create: book,
    });
  }

  console.log("Seeding Translations...");
  const translationMap: Record<string, string> = {};
  for (const translation of TRANSLATIONS) {
    const t = await prisma.translation.upsert({
      where: { slug: translation.slug },
      update: translation,
      create: translation,
    });
    translationMap[translation.slug] = t.id;
  }

  const seedFiles = [
    { slug: "webbe", file: "webbe.json" },
    { slug: "drb", file: "drb.json" },
  ];

  for (const { slug, file } of seedFiles) {
    const filePath = path.join(process.cwd(), "public", "data", file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Seed file ${file} not found. Skipping...`);
      continue;
    }

    const count = await prisma.verse.count({
      where: { translationId: translationMap[slug] },
    });

    if (count > 0) {
      console.log(`Verses for ${slug} already seeded. Skipping...`);
      continue;
    }

    console.log(`Seeding verses for ${slug} from ${file}...`);
    const rawData = fs.readFileSync(filePath, "utf-8");
    const verses = JSON.parse(rawData);

    // Batch insert to avoid memory issues or DB limits
    const BATCH_SIZE = 1000;
    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE).map((v: any) => ({
        translationId: translationMap[slug]!,
        bookId: v.bookId,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        globalOrder: v.globalOrder,
      }));

      await prisma.verse.createMany({
        data: batch,
        skipDuplicates: true,
      });
      console.log(`Inserted ${i + batch.length}/${verses.length} verses for ${slug}`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
