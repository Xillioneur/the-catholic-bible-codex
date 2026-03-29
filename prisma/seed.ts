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

  console.log("Seeding Reading Plans...");
  const plans = [
    {
      slug: "canonical-73",
      name: "The Full Catholic Canon",
      description: "Read the entire 73-book Catholic Bible from Genesis to Revelation.",
      totalDays: 365,
      category: "Full Bible"
    },
    {
      slug: "gospels-40",
      name: "Gospels in 40 Days",
      description: "Immerse yourself in the life of Christ through the four Gospels.",
      totalDays: 40,
      category: "Gospels"
    }
  ];

  for (const plan of plans) {
    const p = await prisma.readingPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });

    // Seed all 40 days for Gospels in 40 Days
    if (plan.slug === "gospels-40") {
      const gospelsDays = [
        { dayNumber: 1, title: "Matthew 1-2", references: ["Matthew 1", "Matthew 2"] },
        { dayNumber: 2, title: "Matthew 3-4", references: ["Matthew 3", "Matthew 4"] },
        { dayNumber: 3, title: "Matthew 5", references: ["Matthew 5"] },
        { dayNumber: 4, title: "Matthew 6", references: ["Matthew 6"] },
        { dayNumber: 5, title: "Matthew 7", references: ["Matthew 7"] },
        { dayNumber: 6, title: "Matthew 8-9", references: ["Matthew 8", "Matthew 9"] },
        { dayNumber: 7, title: "Matthew 10-11", references: ["Matthew 10", "Matthew 11"] },
        { dayNumber: 8, title: "Matthew 12", references: ["Matthew 12"] },
        { dayNumber: 9, title: "Matthew 13", references: ["Matthew 13"] },
        { dayNumber: 10, title: "Matthew 14-15", references: ["Matthew 14", "Matthew 15"] },
        { dayNumber: 11, title: "Matthew 16-17", references: ["Matthew 16", "Matthew 17"] },
        { dayNumber: 12, title: "Matthew 18-19", references: ["Matthew 18", "Matthew 19"] },
        { dayNumber: 13, title: "Matthew 20-21", references: ["Matthew 20", "Matthew 21"] },
        { dayNumber: 14, title: "Matthew 22-23", references: ["Matthew 22", "Matthew 23"] },
        { dayNumber: 15, title: "Matthew 24-25", references: ["Matthew 24", "Matthew 25"] },
        { dayNumber: 16, title: "Matthew 26", references: ["Matthew 26"] },
        { dayNumber: 17, title: "Matthew 27-28", references: ["Matthew 27", "Matthew 28"] },
        { dayNumber: 18, title: "Mark 1-2", references: ["Mark 1", "Mark 2"] },
        { dayNumber: 19, title: "Mark 3-4", references: ["Mark 3", "Mark 4"] },
        { dayNumber: 20, title: "Mark 5-6", references: ["Mark 5", "Mark 6"] },
        { dayNumber: 21, title: "Mark 7-8", references: ["Mark 7", "Mark 8"] },
        { dayNumber: 22, title: "Mark 9-10", references: ["Mark 9", "Mark 10"] },
        { dayNumber: 23, title: "Mark 11-12", references: ["Mark 11", "Mark 12"] },
        { dayNumber: 24, title: "Mark 13-14", references: ["Mark 13", "Mark 14"] },
        { dayNumber: 25, title: "Mark 15-16", references: ["Mark 15", "Mark 16"] },
        { dayNumber: 26, title: "Luke 1", references: ["Luke 1"] },
        { dayNumber: 27, title: "Luke 2-3", references: ["Luke 2", "Luke 3"] },
        { dayNumber: 28, title: "Luke 4-5", references: ["Luke 4", "Luke 5"] },
        { dayNumber: 29, title: "Luke 6-7", references: ["Luke 6", "Luke 7"] },
        { dayNumber: 30, title: "Luke 8-9", references: ["Luke 8", "Luke 9"] },
        { dayNumber: 31, title: "Luke 10-11", references: ["Luke 10", "Luke 11"] },
        { dayNumber: 32, title: "Luke 12-13", references: ["Luke 12", "Luke 13"] },
        { dayNumber: 33, title: "Luke 14-16", references: ["Luke 14", "Luke 15", "Luke 16"] },
        { dayNumber: 34, title: "Luke 17-18", references: ["Luke 17", "Luke 18"] },
        { dayNumber: 35, title: "Luke 19-20", references: ["Luke 19", "Luke 20"] },
        { dayNumber: 36, title: "Luke 21-22", references: ["Luke 21", "Luke 22"] },
        { dayNumber: 37, title: "Luke 23-24", references: ["Luke 23", "Luke 24"] },
        { dayNumber: 38, title: "John 1-3", references: ["John 1", "John 2", "John 3"] },
        { dayNumber: 39, title: "John 4-6", references: ["John 4", "John 5", "John 6"] },
        { dayNumber: 40, title: "John 7-21", references: ["John 7", "John 8", "John 9", "John 10", "John 11", "John 12", "John 13", "John 14", "John 15", "John 16", "John 17", "John 18", "John 19", "John 20", "John 21"] },
      ];

      for (const day of gospelsDays) {
        await prisma.readingPlanDay.upsert({
          where: { planId_dayNumber: { planId: p.id, dayNumber: day.dayNumber } },
          update: day,
          create: { ...day, planId: p.id },
        });
      }
    }

    if (plan.slug === "canonical-73") {
      const bookChapters: Record<string, number> = {
        "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
        "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
        "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
        "Ezra": 10, "Nehemiah": 13, "Tobit": 14, "Judith": 16, "Esther": 10,
        "1 Maccabees": 16, "2 Maccabees": 15, "Job": 42, "Psalms": 150, "Proverbs": 31,
        "Ecclesiastes": 12, "Song of Solomon": 8, "Wisdom": 19, "Sirach": 51,
        "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5, "Baruch": 6, "Ezekiel": 48,
        "Daniel": 14, "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4,
        "Micah": 7, "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2,
        "Zechariah": 14, "Malachi": 4, "Matthew": 28, "Mark": 16, "Luke": 24,
        "John": 21, "Acts": 28, "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13,
        "Galatians": 6, "Ephesians": 6, "Philippians": 4, "Colossians": 4,
        "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4,
        "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5, "1 Peter": 5,
        "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22
      };

      const allChapters: string[] = [];
      for (const book of CATHOLIC_BOOKS) {
        const count = bookChapters[book.name] || 1;
        for (let ch = 1; ch <= count; ch++) {
          allChapters.push(`${book.name} ${ch}`);
        }
      }

      // Distribute ~1330 chapters into 365 days (~3.6 chapters per day)
      const chaptersPerDay = allChapters.length / 365;
      
      for (let dayIdx = 0; dayIdx < 365; dayIdx++) {
        const dayNumber = dayIdx + 1;
        const start = Math.floor(dayIdx * chaptersPerDay);
        const end = Math.floor((dayIdx + 1) * chaptersPerDay);
        const refs = allChapters.slice(start, end);
        
        if (refs.length > 0) {
          await prisma.readingPlanDay.upsert({
            where: { planId_dayNumber: { planId: p.id, dayNumber } },
            update: {
              title: `${refs[0]} - ${refs[refs.length - 1]}`,
              references: refs
            },
            create: {
              planId: p.id,
              dayNumber,
              title: `${refs[0]} - ${refs[refs.length - 1]}`,
              references: refs
            },
          });
        }
      }
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
