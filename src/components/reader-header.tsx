"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { LiturgicalCard } from "./liturgical-card";
import { CalendarDays, ChevronDown, Search, Volume2 } from "lucide-react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";

export function ReaderHeader() {
  const { data: books } = api.bible.getBooks.useQuery();
  const { data: translations } = api.bible.getTranslations.useQuery();
  const [showDaily, setShowDaily] = useState(false);

  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setTranslationSlug = useReaderStore((state) => state.setTranslationSlug);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const currentBookId = useReaderStore((state) => state.currentBookId);
  const currentChapter = useReaderStore((state) => state.currentChapter);
  const setIsSearchOpen = useReaderStore((state) => state.setIsSearchOpen);
  
  const isVoiceoverPlaying = useReaderStore((state) => state.isVoiceoverPlaying);
  const setIsVoiceoverPlaying = useReaderStore((state) => state.setIsVoiceoverPlaying);

  const utils = api.useUtils();

  const handleBookChange = async (bookSlug: string) => {
    if (!bookSlug) return;
    setShowDaily(false);
    const order = await utils.bible.getVerseOrder.fetch({
      translationSlug,
      bookSlug,
    });
    if (order !== null) {
      setScrollToOrder(order);
    }
  };

  const currentBook = books?.find(b => b.id === currentBookId);

  return (
    <header className="h-14 border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 shrink-0 relative z-[100]">
      {showDaily && (
        <div className="fixed inset-0 h-screen w-screen z-[-1]" onClick={() => setShowDaily(false)} />
      )}
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-xs font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
              Bible Codex
            </h1>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary/60">
              Verbum Domini
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="relative flex items-center group">
            <div className="absolute left-0 flex items-center gap-1 pointer-events-none">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                {currentBook ? `${currentBook.abbreviation} ${currentChapter ?? 1}` : "Genesis 1"}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
            </div>
            <select 
              value={currentBook?.slug ?? ""}
              onChange={(e) => handleBookChange(e.target.value)}
              className="appearance-none bg-transparent pl-20 pr-4 py-1.5 text-xs font-bold text-transparent focus:outline-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors min-w-[120px]"
            >
              <option value="" disabled>Jump...</option>
              {books?.map((book) => (
                <option key={book.id} value={book.slug} className="text-zinc-900 dark:text-zinc-100">
                  {book.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Enhanced Search Trigger */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex h-8 items-center gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
          >
            <Search className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Search...</span>
            <kbd className="hidden sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[9px] font-black text-zinc-500">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
             <select 
              value={translationSlug}
              onChange={(e) => setTranslationSlug(e.target.value)}
              className="appearance-none bg-transparent px-2.5 py-1 text-[9px] font-black uppercase tracking-widest focus:outline-none cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {translations?.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.abbreviation}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <button 
            onClick={() => setIsVoiceoverPlaying(!isVoiceoverPlaying)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-lg px-3 text-[9px] font-black uppercase tracking-widest transition-all",
              isVoiceoverPlaying 
                ? "bg-primary text-white shadow-sm" 
                : "bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            )}
          >
            <Volume2 className={cn("h-3.5 w-3.5", isVoiceoverPlaying && "animate-pulse")} />
            <span className="hidden lg:inline">Listen</span>
          </button>

          <button 
            onClick={() => setShowDaily(!showDaily)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-lg px-3 text-[9px] font-black uppercase tracking-widest transition-all",
              showDaily 
                ? "bg-primary text-white shadow-sm" 
                : "bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Daily</span>
          </button>

          {showDaily && (
            <div className="absolute top-12 right-4 w-80 animate-in fade-in slide-in-from-top-2 duration-300 z-[110]">
              <LiturgicalCard onClose={() => setShowDaily(false)} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
