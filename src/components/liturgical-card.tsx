"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { api } from "~/trpc/react";
import { BookOpen, Music, Scroll, Church, Loader2, AlertCircle, Calendar, Sparkles } from "lucide-react";
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

  const handleSelectReading = async (citation: string, type: string) => {
    if (!citation) return;
    const toastId = toast.loading(`Locating ${citation}...`);
    
    try {
      const parsed = parseCitation(citation);
      const highlightOrders = await utils.bible.resolveReadingHighlight.fetch({ translationSlug, citation });
      const order = await utils.bible.getVerseOrder.fetch({
        translationSlug,
        bookSlug: parsed.bookSlug,
        chapter: parsed.chapter,
        verse: parsed.verses[0] ?? 1
      });

      if (order !== null) {
        setHighlightedOrders(highlightOrders, { type, citation });
        setLiturgicalGuide({ ...parsed, citation, order });
        setScrollToOrder(order);
        toast.success(`${type} Locked`, { id: toastId });
        if (onClose) onClose();
      } else {
        toast.error(`Not found in ${translationSlug.toUpperCase()}`, { id: toastId });
      }
    } catch (e) {
      toast.error("Navigation error", { id: toastId });
    }
  };

  if (isLoading) return (
    <div className="glass rounded-3xl p-6 flex flex-col items-center justify-center min-w-[240px] aspect-square">
      <Loader2 className="h-5 w-5 animate-spin text-primary opacity-40" />
    </div>
  );

  if (error || !info) return (
    <div className="glass rounded-2xl p-4 text-center min-w-[240px]">
      <AlertCircle className="h-4 w-4 text-red-500 mx-auto mb-2" />
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Sync Error</span>
    </div>
  );

  const ReadingRow = ({ label, citation, icon: Icon, typeName }: { label: string, citation: string, icon: any, typeName: string }) => (
    <button 
      onClick={() => handleSelectReading(citation, typeName)}
      className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-primary/5 transition-all group active:scale-[0.97]"
    >
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Icon className="h-3.5 w-3.5 text-zinc-400 group-hover:text-primary" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-primary/60">{label}</span>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{citation}</span>
        </div>
      </div>
      <Sparkles className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
    </button>
  );

  return (
    <div className="glass rounded-[2rem] overflow-hidden min-w-[260px] animate-in zoom-in-95 duration-300 shadow-2xl">
      {/* Mini Header */}
      <div className={cn(
        "px-4 py-3 border-b border-white/10 flex items-center justify-between",
        info.color === "violet" && "bg-violet-500/10",
        info.color === "green" && "bg-green-500/10",
        info.color === "red" && "bg-red-500/10"
      )}>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={cn("h-1 w-1 rounded-full", 
              info.color === "green" && "bg-green-500",
              info.color === "violet" && "bg-violet-500",
              info.color === "red" && "bg-red-500",
              "bg-zinc-400"
            )} />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500">Mass Readings</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {info.day}
          </span>
        </div>
        <Calendar className="h-3.5 w-3.5 text-zinc-300" />
      </div>

      {/* Tighter List */}
      <div className="p-2 space-y-0.5">
        {info.readings.firstReading && <ReadingRow label="First" typeName="First Reading" citation={info.readings.firstReading} icon={Scroll} />}
        {info.readings.psalm && <ReadingRow label="Psalm" typeName="Responsorial Psalm" citation={info.readings.psalm} icon={Music} />}
        {info.readings.secondReading && <ReadingRow label="Second" typeName="Second Reading" citation={info.readings.secondReading} icon={Scroll} />}
        {info.readings.gospel && <ReadingRow label="Gospel" typeName="The Holy Gospel" citation={info.readings.gospel} icon={Church} />}
      </div>

      <div className="p-2 pt-0">
        <button 
          onClick={onClose}
          className="w-full h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[8px] uppercase tracking-[0.2em] hover:bg-primary dark:hover:bg-primary hover:text-white transition-all active:scale-[0.95]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
