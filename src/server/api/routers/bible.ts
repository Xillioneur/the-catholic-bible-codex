import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getLiturgicalInfoServer } from "~/server/liturgical";
import { parseCitation } from "~/lib/liturgical";

/**
 * Maps standard (Hebrew/Modern) Psalm numbering to Vulgate/DRB numbering.
 */
function mapPsalmToVulgate(chapter: number): number {
  if (chapter >= 10 && chapter <= 113) return chapter - 1;
  if (chapter === 114 || chapter === 115) return 113;
  if (chapter === 116) return 114;
  if (chapter >= 117 && chapter <= 146) return chapter - 1;
  if (chapter === 147) return 146;
  return chapter;
}

export const bibleRouter = createTRPCRouter({
  getLiturgicalInfo: publicProcedure
    .input(z.object({ date: z.date().optional().nullable() }))
    .query(async ({ input }) => {
      return await getLiturgicalInfoServer(input?.date ?? new Date());
    }),

  getVerseCount: publicProcedure
    .input(z.object({ translationSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      if (!translation) return 0;
      return ctx.db.verse.count({ where: { translationId: translation.id } });
    }),

  getEntireBible: publicProcedure
    .input(z.object({ translationSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      if (!translation) return [];
      return ctx.db.verse.findMany({
        where: { translationId: translation.id },
        orderBy: { globalOrder: "asc" },
        include: { book: true },
      });
    }),

  getVersesByOrderRange: publicProcedure
    .input(z.object({
      translationSlug: z.string(),
      startOrder: z.number(),
      endOrder: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      if (!translation) return [];
      return ctx.db.verse.findMany({
        where: { translationId: translation.id, globalOrder: { gte: input.startOrder, lte: input.endOrder } },
        orderBy: { globalOrder: "asc" },
        include: { book: true },
      });
    }),

  searchVerses: publicProcedure
    .input(z.object({
      translationSlug: z.string(),
      query: z.string().min(2),
      bookId: z.number().optional(),
      chapter: z.number().optional(),
      mode: z.enum(["global", "book", "chapter"]).default("global"),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      if (!translation) return { items: [], total: 0 };

      const where: any = {
        translationId: translation.id,
        text: { contains: input.query, mode: 'insensitive' as const },
      };

      if (input.mode === "book" && input.bookId) {
        where.bookId = input.bookId;
      } else if (input.mode === "chapter" && input.bookId && input.chapter) {
        where.bookId = input.bookId;
        where.chapter = input.chapter;
      }

      const [items, total] = await Promise.all([
        ctx.db.verse.findMany({
          where,
          take: input.limit,
          orderBy: [ { bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' } ],
          include: { book: true },
        }),
        ctx.db.verse.count({ where })
      ]);

      return { items, total };
    }),

  resolveReadingHighlight: publicProcedure
    .input(z.object({
      translationSlug: z.string(),
      citation: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { bookSlug, chapter: startChapter, verses: rawVerses } = parseCitation(input.citation);
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      const book = await ctx.db.book.findFirst({ where: { slug: { equals: bookSlug, mode: 'insensitive' } } });
      
      if (!translation || !book) return [];

      // Liturgical citations often list verses like "17-28".
      // If the verses array is just a list of numbers for a SINGLE chapter:
      let chapter = startChapter;
      if (book.slug.toLowerCase() === "psalms" && input.translationSlug === "drb") {
        chapter = mapPsalmToVulgate(startChapter);
      }

      // Handle the common case (single chapter)
      const matchedVerses = await ctx.db.verse.findMany({
        where: { 
          translationId: translation.id, 
          bookId: book.id, 
          chapter: chapter, 
          verse: { in: rawVerses } 
        },
        select: { globalOrder: true }
      });

      // If we found everything, return. 
      // If the citation spans chapters (complex), find all verses in the range.
      if (matchedVerses.length === rawVerses.length) {
        return matchedVerses.map(v => v.globalOrder);
      }

      // COMPLEX FALLBACK: If individual verse matching failed, 
      // it might be because the citation covers a range that spans chapters.
      // E.g., "17-28" where chapter ends at 20.
      const firstVerseNum = Math.min(...rawVerses);
      const lastVerseNum = Math.max(...rawVerses);

      const rangeVerses = await ctx.db.verse.findMany({
        where: {
          translationId: translation.id,
          bookId: book.id,
          chapter: { gte: chapter },
        },
        orderBy: [{ chapter: 'asc' }, { verse: 'asc' }],
        take: 100 // Safety limit for a single reading
      });

      // Filter based on the linearized sequence starting from firstVerseNum
      let collecting = false;
      const resultOrders: number[] = [];
      let versesFound = 0;

      for (const v of rangeVerses) {
        if (v.chapter === chapter && v.verse === firstVerseNum) collecting = true;
        if (collecting) {
          resultOrders.push(v.globalOrder);
          versesFound++;
          // Stop once we've collected the number of verses requested or hit the end verse if it's in the same/next chapter
          if (versesFound >= rawVerses.length) break;
        }
      }

      return resultOrders;
    }),

  getBooks: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.book.findMany({ orderBy: { order: "asc" } });
  }),

  getTranslations: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.translation.findMany({ orderBy: { slug: "asc" } });
  }),

  getVerseOrder: publicProcedure
    .input(z.object({
      translationSlug: z.string(),
      bookSlug: z.string(),
      chapter: z.number().default(1),
      verse: z.number().default(1),
    }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      const book = await ctx.db.book.findFirst({ 
        where: { slug: { equals: input.bookSlug, mode: 'insensitive' } } 
      });
      if (!translation || !book) return null;

      let chapter = input.chapter;
      if (book.slug.toLowerCase() === "psalms" && input.translationSlug === "drb") {
        chapter = mapPsalmToVulgate(input.chapter);
      }

      const verse = await ctx.db.verse.findFirst({
        where: { translationId: translation.id, bookId: book.id, chapter: chapter, verse: input.verse },
        select: { globalOrder: true },
      });

      if (!verse) {
        const fallback = await ctx.db.verse.findFirst({
          where: { translationId: translation.id, bookId: book.id, chapter: chapter },
          orderBy: { verse: "asc" },
          select: { globalOrder: true },
        });
        if (fallback) return fallback.globalOrder;
        const bookFallback = await ctx.db.verse.findFirst({
          where: { translationId: translation.id, bookId: book.id },
          orderBy: [{ chapter: "asc" }, { verse: "asc" }],
          select: { globalOrder: true }
        });
        return bookFallback?.globalOrder ?? 1;
      }
      return verse.globalOrder;
    }),

  getVerseInAllTranslations: publicProcedure
    .input(z.object({
      bookSlug: z.string(),
      chapter: z.number(),
      verse: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const translations = await ctx.db.translation.findMany();
      const book = await ctx.db.book.findFirst({ 
        where: { slug: { equals: input.bookSlug, mode: 'insensitive' } } 
      });
      
      if (!book) return [];

      const results = await Promise.all(translations.map(async (t) => {
        let chapter = input.chapter;
        if (book.slug.toLowerCase() === "psalms" && t.slug === "drb") {
          chapter = mapPsalmToVulgate(input.chapter);
        }

        const v = await ctx.db.verse.findFirst({
          where: { translationId: t.id, bookId: book.id, chapter: chapter, verse: input.verse },
          include: { translation: true }
        });
        return v;
      }));

      return results.filter(Boolean);
    }),
});
