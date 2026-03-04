"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { X, Crosshair, Zap, Navigation } from "lucide-react";
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

  // Fix: absolute globalOrder difference
  const diff = liturgicalGuide.order - currentOrder;
  const absDiff = Math.abs(diff);
  const isAbove = diff < 0;
  
  // Tighten threshold: 0-1 verse difference means we are exactly there
  const isHere = absDiff <= 1; 

  const handleWarp = () => {
    setIsWarping(true);
    setScrollToOrder(liturgicalGuide.order);
    
    // Reset warping state after animation
    setTimeout(() => {
      setIsWarping(false);
    }, 1500);
  };

  // Progress logic: closer to 0 means 100% progress
  const progress = Math.max(0, Math.min(100, 100 - (absDiff / 20 * 100)));

  return (
    <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right-10 duration-700">
      <div className="bg-zinc-950/90 border border-white/10 rounded-[3rem] shadow-2xl p-3 flex items-center gap-2 pr-8 backdrop-blur-2xl">
        <button 
          onClick={() => setLiturgicalGuide(null)}
          className="h-14 w-14 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors group"
        >
          <X className="h-6 w-6 text-zinc-500 group-hover:text-white" />
        </button>

        <div className="h-12 w-px bg-white/10 mx-2" />

        <div className="flex flex-col px-4 min-w-[180px]">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className={cn("h-3.5 w-3.5", isHere ? "text-green-500" : "text-blue-500")} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              {isHere ? "Target Locked" : "Distance Meter"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white tracking-tighter">
              {isHere ? "0" : absDiff.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {isHere ? "Verses Center" : `Verses ${isAbove ? "Above" : "Below"}`}
            </span>
          </div>
          
          {/* Progress Bar */}
          {!isHere && (
            <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <button 
          onClick={handleWarp}
          disabled={isHere || isWarping}
          className={cn(
            "flex items-center gap-4 px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.25em] transition-all min-w-[240px] justify-center relative overflow-hidden group",
            isHere 
              ? "bg-green-600 text-white shadow-lg shadow-green-500/30 cursor-default" 
              : isWarping
                ? "bg-blue-600 text-white"
                : "bg-white text-black hover:scale-105 active:scale-95"
          )}
        >
          {isWarping && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          )}
          
          {isHere ? (
            <>
              <Crosshair className="h-4 w-4" />
              Arrived at Reading
            </>
          ) : isWarping ? (
            "Initiating Warp..."
          ) : (
            <>
              <Zap className="h-4 w-4 fill-current" />
              Engage Warp {isAbove ? "Up" : "Down"}
            </>
          )}
        </button>
      </div>
      
      {/* Target Preview */}
      <div className="absolute -top-14 right-8 bg-blue-600 px-4 py-2 rounded-2xl shadow-xl animate-bounce">
        <span className="text-[10px] font-black text-white uppercase tracking-widest">
          {liturgicalGuide.citation}
        </span>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45" />
      </div>
    </div>
  );
}
