import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const translations = await prisma.translation.findMany();
  
  for (const t of translations) {
    console.log(`Re-indexing ${t.slug}...`);
    
    // Fetch all verses in biblical order (Book order then Chapter then Verse)
    const verses = await prisma.verse.findMany({
      where: { translationId: t.id },
      orderBy: [
        { bookId: 'asc' },
        { chapter: 'asc' },
        { verse: 'asc' }
      ],
      select: { id: true }
    });

    console.log(`Found ${verses.length} verses. Updating globalOrder...`);

    // Use a transaction for atomic update if possible, 
    // but for large sets we'll batch to avoid timeouts.
    const BATCH_SIZE = 1000;
    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((v, index) => 
          prisma.verse.update({
            where: { id: v.id },
            data: { globalOrder: i + index + 1 }
          })
        )
      );
      console.log(`Processed ${Math.min(i + BATCH_SIZE, verses.length)}/${verses.length}`);
    }
  }

  console.log("Re-indexing complete.");
}

main().finally(() => prisma.$disconnect());
