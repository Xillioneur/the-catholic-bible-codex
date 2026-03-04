"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { api } from "~/trpc/react";
import { BookOpen, Music, Scroll, Church, Loader2, AlertCircle, Calendar } from "lucide-react";
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
  const setHighlightedOrders = useReaderStore((state) => state.setHighlightedOrders);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  
  const utils = api.useUtils();

  const handleSelectReading = async (citation: string) => {
    if (!citation) return;
    const toastId = toast.loading(`Resolving ${citation}...`);
    
    try {
      const parsed = parseCitation(citation);
      
      // 1. Resolve absolute highlights from server (future-proof)
      const highlightOrders = await utils.bible.resolveReadingHighlight.fetch({
        translationSlug,
        citation
      });

      // 2. Resolve first verse order for navigation
      const order = await utils.bible.getVerseOrder.fetch({
        translationSlug,
        bookSlug: parsed.bookSlug,
        chapter: parsed.chapter,
        verse: parsed.verses[0] ?? 1
      });

      if (order !== null) {
        setHighlightedOrders(highlightOrders);
        setLiturgicalGuide({ ...parsed, citation, order });
        setScrollToOrder(order);
        toast.success(`Target Locked`, { id: toastId });
        if (onClose) onClose();
      } else {
        toast.error(`Not found in current translation`, { id: toastId });
      }
    } catch (e) {
      toast.error("Navigation error", { id: toastId });
    }
  };

  if (isLoading) return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 flex flex-col items-center min-w-[320px]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  if (error || !info) return (
    <div className="rounded-2xl border border-red-100 bg-white p-6 dark:bg-zinc-900 text-center min-w-[320px]">
      <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-2" />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Error Loading readings</span>
    </div>
  );

  const ReadingRow = ({ label, citation, icon: Icon }: { label: string, citation: string, icon: any }) => (
    <button 
      onClick={() => handleSelectReading(citation)}
      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 active:scale-[0.98]"
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-primary transition-colors flex items-center gap-1.5">
          <Icon className="h-2.5 w-2.5" />
          {label}
        </span>
        <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          {citation}
        </span>
      </div>
      <BookOpen className="h-3.5 w-3.5 text-zinc-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
    </button>
  );

  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden relative min-w-[320px]">
      <div className={cn(
        "px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900",
        info.color === "violet" && "bg-violet-50/50 dark:bg-violet-900/10",
        info.color === "green" && "bg-green-50/50 dark:bg-green-900/10"
      )}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            <div className={cn("h-1.5 w-1.5 rounded-full", 
              info.color === "green" && "bg-green-500",
              info.color === "violet" && "bg-violet-500",
              info.color === "white" && "bg-zinc-300",
              info.color === "red" && "bg-red-500",
              info.color === "gold" && "bg-amber-400"
            )} />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Liturgy</span>
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {info.season} • {info.day}
          </span>
        </div>
        <Calendar className="h-4 w-4 text-zinc-300" />
      </div>

      <div className="p-3 space-y-1">
        {info.readings.firstReading && <ReadingRow label="First" citation={info.readings.firstReading} icon={Scroll} />}
        {info.readings.psalm && <ReadingRow label="Psalm" citation={info.readings.psalm} icon={Music} />}
        {info.readings.secondReading && <ReadingRow label="Second" citation={info.readings.secondReading} icon={Scroll} />}
        {info.readings.gospel && <ReadingRow label="Gospel" citation={info.readings.gospel} icon={Church} />}
      </div>

      <div className="p-3 pt-0">
        <button 
          onClick={() => info.readings.gospel && handleSelectReading(info.readings.gospel)}
          className="w-full h-10 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 font-black text-[9px] uppercase tracking-[0.2em] hover:bg-primary dark:hover:bg-primary hover:text-white transition-all shadow-md active:scale-[0.97]"
        >
          Enter the Word
        </button>
      </div>
    </div>
  );
}
