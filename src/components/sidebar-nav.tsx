"use client";

import { useState, useCallback, useMemo } from "react";
import { api } from "~/trpc/react";
import { LiturgicalCard } from "./liturgical-card";
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sun,
  Settings2,
  Library,
  History,
  X,
  Plus,
  Minus,
  Menu
} from "lucide-react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/lib/db";

export function SidebarNav() {
  const { data: books } = api.bible.getBooks.useQuery();
  const { data: translations } = api.bible.getTranslations.useQuery();
  
  const [activeTab, setActiveTab] = useState<"library" | "bookmarks" | "settings" | null>(null);
  const [showDaily, setShowDaily] = useState(false);

  const isCollapsed = useReaderStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useReaderStore((state) => state.toggleSidebar);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setTranslationSlug = useReaderStore((state) => state.setTranslationSlug);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const currentBookId = useReaderStore((state) => state.currentBookId);
  const currentChapter = useReaderStore((state) => state.currentChapter);
  const setIsSearchOpen = useReaderStore((state) => state.setIsSearchOpen);
  
  const fontSize = useReaderStore((state) => state.fontSize);
  const setFontSize = useReaderStore((state) => state.setFontSize);

  const bookmarks = useLiveQuery(() => db.bookmarks.reverse().limit(10).toArray()) ?? [];
  const utils = api.useUtils();

  const handleBookSelect = useCallback(async (bookSlug: string) => {
    setActiveTab(null);
    const order = await utils.bible.getVerseOrder.fetch({ translationSlug, bookSlug });
    if (order !== null) setScrollToOrder(order);
  }, [translationSlug, utils, setScrollToOrder]);

  const currentBook = useMemo(() => books?.find(b => b.id === currentBookId), [books, currentBookId]);

  return (
    <>
      {/* 1. THE MINI FLOATING TRIGGER */}
      {isCollapsed && (
        <button 
          onClick={toggleSidebar}
          className="fixed left-6 bottom-8 z-[110] w-10 h-10 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 animate-in fade-in zoom-in pointer-events-auto"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      <aside className={cn(
        "fixed left-0 top-0 bottom-0 z-[100] flex transition-all duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] pointer-events-none",
        isCollapsed ? "-translate-x-full" : "translate-x-0"
      )}>
        
        {/* 2. THE JERUSALEM RAIL (Ultra-Compact) */}
        <div className={cn(
          "w-14 h-full bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-r border-zinc-200/30 dark:border-zinc-800/30 flex flex-col items-center py-6 gap-6 pointer-events-auto shadow-2xl shadow-black/5"
        )}>
          
        {/* BRANDING SYMBOL */}
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/10 mb-2 overflow-hidden">
          <svg viewBox="0 0 512 512" fill="none" className="w-6 h-6">
            <circle cx="256" cy="256" r="240" fill="transparent" stroke="white" strokeWidth="16"/>
            <path d="M256 120V392" stroke="white" strokeWidth="32" strokeLinecap="round"/>
            <path d="M160 210H352" stroke="white" strokeWidth="32" strokeLinecap="round"/>
          </svg>
        </div>

          <div className="flex-1 flex flex-col gap-3">
            <RailButton 
              icon={<Search className="h-4 w-4" />} 
              onClick={() => setIsSearchOpen(true)} 
              label="Search"
            />
            <RailButton 
              icon={<Sun className="h-4 w-4" />} 
              active={showDaily}
              onClick={() => { setShowDaily(!showDaily); setActiveTab(null); }} 
              label="Daily"
            />
            <div className="h-px w-6 bg-zinc-200/50 dark:bg-zinc-800/50 my-1 self-center" />
            <RailButton 
              icon={<Library className="h-4 w-4" />} 
              active={activeTab === "library"}
              onClick={() => { setActiveTab(activeTab === "library" ? null : "library"); setShowDaily(false); }} 
              label="Library"
            />
            <RailButton 
              icon={<Bookmark className="h-4 w-4" />} 
              active={activeTab === "bookmarks"}
              onClick={() => { setActiveTab(activeTab === "bookmarks" ? null : "bookmarks"); setShowDaily(false); }} 
              label="Saved"
            />
          </div>

          <RailButton 
            icon={<Settings2 className="h-4 w-4" />} 
            active={activeTab === "settings"}
            onClick={() => { setActiveTab(activeTab === "settings" ? null : "settings"); setShowDaily(false); }} 
            label="Style"
          />

          <button 
            onClick={toggleSidebar}
            className="mt-2 p-2.5 text-zinc-400 hover:text-primary transition-all active:scale-75"
          >
            <ChevronLeft className="h-4 w-4 opacity-50" />
          </button>
        </div>

        {/* 3. THE TYPOGRAPHIC FLYOUT PANEL */}
        {activeTab && (
          <div className="w-64 h-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl border-r border-zinc-200/30 dark:border-zinc-800/30 flex flex-col animate-in slide-in-from-left-2 duration-500 pointer-events-auto shadow-2xl">
            <div className="p-5 flex items-center justify-between">
              <h2 className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-400">
                {activeTab}
              </h2>
              <button onClick={() => setActiveTab(null)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-elegant">
              {activeTab === "library" && (
                <div className="space-y-6 mt-2">
                  <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5 rounded-full border border-zinc-200/20 dark:border-zinc-700/20">
                    {translations?.map((t) => (
                      <button 
                        key={t.id} 
                        onClick={() => setTranslationSlug(t.slug)} 
                        className={cn(
                          "flex-1 py-1 rounded-full text-[8px] font-black uppercase transition-all", 
                          translationSlug === t.slug ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                        )}
                      >
                        {t.abbreviation}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-0.5">
                    {books?.map(book => (
                      <button 
                        key={book.id}
                        onClick={() => handleBookSelect(book.slug)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all group flex items-center justify-between",
                          currentBookId === book.id ? "bg-primary/5 text-primary" : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        <span className="font-serif italic text-[15px] tracking-tight">{book.name}</span>
                        {currentBookId === book.id && <div className="h-1 w-1 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "bookmarks" && (
                <div className="space-y-1.5 mt-2">
                  {bookmarks.length > 0 ? bookmarks.map(b => (
                    <button 
                      key={b.id}
                      onClick={() => {
                        setScrollToOrder(b.globalOrder ?? 1);
                        setActiveTab(null);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-zinc-100/50 dark:border-zinc-800/50 hover:border-primary/20 hover:bg-primary/[0.01] transition-all group"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] font-black uppercase text-primary tracking-widest">
                          {books?.find(bk => bk.id === b.bookId)?.abbreviation} {b.chapter}:{b.verse}
                        </span>
                        <History className="h-2.5 w-2.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] font-serif italic text-zinc-500 truncate">Saved from study</p>
                    </button>
                  )) : (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <Bookmark className="h-5 w-5 text-zinc-200" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Pure Presence</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-8 mt-4">
                  <div className="space-y-3 px-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block">Typography</span>
                    <div className="p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between border border-zinc-100/50 dark:border-zinc-800/50">
                      <button onClick={() => setFontSize(fontSize - 1)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 shadow-sm text-zinc-600 active:scale-90 transition-transform">
                        <Minus className="h-3 w-3" />
                      </button>
                      <div className="flex flex-col items-center">
                        <span className="text-base font-black tabular-nums text-zinc-900 dark:text-zinc-100">{fontSize}</span>
                        <span className="text-[6px] font-bold text-zinc-400 uppercase tracking-tighter">Scale</span>
                      </div>
                      <button onClick={() => setFontSize(fontSize + 1)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 shadow-sm text-zinc-600 active:scale-90 transition-transform">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-zinc-50/30 dark:bg-zinc-950/10 border-t border-zinc-100/50 dark:border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black text-[9px] border border-primary/10">
                  {currentChapter}
                </div>
                <div className="flex flex-col">
                  <span className="text-[6px] font-black uppercase tracking-[0.3em] text-zinc-400">Current Presence</span>
                  <span className="text-xs font-serif font-bold italic truncate text-zinc-900 dark:text-zinc-100">
                    {currentBook?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. DAILY BREAD OVERLAY */}
        {showDaily && (
          <div className="fixed z-[110] animate-in fade-in slide-in-from-left-4 duration-700 left-16 top-1/2 -translate-y-1/2 pointer-events-auto">
            <LiturgicalCard onClose={() => setShowDaily(false)} />
          </div>
        )}
      </aside>
    </>
  );
}

function RailButton({ icon, active, onClick, label }: { icon: React.ReactNode, active?: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-1 transition-all duration-300 active:scale-90",
        active ? "text-primary" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      )}
    >
      <div className={cn(
        "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-500",
        active ? "bg-primary/5 shadow-inner border border-primary/10" : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[7px] font-black uppercase tracking-tight transition-opacity duration-300",
        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {label}
      </span>
      {active && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
      )}
    </button>
  );
}
