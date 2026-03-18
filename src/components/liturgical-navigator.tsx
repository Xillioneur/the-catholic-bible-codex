"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { ChevronLeft, ChevronRight, BookOpen, X, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";
import { useMemo, useState, useEffect } from "react";

export function LiturgicalNavigator() {
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const currentOrder = useReaderStore((state) => state.currentOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const isNavigatorVisible = useReaderStore((state) => state.isNavigatorVisible);
  const setIsNavigatorVisible = useReaderStore((state) => state.setIsNavigatorVisible);

  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal/closed state ONLY if we are truly INSIDE a reading (0 buffer)
  useEffect(() => {
    const isInside = liturgicalReadings.some(r => 
      currentOrder >= r.orders[0] && currentOrder <= r.orders[r.orders.length - 1]
    );
    if (isInside) {
      if (isDismissed) setIsDismissed(false);
      if (!isNavigatorVisible) setIsNavigatorVisible(true);
    }
  }, [currentOrder, liturgicalReadings, isDismissed, isNavigatorVisible, setIsNavigatorVisible]);

  // Find which reading we are currently in or near
  const { activeReading, isFar } = useMemo(() => {
    if (!liturgicalReadings.length) return { activeReading: null, isFar: false };
    
    // 1. Find the reading that contains the currentOrder (with 150 verse buffer for navigator)
    const containing = liturgicalReadings.find(r => 
      currentOrder >= r.orders[0] - 150 && currentOrder <= r.orders[r.orders.length - 1] + 150
    );
    
    if (containing) return { activeReading: containing, isFar: false };

    // 2. We are far away from any reading today
    return { activeReading: liturgicalReadings[0], isFar: true };
  }, [liturgicalReadings, currentOrder]);

  if (!liturgicalReadings.length || !isNavigatorVisible) return null;

  const activeIndex = liturgicalReadings.findIndex(r => r.type === activeReading?.type);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < liturgicalReadings.length - 1;

  const handlePrev = () => {
    if (hasPrev) setScrollToOrder(liturgicalReadings[activeIndex - 1].orders[0]);
  };

  const handleNext = () => {
    if (hasNext) setScrollToOrder(liturgicalReadings[activeIndex + 1].orders[0]);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
  };

  const handleFullClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsNavigatorVisible(false);
  };

  // If dismissed, show a tiny floating spark instead (regardless of isFar)
  if (isDismissed) {
    return (
      <div className="fixed bottom-24 right-8 z-[100] flex items-center gap-2 animate-in fade-in zoom-in duration-500">
        <button 
          onClick={handleFullClose}
          className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 shadow-md transition-all hover:scale-110 active:scale-95 group"
        >
          <X className="h-3 w-3 group-hover:rotate-90 transition-transform" />
        </button>
        <button 
          onClick={() => { setIsDismissed(false); if (isFar) setScrollToOrder(liturgicalReadings[0].orders[0]); }}
          className="h-12 w-12 rounded-full bg-white dark:bg-zinc-900 border-2 border-primary/20 flex items-center justify-center text-primary shadow-2xl hover:scale-110 active:scale-95 transition-all group overflow-hidden relative"
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
        "bg-white/95 dark:bg-zinc-900/95 border rounded-full shadow-[0_8px_48px_-12px_rgba(var(--primary-rgb),0.5)] p-1.5 flex items-center gap-1 backdrop-blur-xl ring-1 ring-primary/10 transition-all duration-500",
        isFar ? "border-primary/40 pl-3 pr-2" : "border-primary/20 pr-2"
      )}>
        
        {isFar ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setScrollToOrder(liturgicalReadings[0].orders[0])}
              className="flex items-center gap-2 px-5 h-11 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Jump to Readings
            </button>
            <button 
              onClick={handleDismiss}
              className="flex items-center gap-2 px-3 h-11 rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
            >
              <X className="h-4 w-4 group-hover:rotate-90 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Dismiss</span>
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={handleDismiss}
              className="h-10 w-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all mr-1"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mr-2" />

            {/* Navigation - Prev */}
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

            <div className="h-6 w-px bg-primary/10 mx-1" />

            {/* Current Info */}
            <div className="flex flex-col items-center px-4 min-w-[140px]">
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary/60 mb-0.5">
                Now Reading
              </span>
              <div className="flex items-center gap-2">
                 <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                  {activeReading?.type}
                </span>
              </div>
              <span className="text-[9px] font-medium text-zinc-500 italic">
                {activeReading?.citation}
              </span>
            </div>

            <div className="h-6 w-px bg-primary/10 mx-1" />

            {/* Navigation - Next */}
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

            {/* Dots Indicator */}
            <div className="flex gap-1.5 px-3">
              {liturgicalReadings.map((r, i) => (
                <div 
                  key={r.type}
                  onClick={() => setScrollToOrder(r.orders[0])}
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
