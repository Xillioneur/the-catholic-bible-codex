"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { 
  X, 
  Play, 
  CheckCircle2, 
  MapPin, 
  ArrowUp, 
  ArrowDown, 
  Scroll,
  ChevronRight,
  Compass
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface JourneyGuideProps {
  currentOrder: number;
}

export function JourneyGuide({ currentOrder }: JourneyGuideProps) {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const journeyGuide = useReaderStore((state) => state.journeyGuide);
  const lastVisibleOrder = useReaderStore((state) => state.lastVisibleOrder);
  const setJourneyGuide = useReaderStore((state) => state.setJourneyGuide);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const journeySeenOrders = useReaderStore((state) => state.journeySeenOrders);
  const addJourneySeenOrder = useReaderStore((state) => state.addJourneySeenOrder);
  
  const [isWarping, setIsWarping] = useState(false);
  
  const currentUserId = session?.user?.id ?? "guest";
  const progressKey = journeyGuide ? `${journeyGuide.planId}-${journeyGuide.dayNumber}` : null;
  const seenOrdersForDay = progressKey ? journeySeenOrders[progressKey] || [] : [];

  const localVerseStatuses = useLiveQuery(
    () => db.verseStatuses.where("userId").equals(currentUserId).toArray(),
    [currentUserId]
  ) ?? [];

  const toggleDayCompletion = api.readingPlan.toggleDayCompletion.useMutation({
    onSuccess: () => {
      utils.readingPlan.getUserPlans.invalidate();
      utils.readingPlan.getPlanDetails.invalidate();
    }
  });

  // 1. Track assigned verses as they pass through the viewport
  useEffect(() => {
    if (journeyGuide && progressKey) {
      const assigned = journeyGuide.orders;
      // Find assigned verses currently in view (between top and bottom of viewport)
      const newlySeen = assigned.filter(o => o >= currentOrder && o <= lastVisibleOrder);
      
      if (newlySeen.length > 0) {
        addJourneySeenOrder(progressKey, newlySeen);
      }
    }
  }, [currentOrder, lastVisibleOrder, journeyGuide, progressKey, addJourneySeenOrder]);

  const { readCount, totalCount, firstUnreadOrder, isFullyRead, lastProgressOrder } = useMemo(() => {
    if (!journeyGuide) return { readCount: 0, totalCount: 0, firstUnreadOrder: null, isFullyRead: false, lastProgressOrder: 0 };
    
    const dayOrders = journeyGuide.orders;
    
    // Progress is based on unique assigned verses seen in viewport
    const seenSet = new Set(seenOrdersForDay);
    
    // Also include manually checkmarked verses for completion
    const manualReadOrders = localVerseStatuses
        .filter(s => s.isRead && dayOrders.includes(s.globalOrder))
        .map(s => s.globalOrder);
    
    const combinedSet = new Set([...Array.from(seenSet), ...manualReadOrders]);
    const firstUnread = dayOrders.find(o => !combinedSet.has(o)) ?? null;
    const maxSeen = seenOrdersForDay.length > 0 ? Math.max(...seenOrdersForDay) : 0;

    return {
      readCount: combinedSet.size,
      totalCount: dayOrders.length,
      firstUnreadOrder: firstUnread,
      isFullyRead: combinedSet.size >= dayOrders.length && dayOrders.length > 0,
      lastProgressOrder: maxSeen
    };
  }, [journeyGuide, localVerseStatuses, seenOrdersForDay]);

  if (!journeyGuide) return null;

  // Visual Progress is exactly (verses seen / total verses)
  const progressPercent = Math.round((readCount / totalCount) * 100);
  
  // Navigation
  const startOrder = journeyGuide.orders[0]!;
  const endOrder = journeyGuide.orders[journeyGuide.orders.length - 1]!;
  
  // Target is the first unread or the furthest seen point
  const targetOrder = firstUnreadOrder ?? lastProgressOrder ?? startOrder;
  const diff = targetOrder - currentOrder;
  const isAbove = diff < 0;
  
  // We are "here" if the viewport contains any part of the day's range
  const isHere = lastVisibleOrder >= startOrder && currentOrder <= endOrder;

  const handleWarp = () => {
    if (targetOrder) {
      setIsWarping(true);
      setScrollToOrder(targetOrder);
      setTimeout(() => setIsWarping(false), 1000);
    }
  };

  const handleGoToStart = () => {
    if (startOrder) {
      setIsWarping(true);
      setScrollToOrder(startOrder);
      setTimeout(() => setIsWarping(false), 1000);
    }
  };

  const handleSeal = async () => {
    try {
      if (session) {
        await toggleDayCompletion.mutateAsync({ 
          planId: journeyGuide.planId, 
          dayNumber: journeyGuide.dayNumber, 
          completed: true 
        });
      } else {
        const userPlan = await db.userReadingPlans
          .where("[userId+planId]")
          .equals([currentUserId, journeyGuide.planId])
          .first();
        
        if (userPlan) {
          const newCompletedDays = [...(userPlan.completedDays || [])];
          if (!newCompletedDays.includes(journeyGuide.dayNumber)) {
            newCompletedDays.push(journeyGuide.dayNumber);
          }
          await db.userReadingPlans.update(userPlan.id!, { 
            completedDays: newCompletedDays,
            currentDay: Math.min(journeyGuide.dayNumber + 1, 365) // Max days guard
          });
        }
      }
      
      toast.success(`Day ${journeyGuide.dayNumber} Sealed!`);
      setJourneyGuide(null);
      // Trigger sidebar to open plans
      window.dispatchEvent(new CustomEvent("open-reading-plans"));
    } catch (e) {
      toast.error("Failed to seal day");
    }
  };

  return (
    <div className="fixed bottom-6 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-[110] flex justify-center pointer-events-none">
      <div className="w-full max-w-lg bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl p-2 flex flex-col gap-2 backdrop-blur-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* HEADER AREA */}
        <div className="flex items-center justify-between px-4 py-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Compass className="h-3 w-3 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-400">Active Journey</span>
              <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                {journeyGuide.planName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary">Day {journeyGuide.dayNumber}</span>
              <span className="text-[9px] font-serif italic text-zinc-500">{journeyGuide.references[0]}</span>
            </div>
            <button 
              onClick={() => setJourneyGuide(null)}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* PROGRESS PILL */}
        <div className="px-3">
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center px-1 overflow-hidden">
            <div className="flex-1 flex items-center gap-3 px-3">
              <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden relative">
                <div 
                  className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[9px] font-black tabular-nums text-primary w-8 text-right">{progressPercent}%</span>
            </div>

            <div className="flex gap-1 h-8">
              {isFullyRead ? (
                <button 
                  onClick={handleSeal}
                  className="px-4 bg-emerald-500 text-white rounded-xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all animate-in zoom-in duration-500"
                >
                  <Scroll className="h-3 w-3 fill-current" />
                  Seal Amen
                </button>
              ) : (
                <div className="flex gap-1">
                  {!isHere && (
                    <button 
                      onClick={handleGoToStart}
                      className="px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                    >
                      Start
                    </button>
                  )}
                  <button 
                    onClick={handleWarp}
                    disabled={isWarping}
                    className={cn(
                      "px-4 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest transition-all",
                      "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                    )}
                  >
                    {isAbove ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {isHere ? "Next" : "Resume"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
