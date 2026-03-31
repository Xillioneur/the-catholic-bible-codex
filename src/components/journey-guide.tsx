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
  Compass,
  RotateCcw
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
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
  const clearDayProgress = useReaderStore((state) => state.clearDayProgress);
  
  const [isWarping, setIsWarping] = useState(false);
  const hasInitialJumped = useRef<string | null>(null);
  
  const currentUserId = session?.user?.id ?? "guest";
  const progressKey = journeyGuide ? `${journeyGuide.planId}-${journeyGuide.dayNumber}` : null;
  const seenOrdersForDay = progressKey ? journeySeenOrders[progressKey] || [] : [];

  const localVerseStatuses = useLiveQuery(
    () => db.verseStatuses.where("userId").equals(currentUserId).toArray(),
    [currentUserId]
  ) ?? [];

  // Fetch context for 'Currently Reading' - limited to required readings
  const currentVerseContext = useLiveQuery(async () => {
    if (!journeyGuide) return null;
    
    // Only show context if we are actually within the assigned orders for today
    if (journeyGuide.orders.includes(currentOrder)) {
      const v = await db.verses.where("globalOrder").equals(currentOrder).first();
      if (v) return { bookName: v.book.name, chapter: v.chapter, isRequired: true };
    }
    
    return { isRequired: false, target: journeyGuide.references.join(", ") };
  }, [currentOrder, journeyGuide]);

  const toggleDayCompletion = api.readingPlan.toggleDayCompletion.useMutation({
    onSuccess: () => {
      utils.readingPlan.getUserPlans.invalidate();
      utils.readingPlan.getPlanDetails.invalidate();
    }
  });

  const { readCount, totalCount, firstUnreadOrder, isFullyRead, lastProgressOrder } = useMemo(() => {
    if (!journeyGuide) return { readCount: 0, totalCount: 0, firstUnreadOrder: null, isFullyRead: false, lastProgressOrder: 0 };
    const dayOrders = journeyGuide.orders;
    const seenSet = new Set(seenOrdersForDay);
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

  useEffect(() => {
    if (journeyGuide && progressKey && hasInitialJumped.current !== progressKey) {
      const startOrder = journeyGuide.orders[0]!;
      const target = seenOrdersForDay.length === 0 ? startOrder : (lastProgressOrder || startOrder);
      setScrollToOrder(target);
      hasInitialJumped.current = progressKey;
    }
  }, [journeyGuide, progressKey, lastProgressOrder, setScrollToOrder, seenOrdersForDay.length]);

  useEffect(() => {
    if (journeyGuide && progressKey) {
      const assigned = journeyGuide.orders;
      const newlySeen = assigned.filter(o => o >= currentOrder && o <= lastVisibleOrder);
      if (newlySeen.length > 0) {
        addJourneySeenOrder(progressKey, newlySeen);
      }
    }
  }, [currentOrder, lastVisibleOrder, journeyGuide, progressKey, addJourneySeenOrder]);

  if (!journeyGuide) return null;

  const progressPercent = Math.round((readCount / totalCount) * 100);
  const startOrder = journeyGuide.orders[0]!;
  const endOrder = journeyGuide.orders[journeyGuide.orders.length - 1]!;
  
  const targetOrder = firstUnreadOrder ?? lastProgressOrder ?? startOrder;
  const diff = targetOrder - currentOrder;
  const isAbove = diff < 0;
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

  const handleResetDay = () => {
    if (progressKey && journeyGuide && confirm("Reset scroll progress for this day?")) {
      clearDayProgress(progressKey);
      setScrollToOrder(journeyGuide.orders[0]!);
      toast.success("Progress cleared & returned to start");
    }
  };

  const handleSeal = async () => {
    try {
      if (session) {
        await toggleDayCompletion.mutateAsync({ planId: journeyGuide.planId, dayNumber: journeyGuide.dayNumber, completed: true });
      } else {
        const userPlan = await db.userReadingPlans.where("[userId+planId]").equals([currentUserId, journeyGuide.planId]).first();
        if (userPlan) {
          const newCompletedDays = [...(userPlan.completedDays || [])];
          if (!newCompletedDays.includes(journeyGuide.dayNumber)) newCompletedDays.push(journeyGuide.dayNumber);
          await db.userReadingPlans.update(userPlan.id!, { completedDays: newCompletedDays, currentDay: Math.min(journeyGuide.dayNumber + 1, 365) });
        }
      }
      toast.success(`Day ${journeyGuide.dayNumber} Sealed!`);
      const slug = journeyGuide.planSlug;
      setJourneyGuide(null);
      window.dispatchEvent(new CustomEvent("open-reading-plans", { detail: { planSlug: slug } }));
    } catch (e) {
      toast.error("Failed to seal day");
    }
  };

  return (
    <div className="fixed bottom-6 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-[110] flex justify-center pointer-events-none">
      <div className="w-full max-w-sm bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/50 dark:border-zinc-800/50 rounded-[2rem] shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
              <Compass className="h-3 w-3 text-primary" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">{journeyGuide.planName}</span>
                <span className="text-[8px] font-black text-primary px-1.5 py-0.5 rounded-full bg-primary/5 border border-primary/10">D{journeyGuide.dayNumber}</span>
              </div>
              {currentVerseContext && (
                <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">
                  {currentVerseContext.isRequired ? (
                    <>Reading: {currentVerseContext.bookName} {currentVerseContext.chapter}</>
                  ) : (
                    <>Target: {currentVerseContext.target}</>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleResetDay} className="h-7 w-7 flex items-center justify-center rounded-full text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all" title="Reset to Start"><RotateCcw className="h-3.5 w-3.5" /></button>
            <button onClick={() => setJourneyGuide(null)} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X className="h-3.5 w-3.5 text-zinc-400" /></button>
          </div>
        </div>
        <div className="px-2 pb-1">
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50 flex items-center px-1">
            <div className="flex-1 flex items-center gap-2.5 px-3">
              <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-[9px] font-black tabular-nums text-primary w-7 text-right">{progressPercent}%</span>
            </div>
            <div className="flex gap-1 h-8">
              {isFullyRead ? (
                <button onClick={handleSeal} className="px-4 bg-emerald-500 text-white rounded-xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"><Scroll className="h-3 w-3 fill-current" />Amen</button>
              ) : (
                <div className="flex gap-1">
                  {!isHere && <button onClick={handleGoToStart} className="px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center text-[8px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all border border-zinc-200/50 dark:border-zinc-700/50">Start</button>}
                  <button onClick={handleWarp} disabled={isWarping} className={cn("px-4 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest transition-all", "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95")}>{isAbove ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{isHere ? "Next" : "Resume"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
