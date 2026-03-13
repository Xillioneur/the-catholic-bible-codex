"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Scroll, Music, Church } from "lucide-react";
import { cn } from "~/lib/utils";
import { useReaderStore } from "~/hooks/use-reader-store";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

interface DailyAllViewProps {
  info: any;
  onClose: () => void;
  onSelectReading: (type: string) => void;
}

export function DailyAllView({ info, onClose, onSelectReading }: DailyAllViewProps) {
  const [mounted, setMounted] = useState(false);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const translationSlug = useReaderStore((state) => state.translationSlug);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const allOrders = useMemo(() => 
    liturgicalReadings.flatMap(r => r.orders), 
    [liturgicalReadings]
  );

  const verses = useLiveQuery(
    () => db.verses
      .where("translationId").equals(translationSlug)
      .and(v => allOrders.includes(v.globalOrder))
      .toArray(),
    [translationSlug, allOrders]
  ) ?? [];

  const content = (
    <div className="fixed inset-0 z-[999] flex flex-col bg-white dark:bg-zinc-950 animate-in fade-in duration-300 pointer-events-auto overflow-hidden">
      
      {/* HEADER */}
      <div className="w-full border-b border-zinc-100 dark:border-zinc-900/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-30">
        <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Daily Bread</span>
              <div className="h-px w-4 bg-primary/20" />
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{info.season}</span>
            </div>
            <h1 className="text-lg md:text-xl font-serif font-black italic text-zinc-900 dark:text-zinc-50">
              {info.day}
            </h1>
          </div>
          <button 
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all border border-zinc-100 dark:border-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto scrollbar-elegant py-10 md:py-16 bg-zinc-50/10 dark:bg-zinc-900/5">
        <div className="max-w-3xl mx-auto px-6 space-y-20 md:space-y-32">
          
          <ReadingSection 
            title="First Reading" 
            citation={info.readings.firstReading} 
            icon={Scroll}
            verses={verses.filter(v => liturgicalReadings.find(r => r.type === "First Reading")?.orders.includes(v.globalOrder))}
            onSelect={() => onSelectReading("First Reading")} 
          />
          
          {info.readings.psalm && (
            <ReadingSection 
              title="Responsorial Psalm" 
              citation={info.readings.psalm} 
              icon={Music}
              isPsalm
              verses={verses.filter(v => liturgicalReadings.find(r => r.type === "Responsorial Psalm")?.orders.includes(v.globalOrder))}
              onSelect={() => onSelectReading("Responsorial Psalm")} 
            />
          )}

          {info.readings.secondReading && (
            <ReadingSection 
              title="Second Reading" 
              citation={info.readings.secondReading} 
              icon={Scroll}
              verses={verses.filter(v => liturgicalReadings.find(r => r.type === "Second Reading")?.orders.includes(v.globalOrder))}
              onSelect={() => onSelectReading("Second Reading")} 
            />
          )}
          
          {info.readings.gospel && (
            <ReadingSection 
              title="The Holy Gospel" 
              citation={info.readings.gospel} 
              icon={Church} 
              highlight
              verses={verses.filter(v => liturgicalReadings.find(r => r.type === "The Holy Gospel")?.orders.includes(v.globalOrder))}
              onSelect={() => onSelectReading("The Holy Gospel")} 
            />
          )}

          <div className="h-24" />
        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full border-t border-zinc-100 dark:border-zinc-900/50 bg-white dark:bg-zinc-950 p-4 flex justify-center z-30">
        <button 
          onClick={onClose}
          className="px-10 py-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
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

  // Group verses by continuity to handle skipped verses
  const verseSegments = useMemo(() => {
    if (verses.length === 0) return [];
    const sorted = [...verses].sort((a, b) => a.globalOrder - b.globalOrder);
    const segments: any[][] = [];
    let currentSegment: any[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      // If globalOrder is not sequential, it's a skip
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
    <div className="flex flex-col gap-8 md:gap-10 animate-in slide-in-from-bottom-4 duration-700">
      
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-500",
            highlight ? "bg-primary text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", highlight ? "text-primary" : "text-zinc-400")}>{title}</span>
            <span className="text-sm font-serif font-black italic text-zinc-900 dark:text-zinc-100 tracking-tight">{citation}</span>
          </div>
        </div>
        <button onClick={onSelect} className="px-4 py-1.5 rounded-lg bg-primary/5 text-[8px] font-black text-primary hover:bg-primary/10 uppercase tracking-widest transition-colors">
          Jump to Reader
        </button>
      </div>
      
      {/* SCRIPTURE CONTENT */}
      <div className="space-y-8">
        {verseSegments.length > 0 ? (
          <div className={cn(
            "font-serif text-base md:text-lg leading-[1.8] text-zinc-800 dark:text-zinc-200",
            isPsalm && "italic text-center max-w-2xl mx-auto space-y-4"
          )}>
            {verseSegments.map((segment, sIdx) => (
              <div key={sIdx} className={cn("relative", sIdx > 0 && "pt-8 mt-8 border-t border-zinc-50 dark:border-zinc-900/50")}>
                {sIdx > 0 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 bg-white dark:bg-zinc-950 text-[10px] font-black uppercase tracking-[0.5em] text-zinc-300">
                    Omitted
                  </div>
                )}
                {segment.map((v, i) => (
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
            <span className="text-[10px] font-black uppercase tracking-widest">Hydrating the Word</span>
          </div>
        )}
      </div>
    </div>
  );
}
