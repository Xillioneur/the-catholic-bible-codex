"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Scroll, Music, Church, Volume2, Play, Pause, Target } from "lucide-react";
import { cn } from "~/lib/utils";
import { useReaderStore } from "~/hooks/use-reader-store";
import { useVoiceover } from "~/hooks/use-voiceover";
import { VoiceoverControls } from "./voiceover-controls";

interface DailyAllViewProps {
  info: any;
  onClose: () => void;
  onSelectReading: (type: string) => void;
}

export function DailyAllView({ info, onClose, onSelectReading }: DailyAllViewProps) {
  const [mounted, setMounted] = useState(false);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const { jumpToOrder, togglePlay, isPlaying, playlist } = useVoiceover();
  const currentOrder = useReaderStore((state) => state.voiceoverCurrentOrder);
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // AUTO-SCROLL within the DailyAllView
  useEffect(() => {
    if (isPlaying && isFollowEnabled && currentOrder) {
      const activeEl = document.querySelector(`[data-liturgical-order="${currentOrder}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentOrder, isPlaying, isFollowEnabled]);

  const allOrders = useMemo(() => {
    return liturgicalReadings.flatMap(r => r.orders).sort((a, b) => a - b);
  }, [liturgicalReadings]);

  const isReadingAll = isPlaying && playlist?.length === allOrders.length && playlist[0] === allOrders[0];

  const handleReadAll = () => {
    if (isReadingAll) {
      togglePlay();
    } else {
      if (allOrders.length > 0) {
        jumpToOrder(allOrders[0], allOrders);
      }
    }
  };

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
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReadAll}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95",
                isReadingAll 
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-primary hover:border-primary/20"
              )}
            >
              {isReadingAll ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isReadingAll ? "Playing" : "Read All"}
              </span>
            </button>

            <button 
              onClick={onClose}
              className="h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all border border-zinc-100 dark:border-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
      </div>

      {/* EXPANSIVE BODY */}
      <div className="flex-1 overflow-y-auto scrollbar-elegant py-8 md:py-12 bg-zinc-50/10 dark:bg-zinc-900/5">
        <div className="max-w-3xl mx-auto px-6 space-y-12 md:space-y-20">
          
          <ReadingSection 
            title="First Reading" 
            citation={info.readings.firstReading} 
            icon={Scroll}
            orders={liturgicalReadings.find(r => r.type === "First Reading")?.orders ?? []}
            verses={liturgicalReadings.find(r => r.type === "First Reading")?.verses ?? []}
            onSelect={() => { onSelectReading("First Reading"); onClose(); }} 
          />
          
          {info.readings.psalm && (
            <ReadingSection 
              title="Responsorial Psalm" 
              citation={info.readings.psalm} 
              icon={Music}
              isPsalm
              orders={liturgicalReadings.find(r => r.type === "Responsorial Psalm")?.orders ?? []}
              verses={liturgicalReadings.find(r => r.type === "Responsorial Psalm")?.verses ?? []}
              onSelect={() => { onSelectReading("Responsorial Psalm"); onClose(); }} 
            />
          )}

          {info.readings.secondReading && (
            <ReadingSection 
              title="Second Reading" 
              citation={info.readings.secondReading} 
              icon={Scroll}
              orders={liturgicalReadings.find(r => r.type === "Second Reading")?.orders ?? []}
              verses={liturgicalReadings.find(r => r.type === "Second Reading")?.verses ?? []}
              onSelect={() => { onSelectReading("Second Reading"); onClose(); }} 
            />
          )}
          
          {info.readings.gospel && (
            <ReadingSection 
              title="The Holy Gospel" 
              citation={info.readings.gospel} 
              icon={Church} 
              highlight
              orders={liturgicalReadings.find(r => r.type === "The Holy Gospel")?.orders ?? []}
              verses={liturgicalReadings.find(r => r.type === "The Holy Gospel")?.verses ?? []}
              onSelect={() => { onSelectReading("The Holy Gospel"); onClose(); }} 
            />
          )}

          <div className="h-24" />
        </div>
      </div>

      {/* ULTRA-LEAN FLOATING FOOTER */}
      <div className="absolute bottom-6 left-0 right-0 z-40 px-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <VoiceoverControls />
          <button 
            onClick={() => {
              if (currentOrder) {
                const activeEl = document.querySelector(`[data-liturgical-order="${currentOrder}"]`);
                if (activeEl) {
                  activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }
            }}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-primary shadow-xl transition-all active:scale-95"
          >
            <Target className="h-4 w-4" />
          </button>
        </div>

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

function ReadingSection({ title, citation, icon: Icon, highlight, isPsalm, verses, orders, onSelect }: { 
  title: string, 
  citation: string, 
  icon: any, 
  highlight?: boolean, 
  isPsalm?: boolean,
  verses: any[],
  orders: number[],
  onSelect: () => void 
}) {
  if (!citation) return null;

  const { jumpToOrder, togglePlay, isPlaying, playlist } = useVoiceover();
  const currentOrder = useReaderStore((state) => state.voiceoverCurrentOrder);

  const isPlayingThisSection = isPlaying && playlist?.some(o => orders.includes(o));
  const isCurrentlyInThisSection = orders.includes(currentOrder ?? -1);

  const handleToggleSection = () => {
    if (isPlayingThisSection) {
      togglePlay();
    } else {
      if (orders.length > 0) {
        jumpToOrder(orders[0], orders);
      }
    }
  };

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
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleSection}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all active:scale-95 border",
              isPlayingThisSection 
                ? "bg-primary/10 border-primary text-primary" 
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-primary hover:border-primary/20"
            )}
          >
            {isPlayingThisSection ? <Pause className="h-2.5 w-2.5 fill-current" /> : <Play className="h-2.5 w-2.5 fill-current" />}
            <span className="text-[8px] font-black uppercase tracking-widest">
              {isPlayingThisSection ? "Pause" : "Listen"}
            </span>
          </button>
          <div className="w-px h-3 bg-zinc-100 dark:bg-zinc-800" />
          <button onClick={onSelect} className="text-[8px] font-black text-zinc-400 hover:text-primary uppercase tracking-widest transition-all">
            Reader
          </button>
        </div>
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
                  <span 
                    key={v.id} 
                    data-liturgical-order={v.globalOrder}
                    className={cn(
                      "inline mr-1.5 transition-all duration-500 rounded px-0.5", 
                      isPsalm && "block mb-1.5 last:mb-0",
                      currentOrder === v.globalOrder && "bg-primary/10 ring-1 ring-primary/20 text-primary"
                    )}
                  >
                    <sup className={cn(
                      "text-[0.6em] mr-1 tabular-nums font-sans",
                      currentOrder === v.globalOrder ? "text-primary" : "text-zinc-400"
                    )}>{v.verse}</sup>
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
