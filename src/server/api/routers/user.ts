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
      verseId: z.string(),
      color: z.string(),
      createdAt: z.number(),
    })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const verseIds: string[] = [];
      for (const h of input) {
        const verse = await ctx.db.verse.findUnique({
          where: { id: h.verseId }
        });
        
        if (!verse) continue;
        verseIds.push(verse.id);

        await ctx.db.highlight.upsert({
          where: { userId_verseId: { userId, verseId: verse.id } },
          update: { color: h.color, createdAt: new Date(h.createdAt) },
          create: { userId, verseId: verse.id, color: h.color, createdAt: new Date(h.createdAt) }
        });
      }

      // Reconciliation: Remove any highlights for this user that were NOT in the sync payload
      await ctx.db.highlight.deleteMany({
        where: {
          userId,
          verseId: { notIn: verseIds }
        }
      });

      return { success: true };
    }),

  syncNotes: protectedProcedure
    .input(z.array(z.object({
      verseId: z.string(),
      content: z.string(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const verseIds: string[] = [];
      for (const n of input) {
        const verse = await ctx.db.verse.findUnique({
          where: { id: n.verseId }
        });
        
        if (!verse) continue;
        verseIds.push(verse.id);

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

      // Reconciliation
      await ctx.db.note.deleteMany({
        where: {
          userId,
          verseId: { notIn: verseIds }
        }
      });

      return { success: true };
    }),

  syncBookmarks: protectedProcedure
    .input(z.array(z.object({
      verseId: z.string(),
      createdAt: z.number(),
    })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const verseIds: string[] = [];
      for (const b of input) {
        const verse = await ctx.db.verse.findUnique({
          where: { id: b.verseId }
        });
        
        if (!verse) continue;
        verseIds.push(verse.id);

        await ctx.db.bookmark.upsert({
          where: { userId_verseId: { userId, verseId: verse.id } },
          update: { createdAt: new Date(b.createdAt) },
          create: { userId, verseId: verse.id, createdAt: new Date(b.createdAt) }
        });
      }

      // Reconciliation
      await ctx.db.bookmark.deleteMany({
        where: {
          userId,
          verseId: { notIn: verseIds }
        }
      });

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
    const [notes, highlights, bookmarks, verseStatuses] = await Promise.all([
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
      ctx.db.verseStatus.findMany({
        where: { userId, isRead: true },
        include: { verse: { include: { translation: true } } }
      })
    ]);
    return { notes, highlights, bookmarks, verseStatuses };
  }),

  syncVerseStatuses: protectedProcedure
    .input(z.array(z.object({
      verseId: z.string(),
      isRead: z.boolean(),
      readAt: z.number(),
    })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const verseIds: string[] = [];
      for (const s of input) {
        const verse = await ctx.db.verse.findUnique({
          where: { id: s.verseId }
        });
        
        if (!verse) continue;
        verseIds.push(verse.id);

        await ctx.db.verseStatus.upsert({
          where: { userId_verseId: { userId, verseId: verse.id } },
          update: { isRead: s.isRead, readAt: new Date(s.readAt) },
          create: { userId, verseId: verse.id, isRead: s.isRead, readAt: new Date(s.readAt) }
        });
      }

      // Reconciliation: Remove isRead status for anything not in the payload
      await ctx.db.verseStatus.deleteMany({
        where: {
          userId,
          verseId: { notIn: verseIds }
        }
      });

      return { success: true };
    }),

  toggleVerseStatus: protectedProcedure
    .input(z.object({
      verseId: z.string(),
      isRead: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const verse = await ctx.db.verse.findUnique({
        where: { id: input.verseId }
      });
      
      if (!verse) return { success: false };

      await ctx.db.verseStatus.upsert({
        where: { userId_verseId: { userId, verseId: verse.id } },
        update: { isRead: input.isRead, readAt: new Date() },
        create: { userId, verseId: verse.id, isRead: input.isRead, readAt: new Date() }
      });
      return { success: true };
    }),

  resetVerseProgress: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      await ctx.db.verseStatus.deleteMany({
        where: { userId }
      });
      return { success: true };
    }),

  deleteBookmark: protectedProcedure
    .input(z.object({
      verseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.bookmark.deleteMany({
        where: { userId: ctx.session.user.id, verseId: input.verseId }
      });
      return { success: true };
    }),

  saveBookmark: protectedProcedure
    .input(z.object({
      verseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.bookmark.upsert({
        where: { userId_verseId: { userId, verseId: input.verseId } },
        update: { createdAt: new Date() },
        create: { userId, verseId: input.verseId }
      });
      return { success: true };
    }),

  deleteHighlight: protectedProcedure
    .input(z.object({
      verseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.highlight.deleteMany({
        where: { userId: ctx.session.user.id, verseId: input.verseId }
      });
      return { success: true };
    }),

  saveHighlight: protectedProcedure
    .input(z.object({
      verseId: z.string(),
      color: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.highlight.upsert({
        where: { userId_verseId: { userId, verseId: input.verseId } },
        update: { color: input.color, createdAt: new Date() },
        create: { userId, verseId: input.verseId, color: input.color }
      });
      return { success: true };
    }),

  deleteNote: protectedProcedure
    .input(z.object({
      verseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.deleteMany({
        where: { userId: ctx.session.user.id, verseId: input.verseId }
      });
      return { success: true };
    }),

  updateNote: protectedProcedure
    .input(z.object({
      verseId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      return ctx.db.note.update({
        where: { userId_verseId: { userId, verseId: input.verseId } },
        data: {
          content: input.content,
          updatedAt: new Date(),
        },
      });
    }),

  saveNote: protectedProcedure
    .input(z.object({
      verseId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      return ctx.db.note.upsert({
        where: { userId_verseId: { userId, verseId: input.verseId } },
        update: {
          content: input.content,
          updatedAt: new Date(),
        },
        create: {
          userId,
          verseId: input.verseId,
          content: input.content,
        },
      });
    }),

  wipeCloudData: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      await Promise.all([
        ctx.db.highlight.deleteMany({ where: { userId } }),
        ctx.db.note.deleteMany({ where: { userId } }),
        ctx.db.bookmark.deleteMany({ where: { userId } }),
        ctx.db.verseStatus.deleteMany({ where: { userId } }),
      ]);
      return { success: true };
    }),
});
