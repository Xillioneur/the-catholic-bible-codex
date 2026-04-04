import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
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

export const readingPlanRouter = createTRPCRouter({
  getPlans: publicProcedure.query(({ ctx }) => {
    return ctx.db.readingPlan.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  getPlanDetails: publicProcedure
    .input(z.object({ 
      slug: z.string(),
      translationSlug: z.string().default("drb"),
      includeOrders: z.boolean().default(false)
    }))
    .query(async ({ ctx, input }) => {
      if (!input.slug) return null;

      const plan = await ctx.db.readingPlan.findUnique({
        where: { slug: input.slug },
        include: { days: { orderBy: { dayNumber: "asc" } } },
      });

      if (!plan) return null;

      if (!input.includeOrders) {
        return { 
          ...plan, 
          days: plan.days.map(d => ({ ...d, orders: [] as number[] })) 
        };
      }

      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      if (!translation) return { ...plan, days: plan.days.map(d => ({ ...d, orders: [] })) };

      // Resolve all days in parallel
      const daysWithOrders = await Promise.all(plan.days.map(async (day) => {
        const resultOrders: number[] = [];
        for (const citation of day.references) {
          try {
            const { bookSlug, chapter: startChapter, verses: rawVerses } = parseCitation(citation);
            const book = await ctx.db.book.findFirst({ 
              where: { 
                OR: [
                  { slug: { equals: bookSlug, mode: 'insensitive' } },
                  { name: { equals: bookSlug, mode: 'insensitive' } }
                ]
              } 
            });
            if (!book) continue;

            let chapter = startChapter;
            if (book.slug.toLowerCase() === "psalms" && (input.translationSlug === "drb" || input.translationSlug === "vul")) {
              chapter = mapPsalmToVulgate(startChapter);
            }

            if (rawVerses.length > 0) {
              const matchedVerses = await ctx.db.verse.findMany({
                where: { 
                  translationId: translation.id, 
                  bookId: book.id, 
                  chapter: chapter, 
                  verse: { in: rawVerses } 
                },
                select: { globalOrder: true },
                orderBy: { globalOrder: "asc" }
              });
              resultOrders.push(...matchedVerses.map(v => v.globalOrder));
            } else {
              const chapterVerses = await ctx.db.verse.findMany({
                where: {
                  translationId: translation.id,
                  bookId: book.id,
                  chapter: chapter
                },
                select: { globalOrder: true },
                orderBy: { verse: "asc" }
              });
              resultOrders.push(...chapterVerses.map(v => v.globalOrder));
            }
          } catch (e) {
            console.error(`[PLAN-DETAILS-RESOLVE] Failed for ${citation}`, e);
          }
        }
        return { ...day, orders: resultOrders };
      }));

      return { ...plan, days: daysWithOrders };
    }),

  getUserPlans: protectedProcedure.query(({ ctx }) => {
    return ctx.db.userReadingPlan.findMany({
      where: { userId: ctx.session.user.id },
      include: { 
        plan: {
          include: {
            _count: {
              select: { days: true }
            }
          }
        }
      },
    });
  }),

  startPlan: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userReadingPlan.upsert({
        where: {
          userId_planId: {
            userId: ctx.session.user.id,
            planId: input.planId,
          },
        },
        update: {},
        create: {
          userId: ctx.session.user.id,
          planId: input.planId,
          completedDays: [],
        },
      });
    }),

  updateProgress: protectedProcedure
    .input(z.object({ 
      planId: z.string(), 
      currentDay: z.number(),
      isCompleted: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userReadingPlan.update({
        where: {
          userId_planId: {
            userId: ctx.session.user.id,
            planId: input.planId,
          },
        },
        data: {
          currentDay: input.currentDay,
          isCompleted: input.isCompleted,
          completedAt: input.isCompleted ? new Date() : null,
        },
      });
    }),

  deleteUserPlan: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userReadingPlan.delete({
        where: {
          userId_planId: {
            userId: ctx.session.user.id,
            planId: input.planId,
          },
        },
      });
    }),

  toggleDayCompletion: protectedProcedure
    .input(z.object({ 
      planId: z.string(), 
      dayNumber: z.number(),
      completed: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userPlan = await ctx.db.userReadingPlan.findUnique({
        where: { userId_planId: { userId, planId: input.planId } }
      });

      if (!userPlan) return { success: false };

      // FIX: Ensure completedDays is treated as array and use input.dayNumber
      let newCompletedDays = [...(userPlan.completedDays ?? [])];
      if (input.completed) {
        if (!newCompletedDays.includes(input.dayNumber)) {
          newCompletedDays.push(input.dayNumber);
        }
      } else {
        newCompletedDays = newCompletedDays.filter(d => d !== input.dayNumber);
      }

      const plan = await ctx.db.readingPlan.findUnique({
        where: { id: input.planId },
        select: { totalDays: true }
      });

      const isAllFinished = newCompletedDays.length >= (plan?.totalDays || 0);

      return ctx.db.userReadingPlan.update({
        where: { userId_planId: { userId, planId: input.planId } },
        data: {
          completedDays: newCompletedDays,
          isCompleted: isAllFinished,
          completedAt: isAllFinished ? new Date() : null,
        }
      });
    }),

  getPlanDayVerses: publicProcedure
    .input(z.object({ 
      planId: z.string(), 
      dayNumber: z.number(),
      translationSlug: z.string().default("drb")
    }))
    .query(async ({ ctx, input }) => {
      const day = await ctx.db.readingPlanDay.findUnique({
        where: {
          planId_dayNumber: {
            planId: input.planId,
            dayNumber: input.dayNumber,
          },
        },
      });

      if (!day) return [];

      const translation = await ctx.db.translation.findUnique({ where: { slug: input.translationSlug } });
      if (!translation) return [];

      const resultOrders: number[] = [];

      for (const citation of day.references) {
        try {
          const { bookSlug, chapter: startChapter, verses: rawVerses } = parseCitation(citation);
          const book = await ctx.db.book.findFirst({ 
            where: { 
              OR: [
                { slug: { equals: bookSlug, mode: 'insensitive' } },
                { name: { equals: bookSlug, mode: 'insensitive' } }
              ]
            } 
          });
          
          if (!book) continue;

          let chapter = startChapter;
          if (book.slug.toLowerCase() === "psalms" && (input.translationSlug === "drb" || input.translationSlug === "vul")) {
            chapter = mapPsalmToVulgate(startChapter);
          }

          if (rawVerses.length > 0) {
            const matchedVerses = await ctx.db.verse.findMany({
              where: { 
                translationId: translation.id, 
                bookId: book.id, 
                chapter: chapter, 
                verse: { in: rawVerses } 
              },
              select: { globalOrder: true },
              orderBy: { globalOrder: "asc" }
            });
            resultOrders.push(...matchedVerses.map(v => v.globalOrder));
          } else {
            const chapterVerses = await ctx.db.verse.findMany({
              where: {
                translationId: translation.id,
                bookId: book.id,
                chapter: chapter
              },
              select: { globalOrder: true },
              orderBy: { verse: "asc" }
            });
            resultOrders.push(...chapterVerses.map(v => v.globalOrder));
          }
        } catch (e) {
          console.error(`[PLAN-RESOLVE] Failed for ${citation}`, e);
        }
      }

      return resultOrders;
    }),
});
