"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { BookOpen, Music, Scroll, Church, Loader2, AlertCircle, Calendar, Sparkles } from "lucide-react";
import { useLiturgical } from "./liturgical-provider";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

interface LiturgicalCardProps {
  onClose?: () => void;
}

export function LiturgicalCard({ onClose }: LiturgicalCardProps) {
  const { info, isLoading, error } = useLiturgical();
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);

  const handleSelectReading = (type: string) => {
    // Advanced: Use the already resolved readings in the store
    const reading = liturgicalReadings.find(r => r.type === type);
    
    if (reading && reading.orders.length > 0) {
      const firstOrder = reading.orders[0];
      if (firstOrder) {
        setScrollToOrder(firstOrder);
        toast.success(`${type} Focused`);
        if (onClose) onClose();
      }
    } else {
      toast.error("Reading not found in this translation");
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

  const ReadingRow = ({ label, citation, icon: Icon, typeName }: { label: string, citation: string, icon: any, typeName: string }) => {
    const isResolved = liturgicalReadings.some(r => r.type === typeName);
    
    return (
      <button 
        onClick={() => handleSelectReading(typeName)}
        disabled={!isResolved}
        className={cn(
          "w-full flex items-center justify-between py-2 px-3 rounded-xl transition-all group active:scale-[0.97]",
          isResolved ? "hover:bg-primary/5" : "opacity-40 grayscale cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Icon className="h-3.5 w-3.5 text-zinc-400 group-hover:text-primary" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-primary/60">{label}</span>
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight line-clamp-1">{citation}</span>
          </div>
        </div>
        {isResolved && <Sparkles className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />}
      </button>
    );
  };

  return (
    <div className="glass rounded-[2rem] overflow-hidden min-w-[260px] animate-in zoom-in-95 duration-300 shadow-2xl border border-zinc-200 dark:border-zinc-800">
      {/* Mini Header */}
      <div className={cn(
        "px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between",
        info.color === "violet" && "bg-violet-500/5",
        info.color === "green" && "bg-green-500/5",
        info.color === "red" && "bg-red-500/5"
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

      {/* Reading List */}
      <div className="p-2 space-y-0.5">
        {info.readings.firstReading && <ReadingRow label="First" typeName="First Reading" citation={info.readings.firstReading} icon={Scroll} />}
        {info.readings.psalm && <ReadingRow label="Psalm" typeName="Responsorial Psalm" citation={info.readings.psalm} icon={Music} />}
        {info.readings.secondReading && <ReadingRow label="Second" typeName="Second Reading" citation={info.readings.secondReading} icon={Scroll} />}
        {info.readings.gospel && <ReadingRow label="Gospel" typeName="The Holy Gospel" citation={info.readings.gospel} icon={Church} />}
      </div>

      <div className="p-2 pt-0">
        <button 
          onClick={onClose}
          className="w-full h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[8px] uppercase tracking-[0.2em] hover:bg-primary dark:hover:bg-primary hover:text-white transition-all"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
