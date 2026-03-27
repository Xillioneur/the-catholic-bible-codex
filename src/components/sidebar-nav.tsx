"use client";

import { useState, useCallback, useMemo } from "react";
import { api } from "~/trpc/react";
import { 
  Search, 
  ChevronLeft,
  Bookmark,
  Sun,
  Settings2,
  Library as LibraryIcon,
  X,
  Plus,
  Minus,
  Menu,
  Scroll,
  Music,
  Church,
  ChevronRight,
  Calendar,
  Trash2,
  Volume2,
  Headphones,
  Loader2,
  User as UserIcon,
  LogOut,
  LogIn,
  History,
  BookText,
  Highlighter,
  MessageSquare
} from "lucide-react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/lib/db";
import { useLiturgical } from "./liturgical-provider";
import { DailyAllView } from "./liturgical-full-view";
import { toast } from "sonner";
import { useVoiceover } from "~/hooks/use-voiceover";
import { useSession, signIn, signOut } from "next-auth/react";

export function SidebarNav() {
  const { data: session } = useSession();
  const { data: books = [] } = api.bible.getBooks.useQuery();
  const { data: translations = [] } = api.bible.getTranslations.useQuery();
  const { info } = useLiturgical();
  const { jumpToOrder, unlockAudio } = useVoiceover();
  
  const [activeTab, setActiveTab] = useState<"library" | "bookmarks" | "settings" | "daily" | "account" | "journal" | null>(null);
  const [journalFilter, setJournalFilter] = useState<"notes" | "highlights">("notes");
  const [showFullLiturgical, setShowFullLiturgical] = useState(false);
  const [librarySelectedBook, setLibrarySelectedBook] = useState<any | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");

  const isCollapsed = useReaderStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useReaderStore((state) => state.toggleSidebar);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setTranslationSlug = useReaderStore((state) => state.setTranslationSlug);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const currentBookId = useReaderStore((state) => state.currentBookId);
  const currentChapter = useReaderStore((state) => state.currentChapter);
  const setIsSearchOpen = useReaderStore((state) => state.setIsSearchOpen);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const setIsNavigatorVisible = useReaderStore((state) => state.setIsNavigatorVisible);
  
  const isVoiceoverPlaying = useReaderStore((state) => state.isVoiceoverPlaying);
  const setIsVoiceoverPlaying = useReaderStore((state) => state.setIsVoiceoverPlaying);
  const isVoiceoverActive = useReaderStore((state) => state.isVoiceoverActive);
  const setIsActive = useReaderStore((state) => state.setIsVoiceoverActive);
  const isVoiceoverMinimized = useReaderStore((state) => state.isVoiceoverMinimized);
  const setIsVoiceoverMinimized = useReaderStore((state) => state.setIsVoiceoverMinimized);
  
  const fontSize = useReaderStore((state) => state.fontSize);
  const setFontSize = useReaderStore((state) => state.setFontSize);

  const currentUserId = session?.user?.id ?? "guest";

  const bookmarks = useLiveQuery(() => db.bookmarks.where("userId").equals(currentUserId).reverse().limit(10).toArray(), [currentUserId]) ?? [];
  const localNotesRaw = useLiveQuery(() => db.notes.where("userId").equals(currentUserId).reverse().toArray(), [currentUserId]) ?? [];
  const localHighlightsRaw = useLiveQuery(() => db.highlights.where("userId").equals(currentUserId).reverse().toArray(), [currentUserId]) ?? [];
  const utils = api.useUtils();

  const [editingNoteId, setEditingNoteId] = useState<string | number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const handleUpdateNote = async (noteId: string | number, content: string) => {
    try {
      if (session) {
        // We don't have a direct TRPC update yet, but we can update locally 
        // and the syncer will eventually push it if implemented.
        // Actually, we should probably add a TRPC mutation for single note update 
        // but for now, updating Dexie is the source of truth for the UI.
        await db.notes.update(noteId as number, { content, updatedAt: Date.now() });
      } else {
        await db.notes.update(noteId as number, { content, updatedAt: Date.now() });
      }
      setEditingNoteId(null);
      toast.success("Reflection updated");
    } catch (e) {
      toast.error("Failed to update reflection");
    }
  };

  const handleDeleteNote = async (noteId: string | number) => {
    try {
      await db.notes.delete(noteId as number);
      toast.success("Reflection deleted");
    } catch (e) {
      toast.error("Failed to delete reflection");
    }
  };

  const handleDeleteHighlight = async (highlightId: string | number) => {
    try {
      await db.highlights.delete(highlightId as number);
      toast.success("Highlight removed");
    } catch (e) {
      toast.error("Failed to remove highlight");
    }
  };

  // For Guests and Users: Join local notes/highlights with verse info from Dexie
  const localNotes = useLiveQuery(async () => {
    const notesWithVerses = await Promise.all(
      localNotesRaw.map(async (n) => {
        const verse = await db.verses.get(n.verseId);
        return { ...n, verse };
      })
    );
    return notesWithVerses.filter(n => !!n.verse);
  }, [localNotesRaw]) ?? [];

  const localHighlights = useLiveQuery(async () => {
    const highlightsWithVerses = await Promise.all(
      localHighlightsRaw.map(async (h) => {
        const verse = await db.verses.get(h.verseId);
        return { ...h, verse };
      })
    );
    return highlightsWithVerses.filter(h => !!h.verse);
  }, [localHighlightsRaw]) ?? [];

  const { data: journal, isLoading: isLoadingJournal } = api.user.getJournal.useQuery(undefined, {
    enabled: activeTab === "journal" && !!session
  });

  const handleBookSelect = useCallback(async (bookSlug: string, chapter: number = 1) => {
    setActiveTab(null);
    setLibrarySelectedBook(null);
    setLibrarySearch("");
    const order = await utils.bible.getVerseOrder.fetch({ translationSlug, bookSlug, chapter });
    if (order !== null) setScrollToOrder(order);
  }, [translationSlug, utils, setScrollToOrder]);

  const { data: libraryChapters = [], isLoading: isLoadingLibraryChapters } = api.bible.getChapters.useQuery(
    { bookSlug: librarySelectedBook?.slug ?? "", translationSlug },
    { enabled: !!librarySelectedBook }
  );

  const categories = useMemo(() => {
    const cats = ["Pentateuch", "History", "Wisdom", "Prophets", "Gospels", "Acts", "Epistles", "Revelation"];
    const filtered = books.filter(b => 
      b.name.toLowerCase().includes(librarySearch.toLowerCase()) || 
      b.abbreviation.toLowerCase().includes(librarySearch.toLowerCase())
    );
    return cats.map(c => ({
      name: c,
      books: filtered.filter(b => b.category === c).sort((a, b) => a.order - b.order)
    })).filter(c => c.books.length > 0);
  }, [books, librarySearch]);

  const handleSelectReading = (type: string) => {
    const reading = liturgicalReadings.find(r => r.type === type);
    if (reading && reading.orders.length > 0) {
      const firstOrder = reading.orders[0];
      if (firstOrder) {
        setScrollToOrder(firstOrder);
        setIsNavigatorVisible(true);
        toast.success(`${type} Focused`);
        setActiveTab(null);
      }
    } else {
      toast.error("Reading not found");
    }
  };

  const handleListenAll = useCallback(() => {
    const allOrders = liturgicalReadings.flatMap(r => r.orders);
    if (allOrders.length > 0) {
      unlockAudio();
      jumpToOrder(allOrders[0], allOrders);
      toast.success("Daily Bread: Voiceover Started");
      setActiveTab(null);
    } else {
      toast.error("Readings not yet loaded");
    }
  }, [liturgicalReadings, jumpToOrder, unlockAudio]);

  const currentBook = useMemo(() => books?.find(b => b.id === currentBookId), [books, currentBookId]);

  return (
    <>
      {/* 1. THE MINI FLOATING TRIGGER */}
      {isCollapsed && (
        <button 
          onClick={toggleSidebar}
          className="fixed hidden md:flex left-6 bottom-8 z-[110] w-10 h-10 rounded-full bg-primary text-white shadow-xl items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 pointer-events-auto"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* 2. THE RESPONSIVE NAV RAIL/PILL */}
      <nav className={cn(
        "fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] pointer-events-none",
        "md:left-0 md:top-0 md:bottom-0 md:flex md:flex-col md:justify-start md:translate-x-0",
        isCollapsed ? "md:-translate-x-full" : "md:translate-x-0",
        "left-4 right-4 bottom-6 flex justify-center translate-y-0"
      )}>
        <div className={cn(
          "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-zinc-200/30 dark:border-zinc-800/30 flex pointer-events-auto shadow-2xl transition-all duration-700",
          "md:w-14 md:h-full md:flex-col md:items-center md:py-6 md:gap-6 md:border-r md:rounded-none",
          "w-full h-14 items-center justify-around px-2 rounded-full border"
        )}>
          <div className="hidden md:flex w-8 h-8 rounded-lg bg-primary items-center justify-center shadow-md shadow-primary/10 mb-2 overflow-hidden">
            <svg viewBox="0 0 512 512" fill="none" className="w-5 h-5">
              <circle cx="256" cy="256" r="240" fill="transparent" stroke="white" strokeWidth="16"/>
              <path d="M256 120V392" stroke="white" strokeWidth="32" strokeLinecap="round"/>
              <path d="M160 210H352" stroke="white" strokeWidth="32" strokeLinecap="round"/>
            </svg>
          </div>

          <RailButton icon={<Search className="h-4 w-4" />} onClick={() => { setIsSearchOpen(true); setActiveTab(null); }} label="Search" />
          <RailButton icon={<Sun className="h-4 w-4" />} active={activeTab === "daily"} onClick={() => setActiveTab(activeTab === "daily" ? null : "daily")} label="Daily" />
          
          <RailButton 
            icon={<Volume2 className={cn("h-4 w-4 transition-all", isVoiceoverPlaying && "animate-pulse text-primary")} />} 
            active={isVoiceoverPlaying} 
            onClick={() => {
              if (!isVoiceoverPlaying) {
                unlockAudio();
                setIsVoiceoverPlaying(true);
                setIsActive(true);
                setIsVoiceoverMinimized(false);
              } else {
                setIsVoiceoverPlaying(false);
              }
            }} 
            label="Listen" 
          />

          <div className="hidden md:block h-px w-6 bg-zinc-200/50 dark:bg-zinc-800/50 my-1 self-center" />
          <RailButton icon={<LibraryIcon className="h-4 w-4" />} active={activeTab === "library"} onClick={() => setActiveTab(activeTab === "library" ? null : "library")} label="Library" />
          <RailButton icon={<BookText className="h-4 w-4" />} active={activeTab === "journal"} onClick={() => setActiveTab(activeTab === "journal" ? null : "journal")} label="Journal" />
          <RailButton icon={<Bookmark className="h-4 w-4" />} active={activeTab === "bookmarks"} onClick={() => setActiveTab(activeTab === "bookmarks" ? null : "bookmarks")} label="Saved" />
          <RailButton icon={<Settings2 className="h-4 w-4" />} active={activeTab === "settings"} onClick={() => setActiveTab(activeTab === "settings" ? null : "settings")} label="Style" />
          <RailButton 
            icon={session?.user?.image ? (
              <img src={session.user.image} className="h-4 w-4 rounded-full" alt="Profile" />
            ) : (
              <UserIcon className="h-4 w-4" />
            )} 
            active={activeTab === "account"} 
            onClick={() => setActiveTab(activeTab === "account" ? null : "account")} 
            label="Account" 
          />

          <button onClick={toggleSidebar} className="hidden md:flex mt-auto p-2.5 text-zinc-400 hover:text-primary transition-all active:scale-75">
            <ChevronLeft className="h-4 w-4 opacity-50" />
          </button>
        </div>
      </nav>

      {/* 3. THE UNIFIED FLYOUT PANEL */}
      {activeTab && (
        <div className={cn(
          "fixed glass shadow-2xl border border-white/40 dark:border-zinc-800/40 flex flex-col animate-in duration-500 pointer-events-auto z-[101]",
          // Desktop Position
          "md:left-16 md:top-0 md:bottom-0 md:w-80 md:slide-in-from-left-2 md:rounded-none",
          // Mobile Position
          "left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] rounded-[2.5rem] slide-in-from-bottom-4"
        )}>
          <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50">
            <h2 className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-400">{activeTab}</h2>
            <button onClick={() => {
              setActiveTab(null);
              setLibrarySelectedBook(null);
            }} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-elegant">
            {activeTab === "daily" && info && (
              <div className="space-y-6 mt-4">
                <div className="px-3 py-2 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-primary">Liturgical Day</span>
                    </div>
                    <p className="text-xs font-serif font-bold italic text-zinc-900 dark:text-zinc-100 leading-tight">{info.day}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setShowFullLiturgical(true);
                      handleListenAll();
                    }}
                    className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid gap-1">
                  <ReadingRow label="First" citation={info.readings.firstReading ?? ""} icon={Scroll} onSelect={() => handleSelectReading("First Reading")} />
                  {info.readings.psalm && <ReadingRow label="Psalm" citation={info.readings.psalm} icon={Music} onSelect={() => handleSelectReading("Responsorial Psalm")} />}
                  {info.readings.secondReading && <ReadingRow label="Second" citation={info.readings.secondReading} icon={Scroll} onSelect={() => handleSelectReading("Second Reading")} />}
                  {info.readings.gospel && <ReadingRow label="Gospel" citation={info.readings.gospel ?? ""} icon={Church} onSelect={() => handleSelectReading("The Holy Gospel")} />}
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleListenAll}
                    className="w-full py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black text-[8px] uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Listen to All
                  </button>
                  <button 
                    onClick={() => setShowFullLiturgical(true)}
                    className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[8px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    View All Readings
                  </button>
                </div>
              </div>
            )}

            {activeTab === "library" && (
              <div className="mt-4 animate-in fade-in duration-300">
                {/* Header Area */}
                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5 rounded-full border border-zinc-200/20">
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

                  {!librarySelectedBook ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
                      <input 
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        placeholder="Filter 73 Books..."
                        className="w-full h-8 pl-8 pr-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/20 focus:outline-none focus:ring-1 focus:ring-primary/20 text-[10px] font-serif italic"
                      />
                    </div>
                  ) : (
                    <button 
                      onClick={() => setLibrarySelectedBook(null)}
                      className="flex items-center gap-2 text-primary hover:opacity-70 transition-all group py-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Back to Books</span>
                    </button>
                  )}
                </div>

                {/* Content Area */}
                {!librarySelectedBook ? (
                  <div className="space-y-6">
                    {categories.map((cat) => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center gap-2 px-1 mb-2">
                          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-300">{cat.name}</span>
                          <div className="h-[0.5px] flex-1 bg-zinc-100 dark:bg-zinc-800/50" />
                        </div>
                        <div className="grid gap-px">
                          {cat.books.map(book => (
                            <button
                              key={book.id}
                              onClick={() => setLibrarySelectedBook(book)}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between group",
                                currentBookId === book.id 
                                  ? "bg-primary/5 text-primary" 
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                                )}
                            >
                              <span className="font-serif italic text-sm tracking-tight">{book.name}</span>
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="px-1 mb-5">
                      <h3 className="font-serif font-black italic text-xl text-zinc-900 dark:text-zinc-100 leading-tight">
                        {librarySelectedBook.name}
                      </h3>
                    </div>
                    
                    {isLoadingLibraryChapters ? (
                      <div className="grid grid-cols-6 gap-1.5">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className="aspect-square rounded-lg bg-zinc-50 dark:bg-zinc-800/50 animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-6 gap-1.5 pb-4">
                        {libraryChapters.map((chapter) => (
                          <button
                            key={chapter}
                            onClick={() => handleBookSelect(librarySelectedBook.slug, chapter)}
                            className={cn(
                              "aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all border shadow-sm",
                              currentBookId === librarySelectedBook.id && currentChapter === chapter
                                ? "bg-primary text-white border-primary shadow-primary/20"
                                : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-primary hover:border-primary/40 hover:scale-105 active:scale-95"
                            )}
                          >
                            {chapter}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookmarks" && (
              <div className="space-y-2 mt-4">
                {bookmarks.length > 0 ? bookmarks.map(b => (
                  <div key={b.id} className="relative group">
                    <button 
                      onClick={() => {
                        if (b.globalOrder) {
                          setScrollToOrder(b.globalOrder);
                          setActiveTab(null);
                        } else {
                          toast.error("Older bookmark: please re-save.");
                        }
                      }}
                      className="w-full text-left p-4 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 hover:border-primary/20 hover:bg-primary/[0.01] transition-all"
                    >
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest block mb-1">
                        {books?.find(bk => bk.id === b.bookId)?.abbreviation} {b.chapter}:{b.verse}
                      </span>
                      <p className="text-[11px] font-serif italic text-zinc-500 truncate pr-8">Saved reflection</p>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        void db.bookmarks.delete(b.id!);
                        toast.success("Bookmark removed");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )) : (
                  <div className="py-20 text-center flex flex-col items-center gap-3 text-zinc-300">
                    <Bookmark className="h-6 w-6 opacity-20" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Quiet Sanctuary</span>
                    {!session && (
                      <p className="text-[10px] font-medium text-zinc-400 mt-4 px-10">Sign in to sync your local bookmarks across all your devices.</p>
                    )}
                  </div>
                )}
                {!session && bookmarks.length > 0 && (
                  <div className="px-6 py-4 mt-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-medium text-zinc-400 text-center">These bookmarks are stored locally. Sign in to sync them to the Sanctuary Cloud.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "journal" && (
              <div className="mt-4 space-y-4">
                <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5 rounded-full border border-zinc-200/20">
                  <button 
                    onClick={() => setJournalFilter("notes")} 
                    className={cn(
                      "flex-1 py-1.5 rounded-full text-[8px] font-black uppercase transition-all flex items-center justify-center gap-2", 
                      journalFilter === "notes" ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400"
                    )}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Reflections
                  </button>
                  <button 
                    onClick={() => setJournalFilter("highlights")} 
                    className={cn(
                      "flex-1 py-1.5 rounded-full text-[8px] font-black uppercase transition-all flex items-center justify-center gap-2", 
                      journalFilter === "highlights" ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400"
                    )}
                  >
                    <Highlighter className="h-3 w-3" />
                    Highlights
                  </button>
                </div>

                {isLoadingJournal && session ? (
                  <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary/20 animate-spin" /></div>
                ) : (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    {journalFilter === "notes" ? (
                      (() => {
                        const notesToShow = session ? journal?.notes : localNotes;
                        if (!notesToShow || notesToShow.length === 0) {
                          return <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300">The page is blank</div>;
                        }
                        return notesToShow.map((note: any) => (
                          <div 
                            key={note.id}
                            className="group relative w-full text-left p-4 rounded-[2rem] bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/50 hover:border-primary/20 transition-all overflow-hidden"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <button 
                                onClick={() => setScrollToOrder(note.verse.globalOrder)}
                                className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                              >
                                {note.verse.book.abbreviation} {note.verse.chapter}:{note.verse.verse}
                              </button>
                              <div className="flex items-center gap-1">
                                <span className="text-[7px] font-bold text-zinc-400 mr-1">{new Date(note.updatedAt).toLocaleDateString()}</span>
                                <button 
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditingNoteContent(note.content);
                                  }}
                                  className="p-1 rounded-full hover:bg-primary/10 text-zinc-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Settings2 className="h-2.5 w-2.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="p-1 rounded-full hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>

                            {editingNoteId === note.id ? (
                              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <textarea
                                  value={editingNoteContent}
                                  onChange={(e) => setEditingNoteContent(e.target.value)}
                                  autoFocus
                                  className="w-full min-h-[80px] bg-white dark:bg-zinc-900 rounded-xl p-3 text-[11px] font-serif italic text-zinc-700 dark:text-zinc-300 border border-primary/20 focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none"
                                />
                                <div className="flex gap-1.5">
                                  <button 
                                    onClick={() => handleUpdateNote(note.id, editingNoteContent)}
                                    className="flex-1 py-1.5 rounded-lg bg-primary text-white text-[8px] font-black uppercase tracking-widest"
                                  >
                                    Update
                                  </button>
                                  <button 
                                    onClick={() => setEditingNoteId(null)}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[8px] font-black uppercase tracking-widest"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p 
                                onClick={() => setScrollToOrder(note.verse.globalOrder)}
                                className="text-xs font-serif italic text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 cursor-pointer"
                              >
                                {note.content}
                              </p>
                            )}
                          </div>
                        ));
                      })()
                    ) : (
                      (() => {
                        const highlightsToShow = session ? journal?.highlights : localHighlights;
                        if (!highlightsToShow || highlightsToShow.length === 0) {
                          return <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300">No illuminations</div>;
                        }
                        return (
                          <div className="grid gap-2">
                            {highlightsToShow.map((h: any) => (
                              <div 
                                key={h.id}
                                className="group w-full text-left p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between transition-all hover:border-primary/20"
                              >
                                <button 
                                  onClick={() => setScrollToOrder(h.verse.globalOrder)}
                                  className="flex items-center gap-3 flex-1"
                                >
                                  <div className={cn("h-3 w-3 rounded-full shadow-sm", {
                                    "bg-yellow-300": h.color === "yellow",
                                    "bg-blue-300": h.color === "blue",
                                    "bg-green-300": h.color === "green",
                                    "bg-red-300": h.color === "red",
                                  })} />
                                  <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">
                                    {h.verse.book.name} {h.verse.chapter}:{h.verse.verse}
                                  </span>
                                </button>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => handleDeleteHighlight(h.id)}
                                    className="p-1.5 rounded-full hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                  <ChevronRight className="h-3 w-3 text-zinc-300" />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                    {!session && (
                      <div className="px-6 py-8 mt-4 bg-primary/5 rounded-[2.5rem] border border-primary/10 text-center space-y-3">
                        <History className="h-6 w-6 text-primary mx-auto opacity-40" />
                        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">Your journal is currently saved to this device only. Join the Sanctuary to sync your study history across all your screens.</p>
                        <button 
                          onClick={() => signIn("google")}
                          className="px-6 py-2 bg-primary text-white rounded-full text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                        >
                          Join the Sanctuary
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-8 mt-6">
                <div className="space-y-3 px-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Typography</span>
                  <div className="p-4 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-between border border-zinc-100/50 dark:border-zinc-800/50">
                    <button onClick={() => setFontSize(fontSize - 1)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-700 shadow-sm text-zinc-600"><Minus className="h-3 w-3" /></button>
                    <span className="text-lg font-black tabular-nums text-zinc-900 dark:text-zinc-100">{fontSize}</span>
                    <button onClick={() => setFontSize(fontSize + 1)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-700 shadow-sm text-zinc-600"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-6 mt-6">
                {session ? (
                  <div className="animate-in fade-in duration-500 space-y-6">
                    <div className="p-6 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100/50 dark:border-zinc-800/50 flex flex-col items-center text-center gap-3">
                      <div className="h-20 w-20 rounded-full border-4 border-white dark:border-zinc-900 shadow-xl overflow-hidden mb-2">
                        {session.user.image ? (
                          <img src={session.user.image} className="h-full w-full object-cover" alt={session.user.name ?? ""} />
                        ) : (
                          <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary">
                            <UserIcon className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-serif font-bold italic text-zinc-900 dark:text-zinc-100 leading-tight">
                          {session.user.name}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                          {session.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300 ml-2">Presence Sync</span>
                      <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <History className="h-4 w-4 text-primary opacity-50" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">Auto-Cloud Sync</span>
                            <span className="text-[8px] font-medium text-zinc-500">Your progress is secured</span>
                          </div>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    </div>

                    <button 
                      onClick={() => void signOut()}
                      className="w-full py-4 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[9px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 py-10 flex flex-col items-center text-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center border-2 border-zinc-100 dark:border-zinc-800 mb-2">
                      <UserIcon className="h-8 w-8 text-zinc-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold italic text-zinc-900 dark:text-zinc-100 mb-2">Join the Sanctuary</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed px-6 font-medium">
                        Sign in to sync your reading progress, bookmarks, and notes across all your devices.
                      </p>
                    </div>
                    <button 
                      onClick={() => signIn("google")}
                      className="w-full py-4 rounded-3xl bg-primary text-white font-black text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign In with Google
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-5 bg-zinc-50/30 dark:bg-zinc-950/10 border-t border-zinc-100/50 dark:border-zinc-800/50 rounded-b-[2.5rem] md:rounded-none flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black text-[10px] border border-primary/10">
                {currentChapter}
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-400">Presence</span>
                <span className="text-xs font-serif font-bold italic truncate text-zinc-900 dark:text-zinc-100">{currentBook?.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FLOATING LISTEN BUTTON */}
      {isVoiceoverActive && isVoiceoverMinimized && (
        <button 
          onClick={() => setIsVoiceoverMinimized(false)}
          className="fixed right-6 bottom-24 z-[100] h-14 w-14 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center animate-in slide-in-from-bottom-10 duration-700 hover:scale-110 active:scale-95 transition-all"
        >
          <Headphones className="h-6 w-6" />
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center">
            <div className={cn("h-2 w-2 rounded-full bg-primary", isVoiceoverPlaying && "animate-pulse")} />
          </div>
        </button>
      )}

      {/* 5. FULL SCRIPTURE OVERLAY */}
      {showFullLiturgical && info && (
        <DailyAllView 
          info={info} 
          onClose={() => setShowFullLiturgical(false)} 
          onSelectReading={handleSelectReading} 
        />
      )}
    </>
  );
}

function ReadingRow({ label, citation, icon: Icon, onSelect }: { label: string, citation: string, icon: any, onSelect: () => void }) {
  return (
    <button 
      onClick={onSelect}
      className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-primary/5 transition-all group active:scale-[0.98]"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Icon className="h-4 w-4 text-zinc-400 group-hover:text-primary" />
        </div>
        <div className="flex flex-col items-start text-left overflow-hidden">
          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</span>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate w-full">{citation}</span>
        </div>
      </div>
      <ChevronRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all" />
    </button>
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
        "h-9 w-9",
        active ? "bg-primary/5 shadow-inner border border-primary/10" : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[7px] font-black uppercase tracking-tight transition-opacity duration-300 hidden md:block",
        "md:opacity-0 md:group-hover:opacity-100",
        active ? "md:opacity-100" : "md:opacity-0"
      )}>
        {label}
      </span>
      {active && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
      )}
    </button>
  );
}
