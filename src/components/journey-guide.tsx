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
  Minimize2,
  Timer,
  ArrowRightToLine
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

  // Approximate time left (12s per verse average)
  const minutesLeft = useMemo(() => {
    if (isFullyRead) return 0;
    const remaining = totalCount - readCount;
    return Math.max(1, Math.ceil((remaining * 12) / 60));
  }, [totalCount, readCount, isFullyRead]);

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
        /* ADVANCED GLASS BLADE COMMAND CENTER */
        <div className={cn(
          "w-[calc(100vw-2rem)] sm:w-full sm:max-w-[300px] flex flex-col gap-1.5 p-1.5 rounded-[1.5rem] shadow-2xl border pointer-events-auto backdrop-blur-3xl animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden",
          isFullyRead 
            ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-emerald-500/20" 
            : "bg-white/90 dark:bg-zinc-950/90 border-zinc-200/50 dark:border-zinc-800/50"
        )}>
          {/* LAYER 1: IDENTITY & META */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button 
                onClick={openRoadmap}
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border transition-all",
                  isFullyRead ? "bg-emerald-500 border-emerald-400 text-white" : "bg-primary/5 border-primary/10 text-primary"
                )}
              >
                {isFullyRead ? <Trophy className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
              </button>
              <button onClick={openRoadmap} className="flex flex-col min-w-0 text-left group">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">Day {journeyGuide.dayNumber}</span>
                  {!isFullyRead && (
                    <div className="flex items-center gap-1 text-zinc-400">
                      <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <span className="text-[7px] font-black uppercase tracking-widest flex items-center gap-0.5">
                        <Timer className="h-2 w-2" /> {minutesLeft}m
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 truncate leading-none">{journeyGuide.planName}</span>
              </button>
            </div>
            
            <div className="flex items-center gap-0.5">
              <button onClick={handleResetDay} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-300 hover:text-rose-500 transition-colors"><RotateCcw className="h-3 w-3" /></button>
              <button onClick={() => setIsMinimized(true)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"><Minimize2 className="h-3 w-3" /></button>
              <button onClick={() => setJourneyGuide(null)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* LAYER 2: PROGRESS & CONTEXT */}
          <div className="px-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                {currentVerseContext && (
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-tighter truncate",
                      isFullyRead ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"
                    )}>
                      {isFullyRead ? "Reading Complete" : "Now Reading"}
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold leading-none truncate",
                      isFullyRead ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                    )}>
                      {isFullyRead ? (
                        <span className="flex items-center gap-1">All Goals Met <Sparkles className="h-2.5 w-2.5" /></span>
                      ) : currentVerseContext.isRequired ? (
                        <>{currentVerseContext.bookName} {currentVerseContext.chapter}</>
                      ) : (
                        <>{currentVerseContext.target}</>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {isFullyRead ? (
                <button onClick={handleSeal} className="h-8 px-4 bg-emerald-500 text-white rounded-xl flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">
                  <Scroll className="h-3 w-3 fill-current" /> Amen
                </button>
              ) : (
                <div className="flex gap-1">
                  <button 
                    onClick={() => setScrollToOrder(startOrder)}
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                    title="Go to Start"
                  >
                    <ArrowRightToLine className="h-3.5 w-3.5 rotate-180" />
                  </button>
                  <button 
                    onClick={() => {
                      const target = firstUnreadOrder ?? startOrder;
                      setIsWarping(true);
                      setScrollToOrder(target);
                      setTimeout(() => setIsWarping(false), 1000);
                    }}
                    className={cn(
                      "h-8 px-4 rounded-xl flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all",
                      isHere ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default" : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                    )}
                  >
                    {isHere ? "Inside" : "Resume"}
                  </button>
                </div>
              )}
            </div>
            
            {/* HIGH-PRECISION BAR */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[6px] font-black uppercase tracking-widest text-zinc-400/60 px-0.5">
                <span>Beginning</span>
                <span>{progressPercent}% Complete</span>
                <span>Amen</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden relative">
                <div 
                  className={cn("h-full transition-all duration-1000 ease-out relative", isFullyRead ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${progressPercent}%` }}
                >
                  {!isFullyRead && <div className="absolute top-0 right-0 h-full w-4 bg-white/20 blur-sm animate-pulse" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
