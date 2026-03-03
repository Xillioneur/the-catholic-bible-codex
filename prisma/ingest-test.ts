import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const GENESIS_1_5 = [
  { chapter: 1, verse: 1, text: "In the beginning, God created the heavens and the earth." },
  { chapter: 1, verse: 2, text: "The earth was formless and empty. Darkness was on the surface of the deep and God's Spirit was hovering over the surface of the waters." },
  { chapter: 1, verse: 3, text: "God said, \"Let there be light,\" and there was light." },
  { chapter: 1, verse: 4, text: "God saw the light, and saw that it was good. God divided the light from the darkness." },
  { chapter: 1, verse: 5, text: "God called the light \"day\", and the darkness he called \"night\". There was evening and there was morning, the first day." },
  // ... more can be added later, for now just a small sample
];

async function main() {
  const translation = await prisma.translation.findUnique({ where: { slug: "webbe" } });
  const book = await prisma.book.findUnique({ where: { slug: "genesis" } });

  if (!translation || !book) {
    console.error("Translation or Book not found. Run seed first.");
    return;
  }

  console.log("Ingesting Genesis 1:1-5...");
  let order = 1;
  for (const v of GENESIS_1_5) {
    await prisma.verse.upsert({
      where: {
        translationId_bookId_chapter_verse: {
          translationId: translation.id,
          bookId: book.id,
          chapter: v.chapter,
          verse: v.verse,
        },
      },
      update: { text: v.text, globalOrder: order },
      create: {
        translationId: translation.id,
        bookId: book.id,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        globalOrder: order++,
      },
    });
  }
  console.log("Ingestion complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
