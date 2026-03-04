"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { api } from "~/trpc/react";
import { BookOpen, Music, Scroll, Church, Loader2, AlertCircle } from "lucide-react";
import { useLiturgical } from "./liturgical-provider";
import { parseCitation } from "~/lib/liturgical";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

interface LiturgicalCardProps {
  onClose?: () => void;
}

export function LiturgicalCard({ onClose }: LiturgicalCardProps) {
  const { info, isLoading, error } = useLiturgical();
  const setLiturgicalGuide = useReaderStore((state) => state.setLiturgicalGuide);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const liturgicalGuide = useReaderStore((state) => state.liturgicalGuide);
  
  const utils = api.useUtils();

  const handleSelectReading = async (citation: string) => {
    if (!citation) return;
    
    const toastId = toast.loading(`Locating ${citation}...`);
    
    try {
      const parsed = parseCitation(citation);
      const { bookSlug, chapter, verses } = parsed;
      
      const order = await utils.bible.getVerseOrder.fetch({
        translationSlug,
        bookSlug,
        chapter,
        verse: verses[0] ?? 1
      });

      if (order !== null) {
        setLiturgicalGuide({
          citation,
          bookSlug,
          chapter,
          verses,
          order
        });
        
        // Use the new standard navigation: setScrollToOrder
        // BibleReader will detect this and scroll its virtualizer
        setScrollToOrder(order);
        
        toast.success(`Found ${citation}`, { id: toastId });
        if (onClose) onClose();
      } else {
        toast.error(`Could not find ${citation}`, { id: toastId });
      }
    } catch (e) {
      console.error("[Liturgical] handleSelectReading error:", e);
      toast.error("An error occurred while finding the reading", { id: toastId });
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 min-w-[340px] flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Loading Daily Readings</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="rounded-[2rem] border border-red-100 bg-white p-10 shadow-2xl dark:border-red-900/20 dark:bg-zinc-900 min-w-[340px] flex flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-bold">Readings Unavailable</p>
      </div>
    );
  }

  const ReadingItem = ({ label, citation, icon: Icon }: { label: string, citation: string, icon: any }) => {
    const isActive = liturgicalGuide?.citation === citation;
    return (
      <button 
        className={cn(
          "w-full group flex flex-col p-4 rounded-2xl transition-all duration-200 border text-left",
          isActive 
            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
            : "border-transparent hover:border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.98]"
        )} 
        onClick={() => handleSelectReading(citation)}
      >
        <div className="flex items-center justify-between w-full mb-1">
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors",
            isActive ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-600"
          )}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
          {isActive && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />}
        </div>
        <span className="text-base font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
          {citation}
        </span>
      </button>
    );
  };

  return (
    <div className="rounded-[2.5rem] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden relative min-w-[360px] flex flex-col">
      <div className={cn(
        "h-2 w-full",
        info.color === "green" && "bg-green-500",
        info.color === "violet" && "bg-violet-500",
        info.color === "white" && "bg-zinc-200",
        info.color === "red" && "bg-red-500",
        info.color === "gold" && "bg-amber-400"
      )} />

      <div className="p-8">
        <div className="flex flex-col mb-8 text-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-2">Daily Liturgy</h2>
          <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">{todayStr}</h3>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">
            {info.season} • {info.day}
          </p>
        </div>
        
        <div className="space-y-2">
          {info.readings.firstReading && (
            <ReadingItem label="First Reading" citation={info.readings.firstReading} icon={Scroll} />
          )}
          {info.readings.psalm && (
            <ReadingItem label="Responsorial Psalm" citation={info.readings.psalm} icon={Music} />
          )}
          {info.readings.secondReading && (
            <ReadingItem label="Second Reading" citation={info.readings.secondReading} icon={Scroll} />
          )}
          {info.readings.gospel && (
            <ReadingItem label="The Holy Gospel" citation={info.readings.gospel} icon={Church} />
          )}
        </div>

        <p className="text-[9px] font-bold text-zinc-400 text-center mt-6 uppercase tracking-widest leading-relaxed">
          Select a reading to pin it as a guide<br/>in the Bible view
        </p>
      </div>
    </div>
  );
}
