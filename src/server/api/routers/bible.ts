import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import { getLiturgicalInfoServer } from "~/server/liturgical";

export const bibleRouter = createTRPCRouter({
  getLiturgicalInfo: publicProcedure
    .input(z.object({ date: z.date().optional() }))
    .query(async ({ input }) => {
      return await getLiturgicalInfoServer(input.date);
    }),

  getVerses: publicProcedure
    .input(
      z.object({
        translationId: z.string().optional(),
        bookId: z.number().optional(),
        chapter: z.number().optional(),
        cursor: z.number().nullish(), // globalOrder cursor for infinite scroll
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, translationId } = input;

      // Default to WEBBE if not provided
      let tId = translationId;
      if (!tId) {
        const translation = await ctx.db.translation.findUnique({
          where: { slug: "webbe" },
        });
        tId = translation?.id;
      }

      if (!tId) return { items: [], nextCursor: null };

      const items = await ctx.db.verse.findMany({
        take: limit + 1,
        where: {
          translationId: tId,
          ...(cursor ? { globalOrder: { gt: cursor } } : {}),
          ...(input.bookId ? { bookId: input.bookId } : {}),
          ...(input.chapter ? { chapter: input.chapter } : {}),
        },
        orderBy: { globalOrder: "asc" },
        include: { book: true },
      });

      let nextCursor: typeof cursor | null = null;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.globalOrder;
      }

      return {
        items,
        nextCursor,
      };
    }),

  getBooks: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.book.findMany({
      orderBy: { order: "asc" },
    });
  }),

  getTranslations: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.translation.findMany({
      orderBy: { slug: "asc" },
    });
  }),

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

  getVersesByIndex: publicProcedure
    .input(z.object({
      translationSlug: z.string(),
      startIndex: z.number(), // 0-based index
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({
        where: { slug: input.translationSlug },
      });
      if (!translation) return [];

      return ctx.db.verse.findMany({
        where: { translationId: translation.id },
        orderBy: { globalOrder: "asc" },
        skip: input.startIndex,
        take: input.limit,
        include: { book: true },
      });
    }),

  getParallelVerses: publicProcedure
    .input(z.object({
      primaryTranslationSlug: z.string(),
      parallelTranslationSlug: z.string(),
      cursor: z.number().nullish(), // globalOrder of primary
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const primaryT = await ctx.db.translation.findUnique({ where: { slug: input.primaryTranslationSlug } });
      const parallelT = await ctx.db.translation.findUnique({ where: { slug: input.parallelTranslationSlug } });

      if (!primaryT || !parallelT) return { items: [], nextCursor: null };

      const primaryVerses = await ctx.db.verse.findMany({
        take: input.limit + 1,
        where: {
          translationId: primaryT.id,
          ...(input.cursor ? { globalOrder: { gt: input.cursor } } : {}),
        },
        orderBy: { globalOrder: "asc" },
        include: { book: true },
      });

      let nextCursor: number | null = null;
      if (primaryVerses.length > input.limit) {
        const nextItem = primaryVerses.pop();
        nextCursor = nextItem!.globalOrder;
      }

      // Fetch parallel verses based on book/chapter/verse of primary
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

  getVerseOrder: publicProcedure
    .input(z.object({
      translationSlug: z.string(),
      bookSlug: z.string(),
      chapter: z.number().default(1),
      verse: z.number().default(1),
    }))
    .query(async ({ ctx, input }) => {
      const translation = await ctx.db.translation.findUnique({
        where: { slug: input.translationSlug },
      });
      const book = await ctx.db.book.findUnique({
        where: { slug: input.bookSlug },
      });

      if (!translation || !book) return null;

      const verse = await ctx.db.verse.findFirst({
        where: {
          translationId: translation.id,
          bookId: book.id,
          chapter: input.chapter,
          verse: input.verse,
        },
        select: { globalOrder: true },
      });

      return verse?.globalOrder ?? null;
    }),
});
