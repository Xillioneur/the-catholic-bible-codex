"use client";

import { useState, useCallback, useMemo } from "react";
import { api } from "~/trpc/react";
import { LiturgicalCard } from "./liturgical-card";
import { 
  Search, 
  ChevronLeft,
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
      {/* 1. DESKTOP TRIGGER */}
      {isCollapsed && (
        <button 
          onClick={toggleSidebar}
          className="fixed hidden md:flex left-6 bottom-8 z-[110] w-10 h-10 rounded-full bg-primary text-white shadow-xl items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 pointer-events-auto"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* 2. THE RESPONSIVE NAV (Rail on Desktop, Bottom Bar on Mobile) */}
      <nav className={cn(
        "fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] pointer-events-none",
        // Desktop: Left Rail
        "md:left-0 md:top-0 md:bottom-0 md:flex md:flex-col md:justify-start md:translate-x-0",
        isCollapsed ? "md:-translate-x-full" : "md:translate-x-0",
        // Mobile: Bottom Bar
        "left-0 right-0 bottom-0 flex justify-center translate-y-0 pb-[env(safe-area-inset-bottom)]"
      )}>
        
        {/* MAIN CONTAINER */}
        <div className={cn(
          "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-zinc-200/30 dark:border-zinc-800/30 flex pointer-events-auto shadow-2xl transition-all duration-700",
          // Desktop Styling
          "md:w-14 md:h-full md:flex-col md:items-center md:py-6 md:gap-6 md:border-r",
          // Mobile Styling
          "w-full h-16 items-center justify-around px-4 border-t rounded-t-3xl md:rounded-none"
        )}>
          
          {/* BRANDING (Hidden on Mobile) */}
          <div className="hidden md:flex w-8 h-8 rounded-lg bg-primary items-center justify-center shadow-md shadow-primary/10 mb-2 overflow-hidden">
            <svg viewBox="0 0 512 512" fill="none" className="w-5 h-5">
              <circle cx="256" cy="256" r="240" fill="transparent" stroke="white" strokeWidth="16"/>
              <path d="M256 120V392" stroke="white" strokeWidth="32" strokeLinecap="round"/>
              <path d="M160 210H352" stroke="white" strokeWidth="32" strokeLinecap="round"/>
            </svg>
          </div>

          <RailButton 
            icon={<Search className="h-5 w-5 md:h-4 md:w-4" />} 
            onClick={() => { setIsSearchOpen(true); setActiveTab(null); }} 
            label="Search"
          />
          <RailButton 
            icon={<Sun className="h-5 w-5 md:h-4 md:w-4" />} 
            active={showDaily}
            onClick={() => { setShowDaily(!showDaily); setActiveTab(null); }} 
            label="Daily"
          />
          <div className="hidden md:block h-px w-6 bg-zinc-200/50 dark:bg-zinc-800/50 my-1 self-center" />
          <RailButton 
            icon={<Library className="h-5 w-5 md:h-4 md:w-4" />} 
            active={activeTab === "library"}
            onClick={() => { setActiveTab(activeTab === "library" ? null : "library"); setShowDaily(false); }} 
            label="Library"
          />
          <RailButton 
            icon={<Bookmark className="h-5 w-5 md:h-4 md:w-4" />} 
            active={activeTab === "bookmarks"}
            onClick={() => { setActiveTab(activeTab === "bookmarks" ? null : "bookmarks"); setShowDaily(false); }} 
            label="Saved"
          />
          <RailButton 
            icon={<Settings2 className="h-5 w-5 md:h-4 md:w-4" />} 
            active={activeTab === "settings"}
            onClick={() => { setActiveTab(activeTab === "settings" ? null : "settings"); setShowDaily(false); }} 
            label="Style"
          />

          {/* Desktop Collapse Button */}
          <button 
            onClick={toggleSidebar}
            className="hidden md:flex mt-auto p-2.5 text-zinc-400 hover:text-primary transition-all active:scale-75"
          >
            <ChevronLeft className="h-4 w-4 opacity-50" />
          </button>
        </div>

        {/* 3. THE FLYOUT PANEL (Responsive positioning) */}
        {activeTab && (
          <div className={cn(
            "fixed glass shadow-2xl border border-white/40 dark:border-zinc-800/40 flex flex-col animate-in duration-500 pointer-events-auto z-[101]",
            // Desktop Position
            "md:left-16 md:top-0 md:bottom-0 md:w-64 md:slide-in-from-left-2",
            // Mobile Position
            "left-0 right-0 bottom-16 h-[60vh] rounded-t-[2.5rem] slide-in-from-bottom-2"
          )}>
            <div className="p-5 flex items-center justify-between">
              <h2 className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-400">
                {activeTab}
              </h2>
              <button onClick={() => setActiveTab(null)} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-elegant">
              {activeTab === "library" && (
                <div className="space-y-6 mt-2">
                  <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5 rounded-full border border-zinc-200/20 dark:border-zinc-700/20">
                    {translations?.map((t) => (
                      <button 
                        key={t.id} 
                        onClick={() => setTranslationSlug(t.slug)} 
                        className={cn(
                          "flex-1 py-2 rounded-full text-[9px] font-black uppercase transition-all", 
                          translationSlug === t.slug ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                        )}
                      >
                        {t.abbreviation}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-0.5">
                    {books?.map(book => (
                      <button 
                        key={book.id}
                        onClick={() => handleBookSelect(book.slug)}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-xl transition-all group flex items-center justify-between",
                          currentBookId === book.id ? "bg-primary/5 text-primary" : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        <span className="font-serif italic text-base tracking-tight">{book.name}</span>
                        {currentBookId === book.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "bookmarks" && (
                <div className="space-y-2 mt-2">
                  {bookmarks.length > 0 ? bookmarks.map(b => (
                    <button 
                      key={b.id}
                      onClick={() => {
                        setScrollToOrder(b.globalOrder ?? 1);
                        setActiveTab(null);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50 hover:border-primary/20 hover:bg-primary/[0.01] transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">
                          {books?.find(bk => bk.id === b.bookId)?.abbreviation} {b.chapter}:{b.verse}
                        </span>
                        <History className="h-3 w-3 text-zinc-300" />
                      </div>
                      <p className="text-[11px] font-serif italic text-zinc-500 truncate">Saved from study</p>
                    </button>
                  )) : (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <Bookmark className="h-6 w-6 text-zinc-200" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Pure Presence</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-8 mt-4">
                  <div className="space-y-3 px-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Typography</span>
                    <div className="p-4 rounded-3xl bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between border border-zinc-100/50 dark:border-zinc-800/50">
                      <button onClick={() => setFontSize(fontSize - 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-700 shadow-sm text-zinc-600 active:scale-90 transition-transform">
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black tabular-nums text-zinc-900 dark:text-zinc-100">{fontSize}</span>
                        <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">Scale</span>
                      </div>
                      <button onClick={() => setFontSize(fontSize + 1)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-700 shadow-sm text-zinc-600 active:scale-90 transition-transform">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-zinc-50/30 dark:bg-zinc-950/10 border-t border-zinc-100/50 dark:border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black text-[10px] border border-primary/10">
                  {currentChapter}
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-400">Current Presence</span>
                  <span className="text-sm font-serif font-bold italic truncate text-zinc-900 dark:text-zinc-100">
                    {currentBook?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. DAILY BREAD OVERLAY (Mobile positioning) */}
        {showDaily && (
          <div className={cn(
            "fixed z-[110] animate-in fade-in duration-700 pointer-events-auto",
            "md:left-16 md:top-1/2 md:-translate-y-1/2 md:slide-in-from-left-4",
            "left-4 right-4 bottom-20 slide-in-from-bottom-4"
          )}>
            <LiturgicalCard onClose={() => setShowDaily(false)} />
          </div>
        )}
      </nav>
    </>
  );
}

function RailButton({ icon, active, onClick, label }: { icon: React.ReactNode, active?: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-1 transition-all duration-300 active:scale-90 touch-none",
        "flex-shrink-0 md:w-auto w-12",
        active ? "text-primary" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      )}
    >
      <div className={cn(
        "rounded-xl flex items-center justify-center transition-all duration-500",
        "h-10 w-10 md:h-9 md:w-9",
        active ? "bg-primary/5 shadow-inner border border-primary/10" : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[7px] font-black uppercase tracking-tight transition-opacity duration-300",
        "md:opacity-0 md:group-hover:opacity-100",
        active ? "opacity-100" : "opacity-60 md:opacity-0"
      )}>
        {label}
      </span>
      {active && (
        <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
      )}
    </button>
  );
}
