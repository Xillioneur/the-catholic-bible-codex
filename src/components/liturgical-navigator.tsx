"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { ChevronLeft, ChevronRight, BookOpen, X, Sparkles, Volume2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { useVoiceover } from "~/hooks/use-voiceover";

/**
 * LiturgicalNavigator: A sophisticated control for Daily Mass Readings.
 * Only appears when the user is explicitly using the Daily Readings feature.
 */
export function LiturgicalNavigator() {
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const currentOrder = useReaderStore((state) => state.currentOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const isNavigatorVisible = useReaderStore((state) => state.isNavigatorVisible);
  const setIsNavigatorVisible = useReaderStore((state) => state.setIsNavigatorVisible);
  const { jumpToText, unlockAudio } = useVoiceover();

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isNavigatorVisible || !isDismissed) return;

    const isInside = liturgicalReadings.some(r => {
      const first = r.orders[0];
      const last = r.orders[r.orders.length - 1];
      if (first === undefined || last === undefined) return false;
      return currentOrder >= first && currentOrder <= last;
    });

    if (isInside) {
      setIsDismissed(false);
    }
  }, [currentOrder, liturgicalReadings, isDismissed, isNavigatorVisible]);

  const { activeReading, isFar, activeIndex } = useMemo(() => {
    if (!liturgicalReadings.length) return { activeReading: null, isFar: true, activeIndex: -1 };
    
    const currentIndex = liturgicalReadings.findIndex(r => {
      const first = r.orders[0];
      const last = r.orders[r.orders.length - 1];
      if (first === undefined || last === undefined) return false;
      return currentOrder >= first - 150 && currentOrder <= last + 150;
    });
    
    if (currentIndex !== -1) {
      return { 
        activeReading: liturgicalReadings[currentIndex], 
        isFar: false, 
        activeIndex: currentIndex 
      };
    }

    const upcomingIndex = liturgicalReadings.findIndex(r => (r.orders[0] ?? 0) > currentOrder);
    
    if (upcomingIndex === -1) {
      return { 
        activeReading: liturgicalReadings[liturgicalReadings.length - 1], 
        isFar: true, 
        activeIndex: liturgicalReadings.length - 1 
      };
    }

    if (upcomingIndex === 0) {
      return { 
        activeReading: liturgicalReadings[0], 
        isFar: true, 
        activeIndex: 0 
      };
    }

    const prevReading = liturgicalReadings[upcomingIndex - 1];
    const nextReading = liturgicalReadings[upcomingIndex];
    const distPrev = Math.abs(currentOrder - (prevReading?.orders[0] ?? 0));
    const distNext = Math.abs(currentOrder - (nextReading?.orders[0] ?? 0));
    
    const closest = distNext < distPrev ? upcomingIndex : upcomingIndex - 1;

    return { 
      activeReading: liturgicalReadings[closest], 
      isFar: true, 
      activeIndex: closest 
    };
  }, [liturgicalReadings, currentOrder]);

  if (!isNavigatorVisible || !liturgicalReadings.length || !activeReading) {
    return null;
  }

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < liturgicalReadings.length - 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevReading = liturgicalReadings[activeIndex - 1];
    if (!prevReading) return;

    if (prevReading.type === "Sequence" && prevReading.sequenceText) {
      unlockAudio();
      jumpToText(prevReading.sequenceText);
    } else if (prevReading.orders[0] !== undefined) {
      setScrollToOrder(prevReading.orders[0]);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextReading = liturgicalReadings[activeIndex + 1];
    if (!nextReading) return;

    if (nextReading.type === "Sequence" && nextReading.sequenceText) {
      unlockAudio();
      jumpToText(nextReading.sequenceText);
    } else if (nextReading.orders[0] !== undefined) {
      setScrollToOrder(nextReading.orders[0]);
    }
  };

  const handleJumpToActive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeReading.type === "Sequence" && activeReading.sequenceText) {
      unlockAudio();
      jumpToText(activeReading.sequenceText);
    } else {
      const order = activeReading.orders[0];
      if (order !== undefined) {
        setScrollToOrder(order);
        setIsDismissed(false);
      }
    }
  };

  if (isDismissed) {
    return (
      <div className="fixed bottom-24 right-8 z-[100] flex items-center gap-2 animate-in fade-in zoom-in duration-500">
        <button 
          onClick={() => setIsNavigatorVisible(false)}
          className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 shadow-md transition-all hover:scale-110 active:scale-95 group"
          title="Close Feature"
        >
          <X className="h-3 w-3 group-hover:rotate-90 transition-transform" />
        </button>
        <button 
          onClick={() => setIsDismissed(false)}
          className="h-12 w-12 rounded-full bg-white dark:bg-zinc-900 border-2 border-primary/20 flex items-center justify-center text-primary shadow-2xl hover:scale-110 active:scale-95 transition-all group overflow-hidden relative"
          title="Restore Navigator"
        >
          <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          <div className="absolute top-1 right-1 h-2.5 w-2.5 bg-primary rounded-full animate-pulse ring-4 ring-primary/10" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className={cn(
        "glass-liturgical rounded-full shadow-liturgical p-1.5 flex items-center transition-all duration-500",
        isFar ? "ring-2 ring-primary/40 px-2" : "ring-1 ring-primary/10 px-2"
      )}>
        <button 
          onClick={() => setIsNavigatorVisible(false)}
          className="h-10 w-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
          title="Exit Daily Readings"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <button 
          onClick={handlePrev}
          disabled={!hasPrev}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-full transition-all",
            hasPrev ? "hover:bg-primary/10 text-primary active:scale-90" : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-50"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button 
          onClick={handleJumpToActive}
          className={cn(
            "flex flex-col items-center px-4 min-w-[160px] transition-all rounded-2xl py-1",
            isFar || activeReading.type === "Sequence" ? "hover:bg-primary/5 cursor-pointer ring-1 ring-primary/10 bg-primary/[0.02]" : ""
          )}
        >
          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary/60 mb-0.5">
            {activeReading.type === "Sequence" ? "Listen to Sequence" : isFar ? "Jump To" : "Daily Reading"}
          </span>
          <div className="flex items-center gap-2">
             <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
              {activeReading.type}
            </span>
            {(isFar || activeReading.type === "Sequence") && (
              activeReading.type === "Sequence" ? <Volume2 className="h-3 w-3 text-primary animate-pulse" /> : <BookOpen className="h-3 w-3 text-primary animate-pulse" />
            )}
          </div>
          <span className="text-[9px] font-medium text-zinc-500 italic line-clamp-1 max-w-[140px]">
            {activeReading.citation}
          </span>
        </button>

        <button 
          onClick={handleNext}
          disabled={!hasNext}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-full transition-all",
            hasNext ? "hover:bg-primary/10 text-primary active:scale-90" : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-50"
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <div className="flex gap-1 px-2 h-10 items-center">
          {liturgicalReadings.map((r, i) => (
            <button 
              key={r.type}
              onClick={(e) => {
                e.stopPropagation();
                if (r.type === "Sequence" && r.sequenceText) {
                  unlockAudio();
                  jumpToText(r.sequenceText);
                } else {
                  const firstOrder = r.orders[0];
                  if (firstOrder !== undefined) setScrollToOrder(firstOrder);
                }
              }}
              title={r.type}
              className="group h-8 w-4 flex items-center justify-center"
            >
              <div className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex ? "bg-primary w-3" : "bg-primary/20 w-1.5 group-hover:bg-primary/40 group-hover:w-2"
              )} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
