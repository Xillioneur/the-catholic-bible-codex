
import { PrismaClient } from "../../generated/prisma/index.js";
const prisma = new PrismaClient();

async function main() {
  const translation = await prisma.translation.findUnique({ where: { slug: "drb" } });
  const book = await prisma.book.findUnique({ where: { slug: "genesis" } });
  
  if (!translation || !book) {
    console.log("Missing translation or book");
    return;
  }

  const verses = await prisma.verse.findMany({
    where: { translationId: translation.id, bookId: book.id, chapter: 37 },
    select: { verse: true, globalOrder: true },
    orderBy: { verse: "asc" }
  });

  console.log(JSON.stringify(verses, null, 2));
}

main().finally(() => prisma.$disconnect());
