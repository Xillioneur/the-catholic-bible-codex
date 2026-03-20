"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { ChevronLeft, ChevronRight, BookOpen, X, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";
import { useMemo, useState, useEffect } from "react";

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

  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-undismiss if we enter a reading range, but NEVER auto-show the whole navigator.
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

  // Determine current liturgical context
  const { activeReading, isFar, activeIndex } = useMemo(() => {
    if (!liturgicalReadings.length) return { activeReading: null, isFar: true, activeIndex: -1 };
    
    // Find if we are currently looking at a reading (with 150 verse grace buffer)
    const index = liturgicalReadings.findIndex(r => {
      const first = r.orders[0];
      const last = r.orders[r.orders.length - 1];
      if (first === undefined || last === undefined) return false;
      return currentOrder >= first - 150 && currentOrder <= last + 150;
    });
    
    if (index !== -1) {
      return { 
        activeReading: liturgicalReadings[index], 
        isFar: false, 
        activeIndex: index 
      };
    }

    // Default to first reading if far away
    return { 
      activeReading: liturgicalReadings[0] ?? null, 
      isFar: true, 
      activeIndex: 0 
    };
  }, [liturgicalReadings, currentOrder]);

  // COMPLETELY HIDE if the feature isn't "on"
  if (!isNavigatorVisible || !liturgicalReadings.length || !activeReading) {
    return null;
  }

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < liturgicalReadings.length - 1;

  const handlePrev = () => {
    const prevReading = liturgicalReadings[activeIndex - 1];
    if (prevReading?.orders[0] !== undefined) {
      setScrollToOrder(prevReading.orders[0]);
    }
  };

  const handleNext = () => {
    const nextReading = liturgicalReadings[activeIndex + 1];
    if (nextReading?.orders[0] !== undefined) {
      setScrollToOrder(nextReading.orders[0]);
    }
  };

  const handleJumpToStart = () => {
    const firstOrder = liturgicalReadings[0]?.orders[0];
    if (firstOrder !== undefined) {
      setScrollToOrder(firstOrder);
      setIsDismissed(false);
    }
  };

  // 1. MINIMIZED STATE (Sparkle)
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

  // 2. MAIN NAVIGATOR
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className={cn(
        "bg-white/95 dark:bg-zinc-900/95 border rounded-full shadow-[0_8px_48px_-12px_rgba(var(--primary-rgb),0.5)] p-1.5 flex items-center gap-1 backdrop-blur-xl ring-1 ring-primary/10 transition-all duration-500",
        isFar ? "border-primary/40 pl-3 pr-2" : "border-primary/20 pr-2"
      )}>
        
        {isFar ? (
          /* JUMP BACK STATE */
          <div className="flex items-center gap-2">
            <button 
              onClick={handleJumpToStart}
              className="flex items-center gap-2 px-5 h-11 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Jump to Readings
            </button>
            <button 
              onClick={() => setIsDismissed(true)}
              className="flex items-center gap-2 px-3 h-11 rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
            >
              <X className="h-4 w-4 group-hover:rotate-90 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Minimize</span>
            </button>
          </div>
        ) : (
          /* ACTIVE NAVIGATION STATE */
          <>
            <button 
              onClick={() => setIsNavigatorVisible(false)}
              className="h-10 w-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all mr-1"
              title="Exit Daily Readings"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mr-2" />

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

            <div className="flex flex-col items-center px-4 min-w-[140px]">
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary/60 mb-0.5">
                Daily Reading
              </span>
              <div className="flex items-center gap-2">
                 <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                  {activeReading.type}
                </span>
              </div>
              <span className="text-[9px] font-medium text-zinc-500 italic line-clamp-1">
                {activeReading.citation}
              </span>
            </div>

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

            <div className="flex gap-1.5 px-3">
              {liturgicalReadings.map((r, i) => (
                <div 
                  key={r.type}
                  onClick={() => {
                    const firstOrder = r.orders[0];
                    if (firstOrder !== undefined) setScrollToOrder(firstOrder);
                  }}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all cursor-pointer hover:scale-150",
                    i === activeIndex ? "bg-primary w-4" : "bg-primary/20 hover:bg-primary/40"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
