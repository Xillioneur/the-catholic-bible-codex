"use client";

import { useState, useEffect, useMemo } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { api } from "~/trpc/react";
import { Search, X, Book, Command, ArrowRight, Loader2, ChevronDown, Filter } from "lucide-react";
import { cn } from "~/lib/utils";

type SearchMode = "global" | "book" | "chapter";

export function SearchDialog() {
  const isSearchOpen = useReaderStore((state) => state.isSearchOpen);
  const setIsSearchOpen = useReaderStore((state) => state.setIsSearchOpen);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  return <SearchContent />;
}

function SearchContent() {
  const setIsSearchOpen = useReaderStore((state) => state.setIsSearchOpen);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const initialBookId = useReaderStore((state) => state.currentBookId);
  const initialChapter = useReaderStore((state) => state.currentChapter);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setSearchHighlight = useReaderStore((state) => state.setSearchHighlight);

  const [input, setInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("global");
  const [selectedBookId, setSelectedBookId] = useState<number>(initialBookId ?? 1);
  const [selectedChapter, setSelectedChapter] = useState<number>(initialChapter ?? 1);

  // Debounce logic to prevent empty queries and spam
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.length >= 2) {
        setDebouncedQuery(input);
      } else {
        setDebouncedQuery("");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data: books } = api.bible.getBooks.useQuery();
  const selectedBook = useMemo(() => books?.find(b => b.id === selectedBookId), [books, selectedBookId]);

  // Use debouncedQuery and explicit null-guards
  const { data, isFetching } = api.bible.searchVerses.useQuery(
    {
      translationSlug,
      query: debouncedQuery,
      bookId: selectedBookId,
      chapter: selectedChapter,
      mode,
      limit: 50,
    },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 1000 * 60,
    }
  );

  const results = data?.items;
  const totalResults = data?.total ?? 0;

  const handleSelect = (verse: any) => {
    setSearchHighlight({ query: debouncedQuery, targetOrder: verse.globalOrder });
    setScrollToOrder(verse.globalOrder);
    setIsSearchOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[8vh] px-4">
      <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsSearchOpen(false)} />
      
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300 relative z-10">
        <div className="p-6 flex flex-col gap-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <div className="relative flex items-center">
                <select 
                  value={selectedBookId}
                  onChange={(e) => {
                    setSelectedBookId(Number(e.target.value));
                    setSelectedChapter(1);
                  }}
                  className="appearance-none bg-transparent pl-3 pr-8 py-1.5 text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors"
                >
                  {books?.map((b) => (
                    <option key={b.id} value={b.id}>{b.abbreviation}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 h-3 w-3 pointer-events-none text-zinc-400" />
              </div>
              <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
              <div className="relative flex items-center">
                <select 
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(Number(e.target.value))}
                  className="appearance-none bg-transparent pl-3 pr-8 py-1.5 text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors"
                >
                  {Array.from({ length: 150 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 h-3 w-3 pointer-events-none text-zinc-400" />
              </div>
            </div>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex-1 flex items-center gap-3">
              <Search className="h-4 w-4 text-zinc-400" />
              <input 
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "global" ? "Search all Scripture..." : `Search in ${selectedBook?.name}...`}
                className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-300"
              />
            </div>
            
            <button onClick={() => setIsSearchOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full">
              {(["global", "book", "chapter"] as const).map((m) => (
                <button 
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    mode === m ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {debouncedQuery.length >= 2 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                <span className="text-[10px] font-black uppercase text-primary tracking-tighter">
                  {totalResults.toLocaleString()} Results Found
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="max-h-[55vh] overflow-auto p-2 scrollbar-none">
          {isFetching ? (
            <div className="p-16 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Consulting the Word</span>
            </div>
          ) : results && results.length > 0 ? (
            <div className="grid gap-1">
              {results.map((verse) => (
                <button 
                  key={verse.id}
                  onClick={() => handleSelect(verse)}
                  className="w-full text-left p-4 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-800 group transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                        {verse.book.name} {verse.chapter}:{verse.verse}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-zinc-200" />
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">{verse.book.category}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-[15px] font-serif leading-relaxed text-zinc-700 dark:text-zinc-300 line-clamp-2">
                    {verse.text}
                  </p>
                </button>
              ))}
            </div>
          ) : input.length >= 2 ? (
            <div className="p-16 text-center flex flex-col items-center gap-2">
              <span className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tighter">No Verses Found</span>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Adjust your context or keywords</span>
            </div>
          ) : (
            <div className="p-16 text-center flex flex-col items-center gap-4 text-zinc-300">
              <Filter className="h-8 w-8 opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Refine Your Search Context</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><kbd className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 shadow-sm font-black text-zinc-600">ESC</kbd> to close</div>
            <div className="flex items-center gap-1.5"><kbd className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 shadow-sm font-black text-zinc-600">ENTER</kbd> to select</div>
          </div>
          <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest italic">Verbum Domini Navigator v3</span>
        </div>
      </div>
    </div>
  );
}
