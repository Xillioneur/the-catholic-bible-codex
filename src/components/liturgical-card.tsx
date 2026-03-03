"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { api } from "~/trpc/react";
import { BookOpen } from "lucide-react";
import { useLiturgical } from "./liturgical-provider";
import { parseCitation } from "~/lib/liturgical";

export function LiturgicalCard() {
  const setStartOrder = useReaderStore((state) => state.setStartOrder);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const info = useLiturgical();
  
  const utils = api.useUtils();

  const handleEnterWord = async (citation: string) => {
    const { bookSlug, chapter, verse } = parseCitation(citation);
    const order = await utils.bible.getVerseOrder.fetch({
      translationSlug,
      bookSlug,
      chapter,
      verse
    });
    if (order !== null) {
      setStartOrder(order);
      setScrollToOrder(order);
    }
  };

  return (
    <div className="rounded-[1.5rem] border border-white/40 bg-white/40 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-3xl dark:border-zinc-800/40 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
            Daily Liturgy
          </h2>
          <span className="text-[9px] font-bold text-zinc-400 mt-0.5 truncate max-w-[180px]">
            {info.day}
          </span>
        </div>
        <div className="h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
      </div>
      
      <div className="space-y-4">
        {info.readings.firstReading && (
          <div className="group cursor-pointer" onClick={() => handleEnterWord(info.readings.firstReading!)}>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors text-left text-ellipsis overflow-hidden">First Reading</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 group-hover:translate-x-1 transition-transform">{info.readings.firstReading}</p>
              <BookOpen className="h-3 w-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}
        
        <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50" />
        
        {info.readings.gospel && (
          <div className="group cursor-pointer" onClick={() => handleEnterWord(info.readings.gospel!)}>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors text-left text-ellipsis overflow-hidden">The Holy Gospel</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 group-hover:translate-x-1 transition-transform">{info.readings.gospel}</p>
              <BookOpen className="h-3 w-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => info.readings.gospel && handleEnterWord(info.readings.gospel)}
        className="mt-6 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Enter the Word
      </button>
    </div>
  );
}
