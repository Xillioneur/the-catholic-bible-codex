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
  RotateCcw,
  Sparkles,
  Trophy,
  Maximize2,
  Minimize2
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useIsMobile } from "~/hooks/use-mobile";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface JourneyGuideProps {
  currentOrder: number;
}

export function JourneyGuide({ currentOrder }: JourneyGuideProps) {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const utils = api.useUtils();
  const journeyGuide = useReaderStore((state) => state.journeyGuide);
  const isMinimized = useReaderStore((state) => state.isJourneyGuideMinimized);
  const setIsMinimized = useReaderStore((state) => state.setIsJourneyGuideMinimized);
  
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

  // HOOKS MUST BE AT TOP LEVEL
  const toggleDayCompletion = api.readingPlan.toggleDayCompletion.useMutation({
    onSuccess: () => {
      utils.readingPlan.getUserPlans.invalidate();
      utils.readingPlan.getPlanDetails.invalidate();
    }
  });

  const localVerseStatuses = useLiveQuery(
    () => db.verseStatuses.where("userId").equals(currentUserId).toArray(),
    [currentUserId]
  ) ?? [];

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
      isFullyRead: (combinedSet.size >= dayOrders.length || lastVisibleOrder >= dayOrders[dayOrders.length - 1]) && dayOrders.length > 0,
      lastProgressOrder: maxSeen
    };
  }, [journeyGuide, localVerseStatuses, seenOrdersForDay, lastVisibleOrder]);

  const currentVerseContext = useLiveQuery(async () => {
    if (!journeyGuide) return null;
    if (journeyGuide.orders.includes(currentOrder)) {
      const v = await db.verses.where("globalOrder").equals(currentOrder).first();
      if (v) return { bookName: v.book.name, chapter: v.chapter, isRequired: true };
    }
    return { isRequired: false, target: journeyGuide.references[0] };
  }, [currentOrder, journeyGuide]);

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
  const isHere = lastVisibleOrder >= startOrder && currentOrder <= endOrder;
  const isAbove = (firstUnreadOrder ?? endOrder) < currentOrder;

  const openRoadmap = () => {
    window.dispatchEvent(new CustomEvent("open-reading-plans", { 
      detail: { planSlug: journeyGuide.planSlug } 
    }));
  };

  const handleResetDay = () => {
    if (progressKey && journeyGuide && confirm("Reset scroll progress for this day?")) {
      clearDayProgress(progressKey);
      setScrollToOrder(journeyGuide.orders[0]!);
      toast.success("Returned to start");
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
        const userPlan = await db.userReadingPlans.where("[userId+planId]").equals([currentUserId, journeyGuide.planId]).first();
        if (userPlan) {
          const newCompletedDays = [...(userPlan.completedDays || [])];
          if (!newCompletedDays.includes(journeyGuide.dayNumber)) newCompletedDays.push(journeyGuide.dayNumber);
          await db.userReadingPlans.update(userPlan.id!, { 
            completedDays: newCompletedDays, 
            currentDay: Math.min(journeyGuide.dayNumber + 1, 365) 
          });
        }
      }
      toast.success(`Day ${journeyGuide.dayNumber} Sealed!`);
      openRoadmap();
      setJourneyGuide(null);
    } catch (e) {
      console.error("[SEAL_ERROR]", e);
      toast.error("Failed to seal day");
    }
  };

  const ProgressRing = ({ size = 32, strokeWidth = 2.5 }: { size?: number, strokeWidth?: number }) => {
    const radius = (size / 2) - strokeWidth;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progressPercent / 100) * circumference;
    return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg className="absolute -rotate-90 transform" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-zinc-100 dark:text-zinc-800" />
          <circle 
            cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", isFullyRead ? "text-emerald-500" : "text-primary")}
          />
        </svg>
        {isFullyRead ? <Trophy className="h-3 w-3 text-emerald-500" /> : <span className="text-[7px] font-black tabular-nums text-zinc-900 dark:text-zinc-100">{progressPercent}%</span>}
      </div>
    );
  };

  return (
    <div className={cn(
      "fixed z-[110] flex flex-col items-end pointer-events-none transition-all duration-500",
      isMobile 
        ? (isMinimized ? "bottom-[5.5rem] right-4" : "bottom-[6.5rem] right-4") 
        : "bottom-20 right-6"
    )}>
      {isMinimized ? (
        <button 
          onClick={() => setIsMinimized(false)}
          className={cn(
            "pointer-events-auto h-10 px-2 rounded-full border shadow-xl flex items-center gap-2 backdrop-blur-3xl transition-all hover:scale-105 active:scale-95 group",
            isFullyRead 
              ? "bg-emerald-500/10 border-emerald-500/30 ring-4 ring-emerald-500/5" 
              : "bg-white/90 dark:bg-zinc-950/90 border-zinc-200 dark:border-zinc-800"
          )}
        >
          <ProgressRing size={28} strokeWidth={2} />
          <div className="flex flex-col items-start pr-2 overflow-hidden">
            <span className="text-[8px] font-black uppercase text-zinc-400 leading-none">Day {journeyGuide.dayNumber}</span>
            <span className="text-[9px] font-bold truncate max-w-[60px] sm:max-w-[80px] leading-tight">
              {isFullyRead ? "Complete" : journeyGuide.planName}
            </span>
          </div>
          <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="h-3 w-3 text-zinc-500" />
          </div>
        </button>
      ) : (
        <div className={cn(
          "w-[calc(100vw-2rem)] sm:w-full sm:max-w-[280px] flex flex-col gap-2 p-2 rounded-[1.5rem] shadow-2xl border pointer-events-auto backdrop-blur-3xl animate-in fade-in slide-in-from-right-4 duration-500",
          isFullyRead 
            ? "bg-emerald-500/10 border-emerald-500/30 ring-4 ring-emerald-500/5 shadow-emerald-500/20" 
            : "bg-white/90 dark:bg-zinc-950/90 border-zinc-200/50 dark:border-zinc-800/50"
        )}>
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ProgressRing size={32} strokeWidth={2.5} />
              <button onClick={openRoadmap} className="flex flex-col min-w-0 text-left group">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">Day {journeyGuide.dayNumber}</span>
                  <ChevronRight className="h-2 w-2 text-zinc-300 group-hover:text-primary" />
                </div>
                <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 truncate leading-none">{journeyGuide.planName}</span>
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={handleResetDay} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-300 hover:text-rose-500 transition-colors" title="Reset Day"><RotateCcw className="h-3 w-3" /></button>
              <button onClick={() => setIsMinimized(true)} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"><Minimize2 className="h-3 w-3" /></button>
              <button onClick={() => setJourneyGuide(null)} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="px-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0 flex-1">
                {currentVerseContext && (
                  <span className={cn(
                    "text-[8px] font-bold leading-none truncate",
                    isFullyRead ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-300"
                  )}>
                    {isFullyRead ? "Assignment Finished" : (currentVerseContext.isRequired ? `${currentVerseContext.bookName} ${currentVerseContext.chapter}` : `Target: ${currentVerseContext.target}`)}
                  </span>
                )}
                {!isFullyRead && <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">{totalCount - readCount} left</span>}
              </div>

              {isFullyRead ? (
                <button onClick={handleSeal} className="h-7 px-3 bg-emerald-500 text-white rounded-full flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">
                  <Scroll className="h-3 w-3 fill-current" /> Amen
                </button>
              ) : (
                <button 
                  onClick={() => {
                    const target = firstUnreadOrder ?? startOrder;
                    setIsWarping(true);
                    setScrollToOrder(target);
                    setTimeout(() => setIsWarping(false), 1000);
                  }}
                  className={cn(
                    "h-7 px-3 rounded-full flex items-center gap-1 text-[8px] font-black uppercase tracking-widest transition-all shrink-0",
                    isHere ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                  )}
                >
                  {isHere ? "Reading" : "Resume"}
                </button>
              )}
            </div>
            
            <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000 ease-out", isFullyRead ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
