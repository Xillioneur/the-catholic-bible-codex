"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { LiturgicalCard } from "./liturgical-card";
import { 
  CalendarDays, 
  ChevronDown, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  Compass,
  Bookmark,
  Flame,
  Sun,
  Scroll,
  Settings2,
  Sparkles
} from "lucide-react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/lib/db";
import { useLiturgical } from "./liturgical-provider";

export function SidebarNav() {
  const { data: books } = api.bible.getBooks.useQuery();
  const { data: translations } = api.bible.getTranslations.useQuery();
  const { info: liturgical } = useLiturgical();
  
  const [showDaily, setShowDaily] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNavFlyout, setShowNavFlyout] = useState(false);

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

  const bookmarks = useLiveQuery(() => db.bookmarks.reverse().limit(3).toArray()) ?? [];
  const utils = api.useUtils();

  const handleBookChange = async (bookSlug: string) => {
    if (!bookSlug) return;
    setShowDaily(false);
    setShowNavFlyout(false);
    const order = await utils.bible.getVerseOrder.fetch({ translationSlug, bookSlug });
    if (order !== null) setScrollToOrder(order);
  };

  const jumpToVerse = async (bookId: number, chapter: number, verse: number) => {
    const book = books?.find(b => b.id === bookId);
    if (!book) return;
    const order = await utils.bible.getVerseOrder.fetch({ translationSlug, bookSlug: book.slug, chapter, verse });
    if (order) setScrollToOrder(order);
  };

  const currentBook = books?.find(b => b.id === currentBookId);

  return (
    <aside className={cn("fixed left-4 top-1/2 -translate-y-1/2 z-[100] transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]", isCollapsed ? "w-12" : "w-56")}>
      <div className={cn(
        "flex flex-col glass rounded-[2.5rem] transition-all duration-500 relative z-10 shadow-2xl",
        isCollapsed ? "h-[50vh] w-12 px-1" : "h-[90vh] w-full px-2.5",
        "will-change-transform" // Hardware acceleration
      )}>
        
        {/* TOP: Primary Actions (The "Do" Layer) */}
        <div className={cn("flex flex-col gap-2 mt-5", isCollapsed ? "items-center" : "px-1")}>
          <button 
            onClick={() => setIsSearchOpen(true)}
            className={cn(
              "flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 transition-all active:scale-95 group", 
              isCollapsed ? "h-10 w-10" : "w-full py-3 gap-3"
            )}
          >
            <Search className="h-4 w-4 transition-transform group-hover:scale-110 duration-300" />
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Search</span>}
          </button>

          <button 
            onClick={() => setShowDaily(!showDaily)}
            className={cn(
              "flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800/50 transition-all border border-transparent active:scale-95 group relative overflow-hidden",
              showDaily ? "border-primary/30 bg-primary/5 text-primary" : "hover:bg-white dark:hover:bg-zinc-700",
              isCollapsed ? "h-10 w-10" : "w-full py-3 gap-3"
            )}
          >
            <Sun className={cn("h-4 w-4 transition-all duration-500", showDaily ? "rotate-180 text-primary" : "text-zinc-400 group-hover:text-primary")} />
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Daily bread</span>}
            {showDaily && <Sparkles className="absolute top-1 right-1 h-2 w-2 text-primary animate-pulse" />}
          </button>
        </div>

        {/* MIDDLE: Content Navigator (The "Explore" Layer) */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto scrollbar-none py-6">
          {!isCollapsed ? (
            <div className="flex flex-col gap-6 animate-in fade-in duration-700">
              <div className="space-y-4 px-1">
                <div className="relative flex items-center group">
                  <Compass className="absolute left-3 h-3.5 w-3.5 text-zinc-400 group-hover:text-primary transition-all duration-500 group-hover:rotate-90" />
                  <select 
                    value={currentBook?.slug ?? ""} 
                    onChange={(e) => handleBookChange(e.target.value)} 
                    className="appearance-none bg-zinc-50/50 dark:bg-zinc-800/30 pl-9 pr-8 py-3 w-full text-[10px] font-black uppercase tracking-wider focus:outline-none cursor-pointer rounded-2xl border border-transparent hover:border-primary/20 transition-all"
                  >
                    <option value="" disabled>Browse Codex</option>
                    {books?.map((book) => (<option key={book.id} value={book.slug}>{book.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 h-3 w-3 text-zinc-300 pointer-events-none" />
                </div>

                <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-2xl">
                  {translations?.map((t) => (
                    <button 
                      key={t.id} 
                      onClick={() => setTranslationSlug(t.slug)} 
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all", 
                        translationSlug === t.slug ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      {t.abbreviation}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-1">
                <div className="flex items-center justify-between px-3 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Sanctuary</span>
                  <Bookmark className="h-3 w-3 text-primary/20" />
                </div>
                <div className="flex flex-col gap-1">
                  {bookmarks.map(b => (
                    <button 
                      key={b.id} 
                      onClick={() => jumpToVerse(b.bookId, b.chapter, b.verse)} 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-left transition-all group"
                    >
                      <Flame className="h-3 w-3 text-primary/20 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 truncate group-hover:text-primary">
                        {books?.find(bk => bk.id === b.bookId)?.abbreviation} {b.chapter}:{b.verse}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => setShowNavFlyout(!showNavFlyout)}
                className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-all", showNavFlyout ? "bg-primary/10 text-primary" : "text-zinc-400 hover:text-primary")}
              >
                <Compass className="h-4 w-4" />
              </button>
              {showNavFlyout && (
                <div className="fixed z-[110] animate-in fade-in slide-in-from-left-2 duration-300 left-16 top-[30vh] w-48 glass rounded-[2rem] p-4 shadow-2xl">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-2 px-1">Quick Nav</span>
                  <select 
                    value={currentBook?.slug ?? ""} 
                    onChange={(e) => handleBookChange(e.target.value)} 
                    className="bg-transparent w-full text-[10px] font-black uppercase tracking-tight focus:outline-none"
                  >
                    {books?.map((book) => (<option key={book.id} value={book.slug}>{book.name}</option>))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM: Systems (The "Configure" Layer) */}
        <div className={cn("mt-auto pb-5 flex flex-col gap-2", isCollapsed ? "items-center" : "px-1")}>
          {!isCollapsed && showSettings && (
            <div className="px-1 mb-2 animate-in slide-in-from-bottom-2 duration-300">
              <div className="p-3 bg-zinc-900 rounded-2xl flex items-center justify-between">
                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Size</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setFontSize(fontSize - 1)} className="text-white text-[10px] h-5 w-5 flex items-center justify-center hover:bg-white/10 rounded">-</button>
                  <span className="text-white text-[10px] font-black tabular-nums">{fontSize}</span>
                  <button onClick={() => setFontSize(fontSize + 1)} className="text-white text-[10px] h-5 w-5 flex items-center justify-center hover:bg-white/10 rounded">+</button>
                </div>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800/50 transition-all active:scale-95 py-2.5 gap-3",
                showSettings ? "bg-primary/10 text-primary border-primary/20" : "text-zinc-400 hover:text-zinc-600 border-transparent"
              )}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Settings</span>
            </button>
          )}

          <div className={cn(
            "flex items-center justify-center transition-all duration-500",
            isCollapsed ? "h-9 w-9 rounded-full bg-zinc-900" : "px-4 py-3.5 bg-zinc-900 dark:bg-zinc-800 rounded-2xl shadow-xl border border-white/5"
          )}>
            {isCollapsed ? (
              <span className="text-[9px] font-black text-primary">{currentBook?.abbreviation?.charAt(0)}</span>
            ) : (
              <div className="flex flex-col gap-0.5 overflow-hidden text-center">
                <span className="text-[11px] font-black text-white truncate tracking-tight uppercase">
                  {currentBook?.name} {currentChapter}
                </span>
              </div>
            )}
          </div>

          <button 
            onClick={toggleSidebar} 
            className="flex h-8 w-8 items-center justify-center self-center rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-primary transition-all active:scale-75 shadow-sm"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showDaily && (
        <div className={cn(
          "absolute z-[110] animate-in fade-in slide-in-from-left-6 duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] top-0 flex items-center",
          isCollapsed ? "left-14 h-[50vh]" : "left-[15.5rem] h-[90vh]"
        )}>
          <LiturgicalCard onClose={() => setShowDaily(false)} />
        </div>
      )}
    </aside>
  );
}
