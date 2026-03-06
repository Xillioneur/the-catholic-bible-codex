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

  // Fetches the entire 73-book canon for a translation in one pass
  getEntireBible: publicProcedure
    .input(z.object({ translationSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log(`[tRPC] getEntireBible: START for ${input.translationSlug}`);
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

      const where = {
        translationId: translation.id,
        text: { contains: input.query, mode: 'insensitive' as const },
        ...(input.mode === "book" && input.bookId ? { bookId: input.bookId } : {}),
        ...(input.mode === "chapter" && input.bookId && input.chapter ? { bookId: input.bookId, chapter: input.chapter } : {}),
      };

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
      const { bookSlug, chapter: rawChapter, verses } = parseCitation(input.citation);
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      const book = await ctx.db.book.findUnique({ where: { slug: bookSlug } });
      if (!translation || !book) return [];

      let chapter = rawChapter;
      if (bookSlug === "psalms" && input.translationSlug === "drb") {
        chapter = mapPsalmToVulgate(rawChapter);
      }

      const matchedVerses = await ctx.db.verse.findMany({
        where: { translationId: translation.id, bookId: book.id, chapter: chapter, verse: { in: verses } },
        select: { globalOrder: true }
      });
      return matchedVerses.map(v => v.globalOrder);
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
      const book = await ctx.db.book.findUnique({ where: { slug: input.bookSlug } });
      if (!translation || !book) return null;

      let chapter = input.chapter;
      if (input.bookSlug === "psalms" && input.translationSlug === "drb") {
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
        return fallback?.globalOrder ?? null;
      }
      return verse.globalOrder;
    }),
});
