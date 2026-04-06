"use client";

import { useState, useCallback } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { Scroll, Music, Church, Loader2, AlertCircle, Calendar, ChevronRight, Volume2 } from "lucide-react";
import { useLiturgical } from "./liturgical-provider";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { DailyAllView } from "./liturgical-full-view";
import { useVoiceover } from "~/hooks/use-voiceover";

interface LiturgicalCardProps {
  onClose: () => void;
}

export function LiturgicalCard({ onClose }: LiturgicalCardProps) {
  const { info, isLoading, error } = useLiturgical();
  const [showFullView, setShowFullView] = useState(false);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const setIsNavigatorVisible = useReaderStore((state) => state.setIsNavigatorVisible);
  const { jumpToOrder } = useVoiceover();

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

  const handleListenAll = useCallback(() => {
    const allOrders = liturgicalReadings.flatMap(r => r.orders).sort((a, b) => a - b);
    if (allOrders.length > 0) {
      jumpToOrder(allOrders[0], allOrders);
      toast.success("Daily Bread: Voiceover Started");
      onClose();
    } else {
      toast.error("Readings not yet loaded");
    }
  }, [liturgicalReadings, jumpToOrder, onClose]);

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
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight line-clamp-1">
              {label === "Sequence" ? "Victimae Paschali Laudes" : citation}
            </span>
          </div>
        </div>
        <ChevronRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
      </button>
    );
  };

  return (
    <>
      <div className="glass rounded-[2rem] overflow-hidden min-w-[300px] animate-in zoom-in-95 duration-300 shadow-2xl border-none ring-1 ring-primary/20">
        <div className="px-6 py-5 border-b border-primary/5 bg-primary/[0.03] flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/70">Sanctuary Today</span>
            </div>
            <span className="text-sm font-serif font-bold italic text-zinc-900 dark:text-zinc-100 tracking-tight line-clamp-1">
              {info.day}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]")} style={{ backgroundColor: "var(--primary)" }} />
          </div>
        </div>

        <div className="p-2 space-y-0.5">
          {info.readings.firstReading && <ReadingRow label="First Reading" typeName="First Reading" citation={info.readings.firstReading} icon={Scroll} />}
          {info.readings.psalm && <ReadingRow label="The Psalm" typeName="Responsorial Psalm" citation={info.readings.psalm} icon={Music} />}
          {info.readings.secondReading && <ReadingRow label="Second Reading" typeName="Second Reading" citation={info.readings.secondReading} icon={Scroll} />}
          {info.readings.sequence && <ReadingRow label="Sequence" typeName="Sequence" citation={info.readings.sequence} icon={Scroll} />}
          {(info.readings.alleluia || info.readings.verseBeforeGospel) && <ReadingRow label="Alleluia" typeName="Alleluia" citation={info.readings.alleluia || info.readings.verseBeforeGospel} icon={Music} />}
          {info.readings.gospel && <ReadingRow label="Holy Gospel" typeName="The Holy Gospel" citation={info.readings.gospel} icon={Church} />}
        </div>

        <div className="p-3 pt-1 flex flex-col gap-2">
          <button 
            onClick={handleListenAll}
            className="w-full h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black text-[8px] uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Listen to All
          </button>
          <button 
            onClick={() => setShowFullView(true)}
            className="w-full h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[8px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
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
