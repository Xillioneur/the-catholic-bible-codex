import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getLiturgicalInfoServer } from "~/server/liturgical";

export const bibleRouter = createTRPCRouter({
  getLiturgicalInfo: publicProcedure
    .input(z.object({ date: z.date().optional().nullable() }))
    .query(async ({ input }) => {
      return await getLiturgicalInfoServer(input?.date ?? new Date());
    }),

  // Get total verse count for a translation
  getVerseCount: publicProcedure
    .input(z.object({ translationSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({
        where: { slug: input.translationSlug },
      });
      if (!translation) return 0;
      return ctx.db.verse.count({
        where: { translationId: translation.id },
      });
    }),

  // Fetch a specific range of verses by their globalOrder
  getVersesByOrderRange: publicProcedure
    .input(z.object({
      translationSlug: z.string(),
      startOrder: z.number(),
      endOrder: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({
        where: { slug: input.translationSlug },
      });
      if (!translation) return [];

      return ctx.db.verse.findMany({
        where: { 
          translationId: translation.id,
          globalOrder: {
            gte: input.startOrder,
            lte: input.endOrder
          }
        },
        orderBy: { globalOrder: "asc" },
        include: { book: true },
      });
    }),

  // Legacy fetcher for infinite scroll fallback
  getVerses: publicProcedure
    .input(z.object({
      translationId: z.string().optional(),
      cursor: z.number().nullish(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { cursor, limit, translationId } = input;
      console.log(`[tRPC] getVerses: trans=${translationId}, cursor=${cursor}, limit=${limit}`);

      let tId = translationId;
      if (!tId) {
        const t = await ctx.db.translation.findUnique({ where: { slug: "drb" } });
        tId = t?.id;
      }
      if (!tId) return { items: [], nextCursor: null };

      const items = await ctx.db.verse.findMany({
        take: limit + 1,
        where: {
          translationId: tId,
          ...(cursor ? { globalOrder: { gt: cursor } } : {}),
        },
        orderBy: { globalOrder: "asc" },
        include: { book: true },
      });

      let nextCursor: number | null = null;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.globalOrder;
      }

      return { items, nextCursor };
    }),

  getParallelVerses: publicProcedure
    .input(z.object({
      primaryTranslationSlug: z.string(),
      parallelTranslationSlug: z.string(),
      cursor: z.number().nullish(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;
      console.log(`[tRPC] getParallelVerses: primary=${input.primaryTranslationSlug}, parallel=${input.parallelTranslationSlug}, cursor=${cursor}`);

      const primaryT = await ctx.db.translation.findUnique({ where: { slug: input.primaryTranslationSlug } });
      const parallelT = await ctx.db.translation.findUnique({ where: { slug: input.parallelTranslationSlug } });

      if (!primaryT || !parallelT) return { items: [], nextCursor: null };

      const primaryVerses = await ctx.db.verse.findMany({
        take: limit + 1,
        where: {
          translationId: primaryT.id,
          ...(cursor ? { globalOrder: { gt: cursor } } : {}),
        },
        orderBy: { globalOrder: "asc" },
        include: { book: true },
      });

      let nextCursor: number | null = null;
      if (primaryVerses.length > limit) {
        const nextItem = primaryVerses.pop();
        nextCursor = nextItem!.globalOrder;
      }

      const items = await Promise.all(primaryVerses.map(async (pv) => {
        const parallelV = await ctx.db.verse.findFirst({
          where: {
            translationId: parallelT.id,
            bookId: pv.bookId,
            chapter: pv.chapter,
            verse: pv.verse,
          }
        });
        return {
          primary: pv,
          parallel: parallelV,
        };
      }));

      return {
        items,
        nextCursor,
      };
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
      console.log(`[tRPC] getVerseOrder: ${input.translationSlug} ${input.bookSlug} ${input.chapter}:${input.verse}`);
      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      const book = await ctx.db.book.findUnique({ where: { slug: input.bookSlug } });
      if (!translation || !book) return null;

      const verse = await ctx.db.verse.findFirst({
        where: { translationId: translation.id, bookId: book.id, chapter: input.chapter, verse: input.verse },
        select: { globalOrder: true },
      });

      if (!verse) {
        const fallback = await ctx.db.verse.findFirst({
          where: { translationId: translation.id, bookId: book.id, chapter: input.chapter },
          orderBy: { verse: "asc" },
          select: { globalOrder: true },
        });
        return fallback?.globalOrder ?? null;
      }
      return verse.globalOrder;
    }),
});
