import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const bibleRouter = createTRPCRouter({
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
