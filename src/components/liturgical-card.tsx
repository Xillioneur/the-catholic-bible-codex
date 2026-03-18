"use client";

import { useState } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { Scroll, Music, Church, Loader2, AlertCircle, Calendar, ChevronRight } from "lucide-react";
import { useLiturgical } from "./liturgical-provider";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { DailyAllView } from "./liturgical-full-view";

interface LiturgicalCardProps {
  onClose: () => void;
}

export function LiturgicalCard({ onClose }: LiturgicalCardProps) {
  const { info, isLoading, error } = useLiturgical();
  const [showFullView, setShowFullView] = useState(false);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const setIsNavigatorVisible = useReaderStore((state) => state.setIsNavigatorVisible);

  const handleSelectReading = (type: string) => {
    const reading = liturgicalReadings.find(r => r.type === type);
    if (reading && reading.orders.length > 0) {
      const firstOrder = reading.orders[0];
      if (firstOrder) {
        setScrollToOrder(firstOrder);
        setIsNavigatorVisible(true);
        toast.success(`${type} Focused`);
        onClose();
      }
    } else {
      toast.error("Reading not found");
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
        <ChevronRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
      </button>
    );
  };

  return (
    <>
      <div className="glass rounded-[2rem] overflow-hidden min-w-[280px] animate-in zoom-in-95 duration-300 shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className={cn(
          "px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between",
          info.color === "violet" && "bg-violet-500/5"
        )}>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Daily bread</span>
            </div>
            <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight line-clamp-1 max-w-[180px]">
              {info.day}
            </span>
          </div>
          <Calendar className="h-4 w-4 text-primary opacity-20" />
        </div>

        <div className="p-2 space-y-0.5">
          {info.readings.firstReading && <ReadingRow label="First Reading" typeName="First Reading" citation={info.readings.firstReading} icon={Scroll} />}
          {info.readings.psalm && <ReadingRow label="The Psalm" typeName="Responsorial Psalm" citation={info.readings.psalm} icon={Music} />}
          {info.readings.secondReading && <ReadingRow label="Second Reading" typeName="Second Reading" citation={info.readings.secondReading} icon={Scroll} />}
          {info.readings.gospel && <ReadingRow label="Holy Gospel" typeName="The Holy Gospel" citation={info.readings.gospel} icon={Church} />}
        </div>

        <div className="p-3 pt-1 flex flex-col gap-2">
          <button 
            onClick={() => setShowFullView(true)}
            className="w-full h-10 rounded-xl bg-primary text-white font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            View All Readings
          </button>
          <button 
            onClick={onClose}
            className="w-full h-8 rounded-xl text-zinc-400 font-black text-[8px] uppercase tracking-[0.2em] hover:text-zinc-900 dark:hover:text-white transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>

      {showFullView && (
        <DailyAllView 
          info={info} 
          onClose={() => setShowFullView(false)} 
          onSelectReading={handleSelectReading} 
        />
      )}
    </>
  );
}
