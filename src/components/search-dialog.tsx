"use client";

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { api } from "~/trpc/react";
import { Search, X, ArrowRight, Loader2, ChevronDown, Filter, Hash, BookOpen } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSearchWorker } from "~/hooks/use-search-worker";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";

type SearchMode = "global" | "ot" | "nt" | "book" | "chapter";

const SearchResultItem = memo(({ 
  verse, 
  onClick, 
  style 
}: { 
  verse: any, 
  onClick: (v: any) => void, 
  style: React.CSSProperties 
}) => (
  <div style={style} className="p-1">
    <button 
      onClick={() => onClick(verse)}
      className="w-full h-full text-left px-4 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700 flex flex-col gap-1 group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 group-hover:text-primary transition-colors">
          {verse.book.abbreviation} {verse.chapter}:{verse.verse}
        </span>
        <ArrowRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
      </div>
      <p className="text-[13px] font-serif leading-snug text-zinc-600 dark:text-zinc-400 line-clamp-2">
        {verse.text}
      </p>
    </button>
  </div>
));

SearchResultItem.displayName = "SearchResultItem";

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

  const { search, results: workerResults, isSearching: isWorkerSearching } = useSearchWorker();
  const hydratedCount = useLiveQuery(() => db.verses.where("translationId").equals(translationSlug).count(), [translationSlug]) ?? 0;

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.length >= 2) {
        setDebouncedQuery(input);
        if (hydratedCount > 30000) {
          search({ 
            query: input, 
            translationSlug, 
            bookId: selectedBookId, 
            chapter: selectedChapter, 
            mode: (mode === "ot" || mode === "nt") ? "global" : mode, 
            limit: 5000 
          });
        }
      } else {
        setDebouncedQuery("");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [input, translationSlug, selectedBookId, selectedChapter, mode, hydratedCount, search]);

  const { data: books } = api.bible.getBooks.useQuery();
  const selectedBook = useMemo(() => books?.find(b => b.id === selectedBookId), [books, selectedBookId]);

  const useTrpc = hydratedCount < 30000;
  const { data: trpcData, isFetching: isTrpcFetching } = api.bible.searchVerses.useQuery(
    {
      translationSlug,
      query: debouncedQuery,
      bookId: selectedBookId,
      chapter: selectedChapter,
      mode: (mode === "ot" || mode === "nt") ? "global" : mode,
      limit: 500,
    },
    {
      enabled: debouncedQuery.length >= 2 && useTrpc,
      staleTime: 1000 * 60,
    }
  );

  const rawResults = useTrpc ? trpcData?.items : (workerResults || []);
  
  const results = useMemo(() => {
    if (!rawResults) return [];
    if (mode === "ot") return rawResults.filter((v: any) => v.book.testament === "OT");
    if (mode === "nt") return rawResults.filter((v: any) => v.book.testament === "NT");
    return rawResults;
  }, [rawResults, mode]);

  const totalResults = results.length;
  const isFetching = useTrpc ? isTrpcFetching : isWorkerSearching;

  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90,
    overscan: 8,
  });

  const onSelect = useCallback((verse: any) => {
    setSearchHighlight({ query: debouncedQuery, targetOrder: verse.globalOrder });
    setScrollToOrder(verse.globalOrder);
    setIsSearchOpen(false);
  }, [debouncedQuery, setSearchHighlight, setScrollToOrder, setIsSearchOpen]);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 sm:px-6">
      <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsSearchOpen(false)} />
      
      <div className="glass w-full max-w-xl rounded-[2rem] shadow-2xl border border-white/40 dark:border-zinc-800/40 overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-500 relative z-10 flex flex-col h-[60vh] max-h-[600px]">
        
        {/* COMPACT INTEGRATED HEADER */}
        <div className="px-5 py-4 flex flex-col gap-4 border-b border-zinc-100/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-4">
            <Search className="h-4 w-4 text-primary opacity-60 flex-shrink-0" />
            <input 
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search the Word..."
              className="flex-1 bg-transparent border-none outline-none text-base font-medium text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
            />
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary opacity-40" />}
            <button onClick={() => setIsSearchOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* MINI SCOPE SELECTOR */}
            <div className="flex items-center gap-1.5 p-0.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full">
              {(["global", "ot", "nt", "book", "chapter"] as const).map((m) => (
                <button 
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    mode === m ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* CONTEXT CHIPS (CONDITIONAL) */}
            {(mode === "book" || mode === "chapter") && (
              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-lg px-2 py-1">
                  <BookOpen className="h-2.5 w-2.5 text-primary opacity-60" />
                  <select 
                    value={selectedBookId}
                    onChange={(e) => {
                      setSelectedBookId(Number(e.target.value));
                      setSelectedChapter(1);
                    }}
                    className="appearance-none bg-transparent text-[8px] font-black uppercase tracking-wider focus:outline-none cursor-pointer text-primary"
                  >
                    {books?.map((b) => (
                      <option key={b.id} value={b.id}>{b.abbreviation}</option>
                    ))}
                  </select>
                </div>
                {mode === "chapter" && (
                  <div className="flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-lg px-2 py-1">
                    <Hash className="h-2.5 w-2.5 text-primary opacity-60" />
                    <select 
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(Number(e.target.value))}
                      className="appearance-none bg-transparent text-[8px] font-black uppercase tracking-wider focus:outline-none cursor-pointer text-primary"
                    >
                      {Array.from({ length: 150 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RESULTS AREA */}
        <div ref={parentRef} className="flex-1 overflow-auto p-2 scrollbar-elegant relative will-change-transform">
          {results.length > 0 ? (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const verse = results[virtualRow.index];
                if (!verse) return null;

                return (
                  <SearchResultItem
                    key={virtualRow.key}
                    verse={verse}
                    onClick={onSelect}
                    style={{ 
                      position: "absolute", 
                      top: 0, 
                      left: 0, 
                      width: "100%", 
                      height: `${virtualRow.size}px`, 
                      transform: `translateY(${virtualRow.start}px)`,
                      willChange: "transform"
                    }}
                  />
                );
              })}
            </div>
          ) : debouncedQuery.length >= 2 && !isFetching ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">No results matched</span>
              <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-widest">Try adjusting your scope or keywords</span>
            </div>
          ) : !isFetching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400 opacity-30">
              <Filter className="h-6 w-6" />
              <span className="text-[8px] font-black uppercase tracking-[0.4em]">Ready to Navigate</span>
            </div>
          )}
        </div>

        {/* COMPACT FOOTER */}
        <div className="px-5 py-3 bg-zinc-50/50 dark:bg-zinc-950/30 border-t border-zinc-100/50 dark:border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-tighter text-primary">
              {totalResults.toLocaleString()} <span className="text-zinc-400">Hits</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[8px] font-black text-zinc-400 uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1"><kbd className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 shadow-sm">ESC</kbd> CLOSE</div>
            <div className="flex items-center gap-1"><kbd className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 shadow-sm">ENTER</kbd> GOTO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
