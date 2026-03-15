"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Scroll, Music, Church } from "lucide-react";
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
    <div className="fixed inset-0 z-[999] flex flex-col bg-white dark:bg-zinc-950 animate-in fade-in duration-300 pointer-events-auto overflow-hidden">
      
      {/* ULTRA-COMPACT HEADER */}
      <div className="w-full border-b border-zinc-100 dark:border-zinc-900/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-30">
        <header className="max-w-5xl mx-auto px-6 py-4 md:py-6 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Daily Bread</span>
              <div className="h-px w-3 bg-primary/20" />
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{info.season}</span>
            </div>
            <h1 className="text-base md:text-xl font-serif font-black italic text-zinc-900 dark:text-zinc-50 tracking-tight truncate max-w-[240px] md:max-w-none">
              {info.day}
            </h1>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all border border-zinc-100 dark:border-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
      </div>

      {/* EXPANSIVE BODY */}
      <div className="flex-1 overflow-y-auto scrollbar-elegant py-8 md:py-12 bg-zinc-50/10 dark:bg-zinc-900/5">
        <div className="max-w-3xl mx-auto px-6 space-y-12 md:space-y-20">
          
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

          <div className="h-24" />
        </div>
      </div>

      {/* ULTRA-LEAN FLOATING FOOTER */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <button 
          onClick={onClose}
          className="px-8 py-2.5 rounded-full bg-primary text-white font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 active:scale-95 transition-all hover:scale-[1.02] pointer-events-auto border border-white/20"
        >
          Close
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
    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-500",
            highlight ? "bg-primary text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", highlight ? "text-primary" : "text-zinc-400")}>{title}</span>
            <span className="text-[11px] font-serif font-black italic text-zinc-900 dark:text-zinc-100 tracking-tight">{citation}</span>
          </div>
        </div>
        <button onClick={onSelect} className="text-[8px] font-black text-primary hover:underline uppercase tracking-widest transition-all">
          Reader
        </button>
      </div>
      
      <div className="space-y-6">
        {verseSegments.length > 0 ? (
          <div className={cn(
            "font-serif text-base md:text-lg leading-[1.7] text-zinc-800 dark:text-zinc-200",
            isPsalm && "italic text-center max-w-xl mx-auto"
          )}>
            {verseSegments.map((segment, sIdx) => (
              <div key={sIdx} className={cn("relative", sIdx > 0 && "pt-6 mt-6 border-t border-zinc-50 dark:border-zinc-900/50")}>
                {sIdx > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 bg-white dark:bg-zinc-950 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-300">
                    Omitted
                  </div>
                )}
                {segment.map((v) => (
                  <span key={v.id} className={cn("inline mr-1.5", isPsalm && "block mb-1.5 last:mb-0")}>
                    <sup className="text-[0.6em] text-zinc-400 mr-1 tabular-nums font-sans">{v.verse}</sup>
                    {v.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-3 text-zinc-300">
            <div className="h-1 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest">Hydrating</span>
          </div>
        )}
      </div>
    </div>
  );
}
