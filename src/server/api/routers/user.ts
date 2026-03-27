import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  updateProgress: protectedProcedure
    .input(z.object({
      lastReadOrder: z.number(),
      lastReadTranslation: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          lastReadOrder: input.lastReadOrder,
          lastReadTranslation: input.lastReadTranslation,
          lastReadAt: new Date(),
        },
      });
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        lastReadOrder: true,
        lastReadTranslation: true,
        lastReadAt: true,
      },
    });
  }),

  syncHighlights: protectedProcedure
    .input(z.array(z.object({
      globalOrder: z.number(),
      translationSlug: z.string(),
      color: z.string(),
      createdAt: z.number(),
    })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      for (const h of input) {
        const verse = await ctx.db.verse.findFirst({
          where: { 
            globalOrder: h.globalOrder,
            translation: { slug: h.translationSlug }
          }
        });
        
        if (!verse) continue;

        await ctx.db.highlight.upsert({
          where: { userId_verseId: { userId, verseId: verse.id } },
          update: { color: h.color, createdAt: new Date(h.createdAt) },
          create: { userId, verseId: verse.id, color: h.color, createdAt: new Date(h.createdAt) }
        });
      }
      return { success: true };
    }),

  syncNotes: protectedProcedure
    .input(z.array(z.object({
      globalOrder: z.number(),
      translationSlug: z.string(),
      content: z.string(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      for (const n of input) {
        const verse = await ctx.db.verse.findFirst({
          where: { 
            globalOrder: n.globalOrder,
            translation: { slug: n.translationSlug }
          }
        });
        
        if (!verse) continue;

        await ctx.db.note.upsert({
          where: { userId_verseId: { userId, verseId: verse.id } },
          update: { content: n.content, updatedAt: new Date(n.updatedAt) },
          create: { 
            userId, 
            verseId: verse.id, 
            content: n.content, 
            createdAt: new Date(n.createdAt), 
            updatedAt: new Date(n.updatedAt) 
          }
        });
      }
      return { success: true };
    }),

  syncBookmarks: protectedProcedure
    .input(z.array(z.object({
      globalOrder: z.number(),
      translationSlug: z.string(),
      createdAt: z.number(),
    })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      for (const b of input) {
        const verse = await ctx.db.verse.findFirst({
          where: { 
            globalOrder: b.globalOrder,
            translation: { slug: b.translationSlug }
          }
        });
        
        if (!verse) continue;

        await ctx.db.bookmark.upsert({
          where: { userId_verseId: { userId, verseId: verse.id } },
          update: { createdAt: new Date(b.createdAt) },
          create: { userId, verseId: verse.id, createdAt: new Date(b.createdAt) }
        });
      }
      return { success: true };
    }),

  getJournal: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [notes, highlights] = await Promise.all([
      ctx.db.note.findMany({
        where: { userId },
        include: { verse: { include: { book: true } } },
        orderBy: { updatedAt: 'desc' }
      }),
      ctx.db.highlight.findMany({
        where: { userId },
        include: { verse: { include: { book: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    return { notes, highlights };
  }),

  getSyncData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [notes, highlights, bookmarks] = await Promise.all([
      ctx.db.note.findMany({ 
        where: { userId },
        include: { verse: { include: { translation: true } } }
      }),
      ctx.db.highlight.findMany({ 
        where: { userId },
        include: { verse: { include: { translation: true } } }
      }),
      ctx.db.bookmark.findMany({ 
        where: { userId },
        include: { 
          verse: { 
            include: { 
              book: true,
              translation: true
            } 
          } 
        } 
      }),
    ]);
    return { notes, highlights, bookmarks };
  }),
});
