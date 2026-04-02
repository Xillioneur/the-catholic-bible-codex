"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { 
  X, 
  Play, 
  Pause,
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
  ArrowRightToLine,
  Headphones,
  PlayCircle,
  SkipBack,
  SkipForward,
  Square,
  Settings2
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useIsMobile } from "~/hooks/use-mobile";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useVoiceover } from "~/hooks/use-voiceover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface JourneyGuideProps {
  currentOrder: number;
}

export function JourneyGuide({ currentOrder }: JourneyGuideProps) {
  // 1. ALL HOOKS AT TOP LEVEL
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const utils = api.useUtils();
  const journeyGuide = useReaderStore((state) => state.journeyGuide);
  const isMinimized = useReaderStore((state) => state.isJourneyGuideMinimized);
  const setIsMinimized = useReaderStore((state) => state.setIsJourneyGuideMinimized);
  const autoAdvance = useReaderStore((state) => state.autoAdvanceJourney);
  const setAutoAdvance = useReaderStore((state) => state.setAutoAdvanceJourney);
  const isJourneyVoiceActive = useReaderStore((state) => state.isJourneyVoiceActive);
  const setIsJourneyVoiceActive = useReaderStore((state) => state.setIsJourneyVoiceActive);
  
  const lastVisibleOrder = useReaderStore((state) => state.lastVisibleOrder);
  const setJourneyGuide = useReaderStore((state) => state.setJourneyGuide);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const journeySeenOrders = useReaderStore((state) => state.journeySeenOrders);
  const addJourneySeenOrder = useReaderStore((state) => state.addJourneySeenOrder);
  
  const journeyAudioSeenOrders = useReaderStore((state) => state.journeyAudioSeenOrders);
  const addJourneyAudioOrder = useReaderStore((state) => state.addJourneyAudioOrder);
  const journeyAudioPlayhead = useReaderStore((state) => state.journeyAudioPlayhead);
  const setJourneyAudioPlayhead = useReaderStore((state) => state.setJourneyAudioPlayhead);

  const clearDayProgress = useReaderStore((state) => state.clearDayProgress);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const voiceoverSpeed = useReaderStore((state) => state.voiceoverSpeed);
  
  const [isWarping, setIsWarping] = useState(false);
  const isTrackingAllowed = useRef(false);
  const initialReaderOrder = useRef<number | null>(null);
  const hasInitialJumped = useRef<string | null>(null);
  
  const currentUserId = session?.user?.id ?? "guest";
  const progressKey = journeyGuide ? `${journeyGuide.planId}-${journeyGuide.dayNumber}` : null;
  
  const seenOrdersForDay = useMemo(() => {
    return progressKey ? journeySeenOrders[progressKey] || [] : [];
  }, [progressKey, journeySeenOrders]);

  const audioOrdersForDay = useMemo(() => {
    return progressKey ? journeyAudioSeenOrders[progressKey] || [] : [];
  }, [progressKey, journeyAudioSeenOrders]);

  const audioPlayhead = useMemo(() => {
    return progressKey ? journeyAudioPlayhead[progressKey] || 0 : 0;
  }, [progressKey, journeyAudioPlayhead]);

  const { 
    isPlaying, 
    isActive: isVoiceActive, 
    currentOrder: voiceOrder, 
    jumpToOrder, 
    togglePlay, 
    stop, 
    playlist,
    skipForward,
    skipBackward,
    speed,
    unlockAudio
  } = useVoiceover();

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

  const { readCount, totalCount, firstUnseenOrder, isFullyRead } = useMemo(() => {
    if (!journeyGuide) return { readCount: 0, totalCount: 0, firstUnseenOrder: null, isFullyRead: false };
    const dayOrders = journeyGuide.orders;
    const combinedSet = new Set([...seenOrdersForDay, ...audioOrdersForDay]);
    const firstUnseen = dayOrders.find(o => !combinedSet.has(o)) ?? null;

    return {
      readCount: combinedSet.size,
      totalCount: dayOrders.length,
      firstUnseenOrder: firstUnseen,
      isFullyRead: combinedSet.size >= dayOrders.length && dayOrders.length > 0
    };
  }, [journeyGuide, seenOrdersForDay, audioOrdersForDay]);

  const currentVerseContext = useLiveQuery(async () => {
    if (!journeyGuide) return null;
    if (journeyGuide.orders.includes(currentOrder)) {
      const v = await db.verses.where("globalOrder").equals(currentOrder).first();
      if (v) return { bookName: v.book.name, chapter: v.chapter, isRequired: true };
    }
    return { isRequired: false, target: journeyGuide.references[0] };
  }, [currentOrder, journeyGuide]);

  const minutesLeft = useMemo(() => {
    if (isFullyRead) return 0;
    const remaining = totalCount - readCount;
    return Math.max(1, Math.ceil((remaining * 12) / (60 * speed)));
  }, [totalCount, readCount, isFullyRead, speed]);

  const handleNextDay = useCallback(async () => {
    if (!journeyGuide) return;
    try {
      const { data: allPlans } = await utils.readingPlan.getPlans.ensureData();
      const plan = allPlans.find(p => p.id === journeyGuide.planId);
      if (!plan) return;

      const nextDayNum = journeyGuide.dayNumber + 1;
      if (nextDayNum > plan.totalDays) {
        toast.success("Journey Complete!");
        setJourneyGuide(null);
        return;
      }

      toast.loading(`Preparing Day ${nextDayNum}...`, { id: "advance-resolve" });
      const nextOrders = await utils.readingPlan.getPlanDayVerses.fetch({ 
        planId: journeyGuide.planId,
        dayNumber: nextDayNum,
        translationSlug 
      });
      
      const details = await utils.readingPlan.getPlanDetails.fetch({ 
        slug: journeyGuide.planSlug, 
        translationSlug,
        includeOrders: false
      });
      toast.dismiss("advance-resolve");
      
      const nextDayData = details?.days.find(d => d.dayNumber === nextDayNum);
      if (nextDayData && nextOrders) {
        setJourneyGuide({
          planId: journeyGuide.planId,
          planName: journeyGuide.planName,
          planSlug: journeyGuide.planSlug,
          dayNumber: nextDayNum,
          orders: nextOrders,
          references: nextDayData.references
        });
        toast.success(`Advancing to Day ${nextDayNum}`);
      }
    } catch (e) {
      console.error("[ADVANCE_ERROR]", e);
    }
  }, [journeyGuide, setJourneyGuide, utils, translationSlug]);

  const handleSeal = useCallback(async () => {
    if (!journeyGuide) return;
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
      setIsJourneyVoiceActive(false);
      if (autoAdvance) {
        await handleNextDay();
      } else {
        window.dispatchEvent(new CustomEvent("open-reading-plans", { 
          detail: { planSlug: journeyGuide.planSlug } 
        }));
        setJourneyGuide(null);
      }
    } catch (e) {
      console.error("[SEAL_ERROR]", e);
      toast.error("Failed to seal day");
    }
  }, [journeyGuide, session, currentUserId, toggleDayCompletion, autoAdvance, handleNextDay, setJourneyGuide, setIsJourneyVoiceActive]);

  const handleToggleVoice = useCallback(() => {
    // SECURE: Unlock audio context for iOS
    unlockAudio();

    if (isJourneyVoiceActive) {
      togglePlay();
    } else {
      const startOrder = journeyGuide?.orders[0] ?? 1;
      const target = audioPlayhead > 0 ? audioPlayhead : (firstUnseenOrder ?? startOrder);
      const assignmentPlaylist = journeyGuide?.orders.filter(o => o >= target) || [];
      const first = assignmentPlaylist[0];
      if (first !== undefined) {
        setIsJourneyVoiceActive(true);
        jumpToOrder(first, assignmentPlaylist);
        toast.success("Guided Audio Started");
      }
    }
  }, [isJourneyVoiceActive, togglePlay, firstUnseenOrder, journeyGuide, jumpToOrder, audioPlayhead, setIsJourneyVoiceActive, unlockAudio]);

  const handleStopVoice = useCallback(() => {
    stop();
    setIsJourneyVoiceActive(false);
  }, [stop, setIsJourneyVoiceActive]);

  const handleCloseGuide = useCallback(() => {
    handleStopVoice();
    setJourneyGuide(null);
  }, [handleStopVoice, setJourneyGuide]);

  useEffect(() => {
    if (journeyGuide) {
      isTrackingAllowed.current = false;
      initialReaderOrder.current = currentOrder;
      const timer = setTimeout(() => {
        isTrackingAllowed.current = true;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [progressKey]);

  useEffect(() => {
    if (journeyGuide && progressKey && hasInitialJumped.current !== progressKey) {
      const startOrder = journeyGuide.orders[0]!;
      const target = audioPlayhead > 0 ? audioPlayhead : startOrder;
      setIsWarping(true);
      setScrollToOrder(target);
      hasInitialJumped.current = progressKey;
      setTimeout(() => setIsWarping(false), 1000);
    }
  }, [journeyGuide, progressKey, setScrollToOrder, audioPlayhead]);

  // EFFECT: Verse Tracking
  useEffect(() => {
    if (journeyGuide && progressKey && !isWarping && isTrackingAllowed.current) {
      if (currentOrder !== initialReaderOrder.current) {
        if (journeyGuide.orders.includes(currentOrder)) {
          addJourneySeenOrder(progressKey, [currentOrder]);
        }
      }
    }
  }, [currentOrder, journeyGuide, progressKey, addJourneySeenOrder, isWarping]);

  // EFFECT: Audio Progress Tracking
  useEffect(() => {
    if (isJourneyVoiceActive && voiceOrder && progressKey && isPlaying) {
      addJourneyAudioOrder(progressKey, [voiceOrder]);
      setJourneyAudioPlayhead(progressKey, voiceOrder);
    }
  }, [voiceOrder, isJourneyVoiceActive, progressKey, addJourneyAudioOrder, setJourneyAudioPlayhead, isPlaying]);

  // Handle outside audio stop
  useEffect(() => {
    if (isJourneyVoiceActive && !isVoiceActive) {
      setIsJourneyVoiceActive(false);
    }
  }, [isVoiceActive, isJourneyVoiceActive, setIsJourneyVoiceActive]);

  // Detect assignment finish
  useEffect(() => {
    if (!isJourneyVoiceActive || !journeyGuide) return;
    const lastOrder = journeyGuide.orders[journeyGuide.orders.length - 1];
    if (voiceOrder === lastOrder && isFullyRead && autoAdvance) {
      const timer = setTimeout(() => {
        void handleSeal();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [voiceOrder, isJourneyVoiceActive, journeyGuide, isFullyRead, autoAdvance, handleSeal]);

  if (!journeyGuide) return null;

  const progressPercent = Math.round((readCount / totalCount) * 100);
  const startOrder = journeyGuide.orders[0]!;
  const endOrder = journeyGuide.orders[journeyGuide.orders.length - 1]!;
  const isHere = lastVisibleOrder >= startOrder && currentOrder <= endOrder;
  const isAbove = (firstUnseenOrder ?? endOrder) < currentOrder;

  const openRoadmap = () => {
    window.dispatchEvent(new CustomEvent("open-reading-plans", { detail: { planSlug: journeyGuide.planSlug } }));
  };

  const handleResetDay = () => {
    if (progressKey && confirm("Reset all progress for this day?")) {
      clearDayProgress(progressKey);
      handleStopVoice();
      initialReaderOrder.current = journeyGuide.orders[0]!;
      setIsWarping(true);
      setScrollToOrder(journeyGuide.orders[0]!);
      setTimeout(() => setIsWarping(false), 1000);
      toast.success("Progress reset to 0%");
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
          <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={cn("transition-all duration-1000 ease-out", isFullyRead ? "text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "text-primary")} />
        </svg>
        {isFullyRead ? <Trophy className="h-3 w-3 text-emerald-500" /> : <span className="text-[7px] font-black tabular-nums text-zinc-900 dark:text-zinc-100">{progressPercent}%</span>}
      </div>
    );
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className={cn(
      "fixed z-[110] flex flex-col items-end pointer-events-none transition-all duration-500",
      isMobile ? (isMinimized ? "bottom-[5.5rem] right-4" : "bottom-[6.5rem] right-4") : "bottom-20 right-6"
    )}>
      {isMinimized ? (
        <button onClick={() => setIsMinimized(false)} className={cn("pointer-events-auto h-10 px-2 rounded-full border shadow-xl flex items-center gap-2 backdrop-blur-3xl transition-all hover:scale-105 active:scale-95 group", isFullyRead ? "bg-emerald-500/10 border-emerald-500/30 ring-4 ring-emerald-500/5" : "bg-white/90 dark:bg-zinc-950/90 border-zinc-200 dark:border-zinc-800")}>
          <ProgressRing size={28} strokeWidth={2} />
          <div className="flex flex-col items-start pr-2 overflow-hidden text-left">
            <span className="text-[8px] font-black uppercase text-zinc-400 leading-none">Day {journeyGuide.dayNumber}</span>
            <span className="text-[9px] font-bold truncate max-w-[60px] sm:max-w-[80px] leading-tight">{isFullyRead ? "Complete" : journeyGuide.planName}</span>
          </div>
          <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="h-3 w-3 text-zinc-500" /></div>
        </button>
      ) : (
        <div className={cn("w-[calc(100vw-2rem)] sm:w-full sm:max-w-[360px] flex flex-col gap-1.5 p-1.5 rounded-[1.5rem] shadow-2xl border pointer-events-auto backdrop-blur-3xl animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden", isFullyRead ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-emerald-500/20" : "bg-white/90 dark:bg-zinc-950/90 border-white/20 dark:border-zinc-800/50")}>
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button onClick={openRoadmap} className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 border transition-all", isFullyRead ? "bg-emerald-500 border-emerald-400 text-white" : "bg-primary/5 border-primary/10 text-primary")}>
                {isFullyRead ? <Trophy className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
              </button>
              <div onClick={openRoadmap} className="flex flex-col min-w-0 text-left group cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">Day {journeyGuide.dayNumber}</span>
                  {!isFullyRead && (
                    <div className="flex items-center gap-1 text-zinc-400">
                      <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <span className="text-[7px] font-black uppercase tracking-widest flex items-center gap-0.5"><Timer className="h-2 w-2" /> {minutesLeft}m</span>
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400 truncate leading-none">{journeyGuide.planName}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-0.5">
              <button onClick={() => setAutoAdvance(!autoAdvance)} className={cn("h-7 px-2 rounded-lg flex items-center gap-1 transition-all border text-[6px] font-black uppercase tracking-tighter", autoAdvance ? "bg-primary/10 border-primary/20 text-primary" : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400")} title="Auto-Advance"><PlayCircle className={cn("h-3 w-3", autoAdvance && "fill-current")} />Auto</button>
              <button onClick={handleResetDay} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-300 hover:text-rose-500 transition-colors" title="Reset Day"><RotateCcw className="h-3 w-3" /></button>
              <button onClick={() => setIsMinimized(true)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors" title="Minimize"><Minimize2 className="h-3 w-3" /></button>
              <button onClick={handleCloseGuide} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors" title="Close"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="px-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                {currentVerseContext && (
                  <div className="flex flex-col">
                    <span className={cn("text-[8px] font-black uppercase tracking-tighter truncate", isFullyRead ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")}>{isFullyRead ? "Assignment Complete" : "Now Reading"}</span>
                    <span className={cn("text-[9px] font-bold leading-none truncate", isFullyRead ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100")}>{isFullyRead ? <span className="flex items-center gap-1">All Goals Met <Sparkles className="h-2.5 w-2.5" /></span> : (currentVerseContext.isRequired ? `${currentVerseContext.bookName} ${currentVerseContext.chapter}` : `Target: ${currentVerseContext.target}`)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!isFullyRead && (
                  <div className="flex items-center gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 transition-all">
                    {isJourneyVoiceActive ? (
                      <>
                        <button onClick={skipBackward} className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-primary transition-colors"><SkipBack className="h-3 w-3" /></button>
                        <button onClick={handleToggleVoice} className="h-7 px-2 rounded-lg bg-primary text-white flex items-center gap-1.5 text-[7px] font-black uppercase shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">{isPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}</button>
                        <button onClick={skipForward} className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-primary transition-colors"><SkipForward className="h-3 w-3" /></button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-primary transition-colors"><Settings2 className="h-3 w-3" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="top" align="end" className="w-32 p-2 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl">
                            <DropdownMenuLabel className="text-[8px] font-black uppercase tracking-widest text-zinc-400 pb-2">Playback Speed</DropdownMenuLabel>
                            <div className="grid grid-cols-2 gap-1">
                              {speeds.map((s) => (
                                <button key={s} onClick={() => useReaderStore.setState({ voiceoverSpeed: s })} className={cn("py-1.5 rounded-lg text-[9px] font-bold transition-all border", voiceoverSpeed === s ? "bg-primary border-primary text-white" : "border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800")}>{s}x</button>
                              ))}
                            </div>
                            <DropdownMenuSeparator className="my-2 bg-zinc-100 dark:bg-zinc-800" />
                            <button onClick={handleStopVoice} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all"><Square className="h-2.5 w-2.5 fill-current" /> Stop Audio</button>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    ) : (
                      <button onClick={handleToggleVoice} className="h-7 px-3 rounded-lg flex items-center gap-1.5 text-[7px] font-black uppercase text-zinc-500 hover:text-primary transition-all"><Headphones className="h-3 w-3" />Listen</button>
                    )}
                  </div>
                )}

                {isFullyRead ? (
                  <button onClick={handleSeal} className="h-8 px-4 bg-emerald-500 text-white rounded-xl flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"><Scroll className="h-3 w-3 fill-current" /> Amen</button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => { setIsWarping(true); setScrollToOrder(startOrder); setTimeout(() => setIsWarping(false), 1000); }} className="h-8 w-8 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all border border-zinc-200/50 dark:border-zinc-700/50" title="Go to Start"><ArrowRightToLine className="h-3 w-3 rotate-180" /></button>
                    <button onClick={() => { const target = firstUnseenOrder ?? startOrder; setIsWarping(true); setScrollToOrder(target); setTimeout(() => setIsWarping(false), 1000); }} className={cn("h-8 px-4 rounded-xl flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all shrink-0", isHere ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95")}>{isHere ? <MapPin className="h-3 w-3" /> : (isAbove ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}{isHere ? "Here" : "Resume"}</button>
                  </div>
                )}
              </div>
            </div>
            <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden relative">
              <div className={cn("h-full transition-all duration-1000 ease-out relative", isFullyRead ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-primary")} style={{ width: `${progressPercent}%` }}>
                {!isFullyRead && <div className="absolute top-0 right-0 h-full w-4 bg-white/20 blur-sm animate-pulse" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
