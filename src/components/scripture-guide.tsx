"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { X, Crosshair, Zap, Navigation, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { useState } from "react";

interface ScriptureGuideProps {
  currentOrder: number;
}

export function ScriptureGuide({ currentOrder }: ScriptureGuideProps) {
  const liturgicalGuide = useReaderStore((state) => state.liturgicalGuide);
  const setLiturgicalGuide = useReaderStore((state) => state.setLiturgicalGuide);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  
  const [isWarping, setIsWarping] = useState(false);
  
  if (!liturgicalGuide) return null;

  const diff = liturgicalGuide.order - currentOrder;
  const absDiff = Math.abs(diff);
  const isAbove = diff < 0;
  const isHere = absDiff <= 1; 

  const handleWarp = () => {
    setIsWarping(true);
    setScrollToOrder(liturgicalGuide.order);
    setTimeout(() => setIsWarping(false), 1000);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-liturgical rounded-full shadow-liturgical p-1.5 flex items-center gap-1">
        {/* Compact Close */}
        <button 
          onClick={() => setLiturgicalGuide(null)}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
        >
          <X className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
        </button>

        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Info Area */}
        <div className="flex items-center gap-3 px-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/70 leading-none mb-1">
              Guide
            </span>
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50 leading-none">
              {liturgicalGuide.citation}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
            <Navigation className={cn("h-2.5 w-2.5", isHere ? "text-green-500" : "text-primary")} />
            <span className="text-[10px] font-black tabular-nums text-zinc-600 dark:text-zinc-400">
              {isHere ? "0" : absDiff.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Warp Action */}
        <button 
          onClick={handleWarp}
          disabled={isHere || isWarping}
          className={cn(
            "flex items-center gap-2 px-4 h-9 rounded-full font-black text-[9px] uppercase tracking-[0.15em] transition-all",
            isHere 
              ? "bg-green-500/10 text-green-600 dark:text-green-400 cursor-default" 
              : isWarping
                ? "bg-primary text-white animate-pulse"
                : "bg-primary text-white hover:shadow-lg active:scale-95"
          )}
        >
          {isHere ? (
            <>
              <Crosshair className="h-3 w-3" />
              Arrived
            </>
          ) : (
            <>
              {isAbove ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              Warp {isAbove ? "Up" : "Down"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
