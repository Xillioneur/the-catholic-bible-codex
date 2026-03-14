"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Scroll, Music, Church, ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { useReaderStore } from "~/hooks/use-reader-store";

interface DailyAllViewProps {
  info: any;
  onClose: () => void;
  onSelectReading: (type: string) => void;
}

export function DailyAllView({ info, onClose, onSelectReading }: DailyAllViewProps) {
  const [mounted, setMounted] = useState(false);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const content = (
    <div className="fixed inset-0 z-[999] flex flex-col bg-white dark:bg-zinc-950 animate-in fade-in duration-500 pointer-events-auto overflow-hidden">
      
      {/* 1. COMPACT HEADER */}
      <div className="w-full border-b border-zinc-100 dark:border-zinc-900/50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl z-30">
        <header className="max-w-5xl mx-auto px-6 py-5 md:py-8 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Liturgia Verbi</span>
              <div className="h-px w-6 bg-primary/20" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{info.season}</span>
            </div>
            <h1 className="text-xl md:text-3xl font-serif font-black italic text-zinc-900 dark:text-zinc-50 tracking-tight">
              {info.day}
            </h1>
          </div>
          <button 
            onClick={onClose}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all border border-zinc-100 dark:border-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
      </div>

      {/* 2. BALANCED SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto scrollbar-elegant py-10 md:py-16 bg-zinc-50/5 dark:bg-zinc-900/5">
        <div className="max-w-3xl mx-auto px-6 space-y-16 md:space-y-24">
          
          <ReadingSection 
            title="First Reading" 
            citation={info.readings.firstReading} 
            icon={Scroll}
            verses={liturgicalReadings.find(r => r.type === "First Reading")?.verses ?? []}
            onSelect={() => onSelectReading("First Reading")} 
          />
          
          {info.readings.psalm && (
            <ReadingSection 
              title="Responsorial Psalm" 
              citation={info.readings.psalm} 
              icon={Music}
              isPsalm
              verses={liturgicalReadings.find(r => r.type === "Responsorial Psalm")?.verses ?? []}
              onSelect={() => onSelectReading("Responsorial Psalm")} 
            />
          )}

          {info.readings.secondReading && (
            <ReadingSection 
              title="Second Reading" 
              citation={info.readings.secondReading} 
              icon={Scroll}
              verses={liturgicalReadings.find(r => r.type === "Second Reading")?.verses ?? []}
              onSelect={() => onSelectReading("Second Reading")} 
            />
          )}
          
          {info.readings.gospel && (
            <ReadingSection 
              title="The Holy Gospel" 
              citation={info.readings.gospel} 
              icon={Church} 
              highlight
              verses={liturgicalReadings.find(r => r.type === "The Holy Gospel")?.verses ?? []}
              onSelect={() => onSelectReading("The Holy Gospel")} 
            />
          )}

          <div className="h-12" />
        </div>
      </div>

      {/* 3. COMPACT FOOTER */}
      <div className="w-full border-t border-zinc-100 dark:border-zinc-900/50 bg-white dark:bg-zinc-950 p-6 flex justify-center z-30">
        <button 
          onClick={onClose}
          className="px-12 py-3 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[10px] uppercase tracking-[0.3em] shadow-lg active:scale-95 transition-all hover:scale-105"
        >
          Return to Sanctuary
        </button>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

function ReadingSection({ title, citation, icon: Icon, highlight, isPsalm, verses, onSelect }: { 
  title: string, 
  citation: string, 
  icon: any, 
  highlight?: boolean, 
  isPsalm?: boolean,
  verses: any[],
  onSelect: () => void 
}) {
  if (!citation) return null;

  const verseSegments = useMemo(() => {
    if (verses.length === 0) return [];
    const sorted = [...verses].sort((a, b) => a.globalOrder - b.globalOrder);
    const segments: any[][] = [];
    let currentSegment: any[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.globalOrder !== prev.globalOrder + 1) {
        segments.push(currentSegment);
        currentSegment = [curr];
      } else {
        currentSegment.push(curr);
      }
    }
    segments.push(currentSegment);
    return segments;
  }, [verses]);

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in slide-in-from-bottom-4 duration-700">
      
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500",
            highlight ? "bg-primary text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", highlight ? "text-primary" : "text-zinc-400")}>
              {title}
            </span>
            <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest">Scripture Lesson</span>
          </div>
        </div>
        <button 
          onClick={onSelect} 
          className="px-4 py-1.5 rounded-lg bg-primary/5 text-[8px] font-black text-primary hover:bg-primary/10 transition-all uppercase tracking-[0.2em]"
        >
          Jump to Reader
        </button>
      </div>
      
      {/* SCRIPTURE CONTENT */}
      <div className="max-w-4xl">
        <h3 className="text-2xl md:text-3xl font-serif font-black italic text-zinc-900 dark:text-zinc-100 mb-6 tracking-tight leading-tight group-hover:text-primary transition-colors duration-700">
          {citation}
        </h3>
        
        {verseSegments.length > 0 ? (
          <div className={cn(
            "font-serif text-base md:text-xl leading-[1.7] text-zinc-800 dark:text-zinc-200",
            isPsalm && "italic text-center max-w-2xl mx-auto space-y-4"
          )}>
            {verseSegments.map((segment, sIdx) => (
              <div key={sIdx} className={cn("relative", sIdx > 0 && "pt-8 mt-8 border-t border-zinc-100 dark:border-zinc-900")}>
                {sIdx > 0 && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 bg-white dark:bg-zinc-950 text-[9px] font-black uppercase tracking-[0.5em] text-zinc-300">
                    Omitted
                  </div>
                )}
                {segment.map((v) => (
                  <span key={v.id} className={cn("inline mr-2", isPsalm && "block mb-2 last:mb-0")}>
                    <sup className="text-[0.6em] text-zinc-400 mr-1.5 tabular-nums font-sans">{v.verse}</sup>
                    {v.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center gap-3 text-zinc-300">
            <div className="h-1 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Hydrating</span>
          </div>
        )}
      </div>
    </div>
  );
}
