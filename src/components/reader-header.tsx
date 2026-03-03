"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { LiturgicalCard } from "./liturgical-card";
import { CalendarDays, ChevronDown, Menu, Search, Columns } from "lucide-react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";

export function ReaderHeader() {
  const { data: books } = api.bible.getBooks.useQuery();
  const { data: translations } = api.bible.getTranslations.useQuery();
  const [showDaily, setShowDaily] = useState(false);

  // Selective store subscriptions
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setTranslationSlug = useReaderStore((state) => state.setTranslationSlug);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const currentBookId = useReaderStore((state) => state.currentBookId);
  const currentChapter = useReaderStore((state) => state.currentChapter);
  const setStartOrder = useReaderStore((state) => state.setStartOrder);
  const isParallelView = useReaderStore((state) => state.isParallelView);
  const setIsParallelView = useReaderStore((state) => state.setIsParallelView);
  const parallelTranslationSlug = useReaderStore((state) => state.parallelTranslationSlug);
  const setParallelTranslationSlug = useReaderStore((state) => state.setParallelTranslationSlug);

  const utils = api.useUtils();

  const handleBookChange = async (bookSlug: string) => {
    if (!bookSlug) return;
    const order = await utils.bible.getVerseOrder.fetch({
      translationSlug,
      bookSlug,
    });
    if (order !== null) {
      setStartOrder(order);
      setScrollToOrder(order);
    }
  };

  const currentBook = books?.find(b => b.id === currentBookId);

  return (
    <header className="h-16 border-b border-white/10 bg-white/70 backdrop-blur-xl dark:bg-zinc-950/70 shrink-0">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Catholic Bible Codex
            </h1>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/80 dark:text-blue-400/80">
              Verbum Domini
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            <button 
              onClick={() => handleBookChange("genesis")}
              className={cn(
                "px-4 py-2 text-xs font-semibold transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900",
                currentBook?.slug === "genesis" ? "text-blue-600" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              Genesis
            </button>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <button 
              onClick={() => handleBookChange("matthew")}
              className={cn(
                "px-4 py-2 text-xs font-semibold transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900",
                currentBook?.slug === "matthew" ? "text-blue-600" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              Matthew
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-1 group">
            <div className="absolute left-3 flex items-center gap-1 pointer-events-none">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                {currentBook ? `${currentBook.name} ${currentChapter ?? 1}` : "Jump to..."}
              </span>
            </div>
            <select 
              value={currentBook?.slug ?? ""}
              onChange={(e) => handleBookChange(e.target.value)}
              className="appearance-none bg-transparent pl-32 pr-8 py-2 text-xs font-bold text-transparent focus:outline-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors min-w-[140px]"
            >
              <option value="" disabled className="text-zinc-500">Jump to Book...</option>
              {books?.map((book) => (
                <option key={book.id} value={book.slug} className="text-zinc-900 dark:text-zinc-100">
                  {book.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 h-3 w-3 pointer-events-none text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <button 
            onClick={() => setIsParallelView(!isParallelView)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-all",
              isParallelView 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
            )}
            title="Toggle Parallel View"
          >
            <Columns className="h-4 w-4" />
          </button>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg px-1">
             <select 
              value={translationSlug}
              onChange={(e) => setTranslationSlug(e.target.value)}
              className="appearance-none bg-transparent px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter focus:outline-none cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {translations?.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.abbreviation}
                </option>
              ))}
            </select>
            
            {isParallelView && (
              <>
                <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
                <select 
                  value={parallelTranslationSlug ?? ""}
                  onChange={(e) => setParallelTranslationSlug(e.target.value)}
                  className="appearance-none bg-transparent px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter focus:outline-none cursor-pointer text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {translations?.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.abbreviation}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <button 
            onClick={() => setShowDaily(!showDaily)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all",
              showDaily 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Daily Bread</span>
          </button>

          {showDaily && (
            <div className="absolute top-20 right-6 w-80 animate-in fade-in slide-in-from-top-2 duration-300 z-[100]">
              <LiturgicalCard />
            </div>
          )}
          
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
