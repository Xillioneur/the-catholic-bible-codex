"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
  CalendarDays,
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
  MessageSquare,
  Play,
  CheckCircle2,
  Compass,
  Type,
  Moon,
  Wifi,
  Database,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/lib/db";
import { useLiturgical } from "./liturgical-provider";
import { DailyAllView } from "./liturgical-full-view";
import { LiturgicalCalendar } from "./liturgical-calendar";
import { toast } from "sonner";
import { useVoiceover } from "~/hooks/use-voiceover";
import { useSession, signIn, signOut } from "next-auth/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import type { ReadingPlanDayStatus } from "~/workers/reading-plan-worker";

export function SidebarNav() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const scrollRef = useRef<HTMLDivElement>(null);
  const planWorker = useRef<Worker | null>(null);
  const [dayStatuses, setDayStatuses] = useState<Record<number, ReadingPlanDayStatus>>({});
  
  // 1. STATE
  const [activeTab, setActiveTab] = useState<"library" | "daily" | "study" | "sanctuary" | null>(null);
  const [studyFilter, setStudyFilter] = useState<"notes" | "highlights" | "bookmarks" | "plans">("notes");
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(null);
  const [showFullLiturgical, setShowFullLiturgical] = useState(false);
  const [showLiturgicalCalendar, setShowLiturgicalCalendar] = useState(false);
  const [librarySelectedBook, setLibrarySelectedBook] = useState<any | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const [isOnline, setIsOnline] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [isBibleLoaded, setIsBibleLoaded] = useState(false);

  // 2. STORE
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
  const autoProgress = useReaderStore((state) => state.autoProgress);
  const setAutoProgress = useReaderStore((state) => state.setAutoProgress);
  const setJourneyGuide = useReaderStore((state) => state.setJourneyGuide);
  const clearJourneyProgress = useReaderStore((state) => state.clearJourneyProgress);
  const setIsJourneyVoiceActive = useReaderStore((state) => state.setIsJourneyVoiceActive);
  const theme = useReaderStore((state) => state.theme);
  const setTheme = useReaderStore((state) => state.setTheme);
  const lastSync = useReaderStore((state) => state.lastSync);
  const isSyncing = useReaderStore((state) => state.isSyncing);
  const { theme: mode, setTheme: setMode } = useTheme();

  const currentUserId = session?.user?.id ?? "guest";

  // Sync Status Effect
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkBible = async () => {
      try {
        const count = await db.verses.count();
        if (count > 30000) setIsBibleLoaded(true);
      } catch (e) {
        console.error("Bible check failed", e);
      }
    };
    void checkBible();

    const checkSW = async () => {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          if (registration.active) {
            setIsCached(true);
          } else if (registration.installing || registration.waiting) {
            setIsCached(false); 
          }
        } else {
          setIsCached(false);
        }
      }
    };
    
    void checkSW();
    const interval = setInterval(() => {
      void checkSW();
      void checkBible();
    }, 5000);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setIsCached(true);
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleClearCache = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
      toast.success("Sanctuary cache cleared. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  // 3. QUERIES & LOCAL DATA
  const { data: books = [] } = api.bible.getBooks.useQuery();
  const { data: translations = [] } = api.bible.getTranslations.useQuery();
  const { info } = useLiturgical();
  const { jumpToOrder, jumpToText, unlockAudio } = useVoiceover();

  const { data: allPlans = [] } = api.readingPlan.getPlans.useQuery();
  const { data: userPlans = [] } = api.readingPlan.getUserPlans.useQuery(undefined, {
    enabled: !!session
  });

  const { data: planDetails, isLoading: isLoadingPlan } = api.readingPlan.getPlanDetails.useQuery(
    { slug: selectedPlanSlug ?? "", translationSlug, includeOrders: false },
    { enabled: !!selectedPlanSlug && selectedPlanSlug !== "" }
  );

  const rowVirtualizer = useVirtualizer({
    count: planDetails?.days.length ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const bookmarks = useLiveQuery(() => db.bookmarks.where("userId").equals(currentUserId).reverse().limit(10).toArray(), [currentUserId]) ?? [];
  const localNotesRaw = useLiveQuery(() => db.notes.where("userId").equals(currentUserId).reverse().toArray(), [currentUserId]) ?? [];
  const localHighlightsRaw = useLiveQuery(() => db.highlights.where("userId").equals(currentUserId).reverse().toArray(), [currentUserId]) ?? [];
  const localVerseStatuses = useLiveQuery(() => db.verseStatuses.where("userId").equals(currentUserId).toArray(), [currentUserId]) ?? [];
  const localUserPlans = useLiveQuery(() => db.userReadingPlans.where("userId").equals(currentUserId).toArray(), [currentUserId]) ?? [];

  // 4. MEMOS & HELPERS
  const readOrdersSet = useMemo(() => {
    const set = new Set(localVerseStatuses.filter(s => s.isRead).map(s => s.globalOrder));
    return set;
  }, [localVerseStatuses]);

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

  const currentBook = useMemo(() => books?.find(b => b.id === currentBookId), [books, currentBookId]);

  // 5. MUTATIONS
  const updateNoteCloud = api.user.updateNote.useMutation({
    onSuccess: () => {
      utils.user.getSyncData.invalidate();
      utils.user.getJournal.invalidate();
    }
  });

  const deleteNoteCloud = api.user.deleteNote.useMutation({
    onSuccess: () => {
      utils.user.getSyncData.invalidate();
      utils.user.getJournal.invalidate();
    }
  });

  const deleteHighlightCloud = api.user.deleteHighlight.useMutation({
    onSuccess: () => {
      utils.user.getSyncData.invalidate();
      utils.user.getJournal.invalidate();
    }
  });

  const deleteBookmarkCloud = api.user.deleteBookmark.useMutation({
    onSuccess: () => {
      utils.user.getSyncData.invalidate();
    }
  });

  const startPlan = api.readingPlan.startPlan.useMutation({
    onSuccess: () => utils.readingPlan.getUserPlans.invalidate()
  });

  const updatePlanProgress = api.readingPlan.updateProgress.useMutation({
    onSuccess: () => utils.readingPlan.getUserPlans.invalidate()
  });

  const deleteUserPlan = api.readingPlan.deleteUserPlan.useMutation({
    onSuccess: () => {
      utils.readingPlan.getUserPlans.invalidate();
      setSelectedPlanSlug(null);
      toast.success("Journey removed from your Sanctuary");
    }
  });

  const toggleDayCompletion = api.readingPlan.toggleDayCompletion.useMutation({
    onSuccess: () => utils.readingPlan.getUserPlans.invalidate()
  });

  const resetVerseProgress = api.user.resetVerseProgress.useMutation({
    onSuccess: async () => {
      utils.user.getSyncData.invalidate();
      utils.readingPlan.getUserPlans.invalidate();
      await db.verseStatuses.where("userId").equals(currentUserId).delete();
      await db.userReadingPlans.where("userId").equals(currentUserId).modify({
        completedDays: [],
        currentDay: 1,
        isCompleted: false,
        completedAt: undefined
      });
      setIsJourneyVoiceActive(false);
      clearJourneyProgress();
      setJourneyGuide(null);
      toast.success("Sacred journey and mastery reset");
    },
    onError: (e) => {
      console.error("[MASTERY] Reset failed:", e);
      toast.error("Failed to reset progress");
    }
  });

  // 6. HANDLERS
  const handleToggleDay = async (up: any, dayNumber: number, completed: boolean) => {
    if (!up || !up.planId) {
      toast.error("Journey context lost.");
      return;
    }
    try {
      if (session) {
        await toggleDayCompletion.mutateAsync({ planId: up.planId, dayNumber, completed });
      } else {
        let newCompletedDays = [...(up.completedDays || [])];
        if (completed) {
          if (!newCompletedDays.includes(dayNumber)) newCompletedDays.push(dayNumber);
        } else {
          newCompletedDays = newCompletedDays.filter(d => d !== dayNumber);
        }
        const isAllFinished = newCompletedDays.length >= (planDetails?.totalDays || 0);
        await db.userReadingPlans.update(up.id, { 
          completedDays: newCompletedDays,
          isCompleted: isAllFinished,
          completedAt: isAllFinished ? Date.now() : undefined
        });
      }
      if (completed) {
        toast.success(`Day ${dayNumber} Sealed`);
        if (dayNumber === up.currentDay && dayNumber < (planDetails?.totalDays || 0)) {
          const nextDay = dayNumber + 1;
          if (session) {
            await updatePlanProgress.mutateAsync({ planId: up.planId, currentDay: nextDay });
          } else {
            await db.userReadingPlans.update(up.id, { currentDay: nextDay });
          }
        }
      } else {
        toast.info(`Day ${dayNumber} Seal broken`);
      }
    } catch (e) {
      console.error("[JOURNEY] Toggle day error:", e);
      toast.error("Failed to update journey progress");
    }
  };

  const handleUpdateNote = async (note: any, content: string) => {
    try {
      await db.notes.update(note.id as number, { content, updatedAt: Date.now() });
      if (session) {
        updateNoteCloud.mutate({
          globalOrder: note.globalOrder,
          translationSlug: note.translationSlug,
          content: content
        });
      }
      setEditingNoteId(null);
      toast.success("Reflection updated");
    } catch (e) {
      console.error("Update error:", e);
      toast.error("Failed to update reflection");
    }
  };

  const handleDeleteNote = async (note: any) => {
    try {
      if (!note.id) return;
      await db.notes.delete(note.id as number);
      if (session) {
        deleteNoteCloud.mutate({ 
          globalOrder: note.globalOrder, 
          translationSlug: note.translationSlug 
        });
      }
      toast.success("Reflection deleted");
    } catch (e) {
      console.error("Delete error:", e);
      toast.error("Failed to delete reflection");
    }
  };

  const handleDeleteHighlight = async (h: any) => {
    try {
      if (!h.id) return;
      await db.highlights.delete(h.id as number);
      if (session) {
        deleteHighlightCloud.mutate({ 
          globalOrder: h.globalOrder, 
          translationSlug: h.translationSlug 
        });
      }
      toast.success("Highlight removed");
    } catch (e) {
      console.error("Highlight delete error:", e);
      toast.error("Failed to remove highlight");
    }
  };

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

  const handleSelectReading = (type: string) => {
    const reading = liturgicalReadings.find(r => r.type === type);
    if (reading) {
      if (type === "Sequence" && reading.sequenceText) {
        unlockAudio();
        jumpToText(reading.sequenceText);
        toast.success("Sequence: Voiceover Started");
        setActiveTab(null);
        return;
      }

      if (reading.orders.length > 0) {
        const firstOrder = reading.orders[0];
        if (firstOrder) {
          setScrollToOrder(firstOrder);
          setIsNavigatorVisible(true);
          toast.success(`${type} Focused`);
          setActiveTab(null);
        }
      }
    } else {
      toast.error("Reading not found");
    }
  };

  const handleListenAll = useCallback(() => {
    // Find sequence if any
    const sequenceReading = liturgicalReadings.find(r => r.type === "Sequence" && r.sequenceText);
    
    const allOrders = liturgicalReadings.flatMap(r => r.orders);
    const firstOrder = allOrders[0];
    
    if (sequenceReading?.sequenceText) {
      unlockAudio();
      // Playlist will continue with allOrders after sequence finishes due to speakText logic
      jumpToText(sequenceReading.sequenceText);
      // We set the playlist so it continues with Bible text after Sequence
      useReaderStore.getState().setVoiceoverPlaylist(allOrders);
      toast.success("Daily Bread: Starting with Sequence");
      setActiveTab(null);
    } else if (firstOrder !== undefined) {
      unlockAudio();
      jumpToOrder(firstOrder, allOrders);
      toast.success("Daily Bread: Voiceover Started");
      setActiveTab(null);
    } else {
      toast.error("Readings not yet loaded");
    }
  }, [liturgicalReadings, jumpToOrder, jumpToText, unlockAudio]);

  const handleContinuePlan = async (up: any) => {
    const plan = up.plan ?? (allPlans as any[]).find((p: any) => p.id === up.planId);
    const planSlug = plan?.slug;
    if (planSlug) {
      setSelectedPlanSlug(planSlug);
      return;
    }
    toast.error("Could not load journey details");
  };

  // 7. EFFECTS
  useEffect(() => {
    planWorker.current = new Worker(new URL("../workers/reading-plan-worker.ts", import.meta.url));
    planWorker.current.onmessage = (e) => {
      if (e.data.type === "STATUS_RESULT") {
        setDayStatuses(e.data.payload);
      }
    };
    return () => planWorker.current?.terminate();
  }, []);

  useEffect(() => {
    if (planDetails && (session || localUserPlans.length > 0)) {
      const currentPlanProgress = (session ? userPlans : localUserPlans).find((up: any) => up.planId === planDetails.id);
      planWorker.current?.postMessage({
        type: "PROCESS_STATUS",
        payload: {
          days: planDetails.days,
          userPlan: currentPlanProgress,
          totalDays: planDetails.totalDays
        }
      });
    }
  }, [planDetails, session, userPlans, localUserPlans]);

  useEffect(() => {
    const handleOpenPlans = (e: any) => {
      const planSlug = e.detail?.planSlug;
      setActiveTab("study");
      setStudyFilter("plans");
      if (planSlug) {
        setTimeout(() => {
          setSelectedPlanSlug(planSlug);
        }, 100);
      }
    };
    window.addEventListener("open-reading-plans" as any, handleOpenPlans);
    return () => window.removeEventListener("open-reading-plans" as any, handleOpenPlans);
  }, []);

  useEffect(() => {
    if (selectedPlanSlug && planDetails && !isLoadingPlan && Object.keys(dayStatuses).length > 0) {
      const currentPlanProgress = (session ? userPlans : localUserPlans).find((up: any) => up.planId === planDetails.id);
      const currentDay = currentPlanProgress?.currentDay || 1;
      const index = planDetails.days.findIndex(d => d.dayNumber === currentDay);
      if (index !== -1) {
        const timer = setTimeout(() => {
          rowVirtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" });
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedPlanSlug, planDetails, isLoadingPlan, dayStatuses, session, userPlans, localUserPlans, rowVirtualizer]);

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
          "md:w-14 md:h-full md:flex-col md:items-center md:py-8 md:gap-7 md:border-r md:rounded-none",
          "w-full h-14 items-center justify-around px-2 rounded-full border"
        )}>
          <div className="hidden md:flex w-10 h-10 rounded-2xl bg-primary items-center justify-center shadow-2xl shadow-primary/40 mb-4 overflow-hidden flex-shrink-0 group/logo cursor-pointer active:scale-95 transition-all">
            <svg viewBox="0 0 512 512" fill="none" className="w-6 h-6 transform group-hover/logo:rotate-12 transition-transform duration-500">
              <circle cx="256" cy="256" r="240" fill="transparent" stroke="white" strokeWidth="20" className="opacity-40"/>
              <path d="M256 120V392" stroke="white" strokeWidth="40" strokeLinecap="round" className="drop-shadow-sm"/>
              <path d="M160 210H352" stroke="white" strokeWidth="40" strokeLinecap="round" className="drop-shadow-sm"/>
            </svg>
          </div>
          <RailButton icon={<LibraryIcon className="h-4 w-4" />} active={activeTab === "library"} onClick={() => setActiveTab(activeTab === "library" ? null : "library")} label="Library" />
          <RailButton icon={<Sun className="h-4 w-4" />} active={activeTab === "daily"} onClick={() => setActiveTab(activeTab === "daily" ? null : "daily")} label="Daily" />
          <RailButton icon={<BookText className="h-4 w-4" />} active={activeTab === "study"} onClick={() => setActiveTab(activeTab === "study" ? null : "study")} label="Study" />
          <RailButton icon={<Volume2 className={cn("h-4 w-4 transition-all", isVoiceoverPlaying && "animate-pulse text-primary")} />} active={isVoiceoverPlaying} onClick={() => { if (!isVoiceoverPlaying) { unlockAudio(); setIsVoiceoverPlaying(true); setIsActive(true); setIsVoiceoverMinimized(false); } else { setIsVoiceoverPlaying(false); } }} label="Listen" />
          <div className="hidden md:block h-px w-6 bg-zinc-200/50 dark:bg-zinc-800/50 my-1 self-center" />
          <RailButton icon={session?.user?.image ? ( <img src={session.user.image} className="h-4 w-4 rounded-full border border-white/20" alt="Profile" /> ) : ( <UserIcon className="h-4 w-4" /> )} active={activeTab === "sanctuary"} onClick={() => setActiveTab(activeTab === "sanctuary" ? null : "sanctuary")} label="Sanctuary" />
          <button onClick={toggleSidebar} className="hidden md:flex mt-auto mb-4 p-2.5 text-zinc-400 hover:text-primary transition-all active:scale-75">
            <ChevronLeft className="h-4 w-4 opacity-50" />
          </button>
        </div>
      </nav>

      {/* 3. THE UNIFIED FLYOUT PANEL */}
      {activeTab && (
        <div className={cn(
          "fixed glass shadow-2xl border border-white/40 dark:border-zinc-800/40 flex flex-col animate-in duration-500 pointer-events-auto z-[101]",
          "md:left-16 md:top-0 md:bottom-0 md:w-80 md:slide-in-from-left-2 md:rounded-none",
          "left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] rounded-[2.5rem] slide-in-from-bottom-4"
        )}>
          <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50">
            <div className="flex flex-col">
              <h2 className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-400">{activeTab}</h2>
              {info && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                  <span className="text-[7px] font-black uppercase tracking-widest text-primary opacity-70">{info.season}</span>
                </div>
              )}
            </div>
            <button onClick={() => { setActiveTab(null); setLibrarySelectedBook(null); }} className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-elegant">
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
                  <button onClick={() => { setShowFullLiturgical(true); handleListenAll(); }} className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all">
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-1">
                  <ReadingRow label="First" citation={info.readings.firstReading ?? ""} icon={Scroll} onSelect={() => handleSelectReading("First Reading")} />
                  {info.readings.psalm && <ReadingRow label="Psalm" citation={info.readings.psalm} icon={Music} onSelect={() => handleSelectReading("Responsorial Psalm")} />}
                  {info.readings.secondReading && <ReadingRow label="Second" citation={info.readings.secondReading} icon={Scroll} onSelect={() => handleSelectReading("Second Reading")} />}
                  {info.readings.sequence && <ReadingRow label="Sequence" citation={info.readings.sequence} icon={Scroll} onSelect={() => handleSelectReading("Sequence")} />}
                  {(info.readings.alleluia || info.readings.verseBeforeGospel) && <ReadingRow label="Alleluia" citation={info.readings.alleluia || info.readings.verseBeforeGospel} icon={Music} onSelect={() => handleSelectReading("Alleluia")} />}
                  {info.readings.gospel && <ReadingRow label="Gospel" citation={info.readings.gospel ?? ""} icon={Church} onSelect={() => handleSelectReading("The Holy Gospel")} />}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setShowLiturgicalCalendar(true)} className="w-full py-3 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-800 font-black text-[8px] uppercase tracking-[0.2em] hover:border-primary/30 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" /> Browse Full Calendar
                  </button>
                  <button onClick={handleListenAll} className="w-full py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 font-black text-[8px] uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                    <Volume2 className="h-3.5 w-3.5" /> Listen to All
                  </button>
                  <button onClick={() => setShowFullLiturgical(true)} className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[8px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                    View All Readings
                  </button>
                </div>
              </div>
            )}

            {activeTab === "library" && (
              <div className="mt-4 animate-in fade-in duration-300">
                <div className="mb-6">
                  <button onClick={() => { setIsSearchOpen(true); setActiveTab(null); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all group">
                    <Search className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 group-hover:text-primary">Search the Word...</span>
                  </button>
                </div>
                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5 rounded-full border border-zinc-200/20">
                    {translations?.map((t) => (
                      <button key={t.id} onClick={() => setTranslationSlug(t.slug)} className={cn("flex-1 py-1 rounded-full text-[8px] font-black uppercase transition-all", translationSlug === t.slug ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600")}>
                        {t.abbreviation}
                      </button>
                    ))}
                  </div>
                  {!librarySelectedBook ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
                      <input value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} placeholder="Filter 73 Books..." className="w-full h-8 pl-8 pr-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/20 focus:outline-none focus:ring-1 focus:ring-primary/20 text-[10px] font-serif italic" />
                    </div>
                  ) : (
                    <button onClick={() => setLibrarySelectedBook(null)} className="flex items-center gap-2 text-primary hover:opacity-70 transition-all group py-1">
                      <ChevronLeft className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase tracking-widest">Back to Books</span>
                    </button>
                  )}
                </div>
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
                            <button key={book.id} onClick={() => setLibrarySelectedBook(book)} className={cn("w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between group", currentBookId === book.id ? "bg-primary/5 text-primary" : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400")}>
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
                      <h3 className="font-serif font-black italic text-xl text-zinc-900 dark:text-zinc-100 leading-tight">{librarySelectedBook.name}</h3>
                    </div>
                    {isLoadingLibraryChapters ? (
                      <div className="grid grid-cols-6 gap-1.5">
                        {Array.from({ length: 24 }).map((_, i) => ( <div key={i} className="aspect-square rounded-lg bg-zinc-50 dark:bg-zinc-800/50 animate-pulse" /> ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-6 gap-1.5 pb-4">
                        {libraryChapters.map((chapter) => (
                          <button key={chapter} onClick={() => handleBookSelect(librarySelectedBook.slug, chapter)} className={cn("aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all border shadow-sm", currentBookId === librarySelectedBook.id && currentChapter === chapter ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-primary hover:border-primary/40 hover:scale-105 active:scale-95")}>
                            {chapter}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "study" && (
              <div className="mt-4 space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-4 bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5 rounded-full border border-zinc-200/20">
                  <button onClick={() => setStudyFilter("notes")} className={cn("py-1.5 rounded-full text-[7px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5", studyFilter === "notes" ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400")}>
                    <MessageSquare className="h-2.5 w-2.5" /> Notes
                  </button>
                  <button onClick={() => setStudyFilter("highlights")} className={cn("py-1.5 rounded-full text-[7px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5", studyFilter === "highlights" ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400")}>
                    <Highlighter className="h-2.5 w-2.5" /> Highs
                  </button>
                  <button onClick={() => setStudyFilter("bookmarks")} className={cn("py-1.5 rounded-full text-[7px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5", studyFilter === "bookmarks" ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400")}>
                    <Bookmark className="h-2.5 w-2.5" /> Saved
                  </button>
                  <button onClick={() => setStudyFilter("plans")} className={cn("py-1.5 rounded-full text-[7px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5", studyFilter === "plans" ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400")}>
                    <Calendar className="h-2.5 w-2.5" /> Plans
                  </button>
                </div>
                {studyFilter === "notes" && (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    {localNotes.length === 0 ? ( <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300">The page is blank</div> ) : (
                      localNotes.map((note: any) => (
                        <div key={note.id} className="group relative w-full text-left p-4 rounded-[2rem] bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/50 hover:border-primary/20 transition-all overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setScrollToOrder(note.verse.globalOrder)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">{note.verse.book.abbreviation} {note.verse.chapter}:{note.verse.verse}</button>
                            <div className="flex items-center gap-1">
                              <span className="text-[7px] font-bold text-zinc-400 mr-1">{new Date(note.updatedAt).toLocaleDateString()}</span>
                              <button onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }} className="p-1 rounded-full hover:bg-primary/10 text-zinc-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"> <Settings2 className="h-2.5 w-2.5" /> </button>
                              <button onClick={() => handleDeleteNote(note)} className="p-1 rounded-full hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"> <Trash2 className="h-2.5 w-2.5" /> </button>
                            </div>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              <textarea value={editingNoteContent} onChange={(e) => setEditingNoteContent(e.target.value)} autoFocus className="w-full min-h-[80px] bg-white dark:bg-zinc-900 rounded-xl p-3 text-[11px] font-serif italic text-zinc-700 dark:text-zinc-300 border border-primary/20 focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none" />
                              <div className="flex gap-1.5">
                                <button onClick={() => handleUpdateNote(note, editingNoteContent)} className="flex-1 py-1.5 rounded-lg bg-primary text-white text-[8px] font-black uppercase tracking-widest">Update</button>
                                <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[8px] font-black uppercase tracking-widest">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p onClick={() => setScrollToOrder(note.verse.globalOrder)} className="text-xs font-serif italic text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 cursor-pointer">{note.content}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {studyFilter === "highlights" && (
                  <div className="space-y-2 animate-in fade-in duration-500">
                    {localHighlights.length === 0 ? ( <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300">No illuminations</div> ) : (
                      localHighlights.map((h: any) => (
                        <div key={h.id} className="group w-full text-left p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between transition-all hover:border-primary/20">
                          <button onClick={() => setScrollToOrder(h.verse.globalOrder)} className="flex items-center gap-3 flex-1">
                            <div className={cn("h-3 w-3 rounded-full shadow-sm", { "bg-yellow-300": h.color === "yellow", "bg-blue-300": h.color === "blue", "bg-green-300": h.color === "green", "bg-red-300": h.color === "red", })} />
                            <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{h.verse.book.name} {h.verse.chapter}:{h.verse.verse}</span>
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleDeleteHighlight(h)} className="p-1.5 rounded-full hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"> <Trash2 className="h-3 w-3" /> </button>
                            <ChevronRight className="h-3 w-3 text-zinc-300" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {studyFilter === "bookmarks" && (
                  <div className="space-y-2 animate-in fade-in duration-500">
                    {bookmarks.length === 0 ? ( <div className="py-20 text-center flex flex-col items-center gap-3 text-zinc-300"> <Bookmark className="h-6 w-6 opacity-20" /> <span className="text-[8px] font-black uppercase tracking-widest">Quiet Sanctuary</span> </div> ) : (
                      bookmarks.map(b => (
                        <div key={b.id} className="relative group">
                          <button onClick={() => { if (b.globalOrder) { setScrollToOrder(b.globalOrder); setActiveTab(null); } else { toast.error("Older bookmark: please re-save."); } }} className="w-full text-left p-4 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 hover:border-primary/20 hover:bg-primary/[0.01] transition-all">
                            <span className="text-[9px] font-black uppercase text-primary tracking-widest block mb-1">{books?.find(bk => bk.id === b.bookId)?.abbreviation} {b.chapter}:{b.verse}</span>
                            <p className="text-[11px] font-serif italic text-zinc-500 truncate pr-8">Saved verse</p>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); if (!b.id) return; void db.bookmarks.delete(b.id!); if (session) { deleteBookmarkCloud.mutate({ globalOrder: b.globalOrder, translationSlug: b.translationSlug }); } toast.success("Bookmark removed"); }} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all md:opacity-0 md:group-hover:opacity-100"> <Trash2 className="h-3.5 w-3.5" /> </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {studyFilter === "plans" && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {selectedPlanSlug ? (
                      <div className="space-y-6">
                        <button onClick={() => setSelectedPlanSlug(null)} className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-all group px-1"> <ChevronLeft className="h-4 w-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Back to Journeys</span> </button>
                        {isLoadingPlan ? ( <div className="space-y-3 px-1"> {Array.from({ length: 8 }).map((_, i) => ( <div key={i} className="h-20 w-full rounded-[1.5rem] bg-zinc-100/50 dark:bg-zinc-800/30 animate-pulse border border-zinc-100 dark:border-zinc-800" /> ))} </div> ) : planDetails ? (
                          <div className="space-y-6">
                            <div className="px-1 space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2 flex-1"> <h3 className="text-lg font-serif font-bold italic text-zinc-900 dark:text-zinc-100">{planDetails.name}</h3> <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">{planDetails.description}</p> </div>
                                <button onClick={() => { if (confirm("Are you sure you want to remove this journey and reset your progress?")) { if (session) { deleteUserPlan.mutate({ planId: planDetails.id }); } else { const localPlan = localUserPlans.find((up: any) => up.planId === planDetails.id); if (localPlan?.id) { void db.userReadingPlans.delete(localPlan.id); setSelectedPlanSlug(null); toast.success("Journey removed locally"); } } } }} className="p-2 rounded-full hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors shrink-0" title="Remove Journey"> <Trash2 className="h-4 w-4" /> </button>
                              </div>
                              <div className="flex flex-col gap-3">
                                <button onClick={async () => { const currentPlanProgress = (session ? userPlans : localUserPlans).find((up: any) => up.planId === planDetails.id); const currentDayNum = currentPlanProgress?.currentDay || 1; const targetDay = planDetails.days.find(d => d.dayNumber === currentDayNum) || planDetails.days[0]; if (targetDay) { toast.loading("Resolving Scripture...", { id: "resume-resolve" }); const orders = await utils.readingPlan.getPlanDayVerses.fetch({ planId: planDetails.id, dayNumber: targetDay.dayNumber, translationSlug }); toast.dismiss("resume-resolve"); if (orders?.[0] !== undefined) { setScrollToOrder(orders[0]); setActiveTab(null); toast.success(`Resuming: Day ${targetDay.dayNumber}`); } else { toast.error("Could not load journey text."); } } }} className="w-full py-3 rounded-2xl bg-primary text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"> <Play className="h-3.5 w-3.5 fill-current" /> Resume Journey </button>
                                {(() => { const currentPlanProgress = (session ? userPlans : localUserPlans).find((up: any) => up.planId === planDetails.id); const startedAt = currentPlanProgress?.startedAt; if (!startedAt) return null; const startedDate = new Date(startedAt); const diff = Date.now() - startedDate.getTime(); const calendarDay = Math.min(planDetails.totalDays, Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)); if (calendarDay > (currentPlanProgress?.currentDay || 1)) { return ( <button onClick={() => { if (session) { updatePlanProgress.mutate({ planId: planDetails.id, currentDay: calendarDay }); } else { if (currentPlanProgress.id) { void db.userReadingPlans.update(currentPlanProgress.id, { currentDay: calendarDay }); } } toast.success(`Journey synced to Day ${calendarDay}`); }} className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[8px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all flex items-center justify-center gap-2 border border-zinc-200/50 dark:border-zinc-700/50"> <CalendarDays className="h-3 w-3" /> Sync to Today (Day {calendarDay}) </button> ); } return null; })()}
                              </div>
                            </div>
                            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const day = planDetails.days[virtualItem.index];
                                if (!day) return null;
                                const currentPlanProgress = (session ? userPlans : localUserPlans).find((up: any) => up.planId === planDetails.id);
                                const status = dayStatuses[day.dayNumber] || { dayNumber: day.dayNumber, dateStr: "", isOverdue: false, isCurrent: currentPlanProgress?.currentDay === day.dayNumber, isSealed: currentPlanProgress?.completedDays?.includes(day.dayNumber) };
                                return (
                                  <div key={day.id} className="absolute top-0 left-0 w-full" style={{ height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }}>
                                    <div className="p-1 px-1">
                                      <button onClick={async () => { toast.loading("Resolving Scripture...", { id: "resolve-day" }); const orders = await utils.readingPlan.getPlanDayVerses.fetch({ planId: planDetails.id, dayNumber: day.dayNumber, translationSlug }); toast.dismiss("resolve-day"); const firstOrder = orders?.[0]; if (firstOrder !== undefined) { setScrollToOrder(firstOrder); setActiveTab(null); toast.success(`Journey: Day ${day.dayNumber}`); } else { toast.error("Could not load verses for this day."); } }} className={cn("w-full h-full flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all text-left group", status.isSealed ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30" : status.isCurrent ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" : status.isOverdue ? "bg-rose-50/30 dark:bg-rose-950/5 border-rose-100/50 dark:border-rose-900/20" : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-primary/20")}>
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all", status.isSealed ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" : status.isCurrent ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : status.isOverdue ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-500" : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-400 group-hover:border-primary/20")}> {status.isSealed ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-[11px] font-black">{day.dayNumber}</span>} </div>
                                        <div className="flex flex-col gap-0.5 overflow-hidden flex-1"> <div className="flex items-center gap-2"> <span className={cn("text-[10px] font-black uppercase tracking-tight truncate", status.isSealed ? "text-emerald-600 dark:text-emerald-400" : status.isCurrent ? "text-primary" : status.isOverdue ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100")}> {day.title || `Day ${day.dayNumber}`} </span> {status.isOverdue && !status.isSealed && ( <span className="text-[6px] font-black uppercase bg-rose-500 text-white px-1 py-0.5 rounded-sm animate-pulse">Missed</span> )} {status.dateStr && ( <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-tighter bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-sm"> {status.dateStr} </span> )} </div> <span className="text-[9px] font-serif italic text-zinc-500 truncate"> {day.references.join(", ")} </span> </div>
                                      </button>
                                      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button onClick={async (e) => { e.stopPropagation(); if (planDetails) { toast.loading("Activating Guide...", { id: "resolve-guide" }); const orders = await utils.readingPlan.getPlanDayVerses.fetch({ planId: planDetails.id, dayNumber: day.dayNumber, translationSlug }); toast.dismiss("resolve-guide"); if (orders?.length > 0) { setJourneyGuide({ planId: planDetails.id, planName: planDetails.name, planSlug: planDetails.slug, dayNumber: day.dayNumber, orders: orders, references: day.references }); setActiveTab(null); toast.success(`Guide active for Day ${day.dayNumber}`); } } }} className="p-2 rounded-full text-zinc-300 hover:text-primary hover:bg-primary/5 transition-all" title="Activate Guide"> <Compass className="h-4 w-4" /> </button>
                                        <button onClick={(e) => { e.stopPropagation(); if (currentPlanProgress) { handleToggleDay(currentPlanProgress, day.dayNumber, !status.isSealed); } }} className={cn("p-2 rounded-full transition-all", status.isSealed ? "text-emerald-500 hover:bg-emerald-100/50" : "text-zinc-300 hover:text-primary hover:bg-primary/5")} title={status.isSealed ? "Break the Seal" : "Seal with Amen"}> <Scroll className={cn("h-4 w-4", status.isSealed && "fill-current")} /> </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : ( <div className="py-20 text-center text-zinc-400">Journey not found</div> )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300 ml-2">Active Journeys</span>
                          {(session ? userPlans : localUserPlans).length === 0 ? ( <div className="p-8 text-center rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800"> <p className="text-[10px] font-medium text-zinc-400">No active plans. Start a new journey below.</p> </div> ) : (
                            (session ? userPlans : localUserPlans).map((up: any) => {
                              const plan = session ? up.plan : allPlans.find((p: any) => p.id === up.planId);
                              if (!plan) return null;
                              const progress = Math.round((up.currentDay / plan.totalDays) * 100);
                              return (
                                <div key={up.id} className="p-4 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-3">
                                  <div className="flex items-center justify-between"> <div className="flex flex-col"> <span className="text-[10px] font-black text-primary uppercase tracking-tight">{plan.name}</span> <span className="text-[8px] font-medium text-zinc-500">Day {up.currentDay} of {plan.totalDays}</span> </div> <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center text-[9px] font-black text-primary"> {progress}% </div> </div>
                                  <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"> <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /> </div>
                                  <button onClick={() => handleContinuePlan(up)} className="w-full py-2 rounded-xl bg-primary text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/10"> Continue Journey </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="space-y-3">
                          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300 ml-2">Discover Plans</span>
                          {allPlans.length === 0 ? ( <div className="p-8 text-center rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800"> <p className="text-[10px] font-medium text-zinc-400">No journeys found on the Sanctuary server.</p> </div> ) : (
                            <div className="grid gap-3">
                              {allPlans.filter(p => !(session ? userPlans : localUserPlans).some((up: any) => up.planId === p.id)).map(plan => (
                                <div key={plan.id} className="p-4 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-primary/20 transition-all group text-left">
                                  <h4 className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-1">{plan.name}</h4>
                                  <p className="text-[10px] font-serif italic text-zinc-500 mb-4 leading-relaxed line-clamp-2">{plan.description}</p>
                                  <div className="flex items-center justify-between"> <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{plan.totalDays} Days • {plan.category}</span> <button onClick={async () => { if (session) { startPlan.mutate({ planId: plan.id }); } else { await db.userReadingPlans.add({ userId: currentUserId, planId: plan.id, currentDay: 1, completedDays: [], isCompleted: false, startedAt: Date.now() }); toast.success("Plan started locally"); } }} className="px-4 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[8px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all"> Start </button> </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!session && (
                  <div className="px-6 py-6 mt-4 bg-primary/5 rounded-[2.5rem] border border-primary/10 text-center space-y-3">
                    <History className="h-5 w-5 text-primary mx-auto opacity-40" />
                    <p className="text-[9px] font-medium text-zinc-500 leading-relaxed">Join the Sanctuary to sync your study history across all your screens.</p>
                    <button onClick={() => signIn("google")} className="px-6 py-2 bg-primary text-white rounded-full text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"> Join the Sanctuary </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "sanctuary" && (
              <div className="space-y-8 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {session ? (
                  <div className="space-y-6">
                    <div className="p-6 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100/50 dark:border-zinc-800/50 flex flex-col items-center text-center gap-3">
                      <div className="h-20 w-20 rounded-full border-4 border-white dark:border-zinc-900 shadow-xl overflow-hidden mb-2">
                        {session.user.image ? ( <img src={session.user.image} className="h-full w-full object-cover" alt={session.user.name ?? ""} /> ) : ( <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary"> <UserIcon className="h-8 w-8" /> </div> )}
                      </div>
                      <div> <h3 className="text-lg font-serif font-bold italic text-zinc-900 dark:text-zinc-100 leading-tight"> {session.user.name} </h3> <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1"> {session.user.email} </p> </div>
                    </div>

                    <div className="space-y-3 px-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-2">Sanctuary Health</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100/50 dark:border-zinc-800/50">
                          <div className="flex items-center gap-2">
                            <Wifi className={cn("h-3 w-3", isOnline ? "text-emerald-500" : "text-zinc-500")} />
                            <span className="text-[9px] font-bold uppercase text-zinc-500">Network</span>
                          </div>
                          <span className="text-[10px] font-medium">{isOnline ? "Connected" : "Offline"}</span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100/50 dark:border-zinc-800/50">
                          <div className="flex items-center gap-2">
                            <Database className={cn("h-3 w-3", isCached ? "text-emerald-500" : "text-zinc-500")} />
                            <span className="text-[9px] font-bold uppercase text-zinc-500">Storage</span>
                          </div>
                          <span className="text-[10px] font-medium">{isCached ? "Encrypted" : "Syncing..."}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 p-4 rounded-[2rem] bg-primary/5 border border-primary/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <History className="h-3 w-3 text-primary" />
                            <span className="text-[9px] font-bold uppercase text-primary/80">Last Saved</span>
                          </div>
                          {isSyncing && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                        </div>
                        <span className="text-[11px] font-semibold">
                          {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true }) : "No sync yet"}
                        </span>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/5">
                          <ShieldCheck className="h-3 w-3 text-primary/60" />
                          <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-500">
                            {session ? "Cloud Sanctuary Active" : "Local Sanctuary Active"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-all active:scale-95"> <RefreshCw className="h-3 w-3" /> <span className="text-[9px] font-black uppercase">Refresh</span> </button>
                        <button onClick={handleClearCache} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-all active:scale-95"> <Trash2 className="h-3 w-3" /> <span className="text-[9px] font-black uppercase">Clear Cache</span> </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center text-center gap-6">
                    <div className="h-16 w-16 rounded-full bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center border-2 border-zinc-100 dark:border-zinc-800"> <UserIcon className="h-6 w-6 text-zinc-300" /> </div>
                    <div> <h3 className="text-lg font-serif font-bold italic text-zinc-900 dark:text-zinc-100 mb-2">The Sanctuary</h3> <p className="text-[10px] text-zinc-500 leading-relaxed px-6 font-medium"> Secure your progress and notes in the cloud. </p> </div>
                    <button onClick={() => signIn("google")} className="w-full py-3 rounded-2xl bg-primary text-white font-black text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"> <LogIn className="h-3.5 w-3.5" /> Sign In </button>
                  </div>
                )}

                <div className="space-y-6 px-1">
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-2">Presence Tracking</span>
                    <button onClick={() => setAutoProgress(!autoProgress)} className="w-full p-4 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100/50 dark:border-zinc-800/50 flex items-center justify-between group transition-all hover:border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-colors", autoProgress ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400")}> <History className="h-4 w-4" /> </div>
                        <div className="flex flex-col items-start"> <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">Automatic Sync</span> <span className="text-[8px] font-medium text-zinc-500">Save reading position as you scroll</span> </div>
                      </div>
                      <div className={cn("w-10 h-5 rounded-full transition-all flex items-center px-1", autoProgress ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700")}> <div className={cn("h-3 w-3 rounded-full bg-white transition-all shadow-sm", autoProgress ? "translate-x-5" : "translate-x-0")} /> </div>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-2">Mastery Tools</span>
                    <button onClick={() => { if (confirm("This will permanently remove all emerald mastery checkmarks from the Bible. Your notes and bookmarks will be preserved. Proceed?")) { if (session) { resetVerseProgress.mutate(); } else { void db.verseStatuses.where("userId").equals("guest").delete().then(() => { toast.success("Local mastery history cleared"); }); } } }} className="w-full p-4 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100/50 dark:border-zinc-800/50 flex items-center justify-between group transition-all hover:border-rose-500/20">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-xl bg-rose-500/5 text-rose-500 flex items-center justify-center transition-colors group-hover:bg-rose-500 group-hover:text-white")}> <Trash2 className="h-4 w-4" /> </div>
                        <div className="flex flex-col items-start text-left"> <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">Reset Mastery</span> <span className="text-[8px] font-medium text-zinc-500 leading-tight">Clear all \"Mark as Read\" history</span> </div>
                      </div>
                      <ChevronRight className="h-3 w-3 text-zinc-300" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-2">Atmosphere</span>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-50 dark:bg-zinc-800/30 rounded-[2.5rem] border border-zinc-100/50 dark:border-zinc-800/50">
                      {[ { id: "sanctuary", label: "Sanctuary", icon: Church }, { id: "traditional", label: "Classic", icon: Type }, { id: "midnight", label: "Midnight", icon: Moon }, ].map((t) => (
                        <button key={t.id} onClick={() => { setTheme(t.id as any); if (t.id === "midnight") setMode("dark"); }} className={cn("flex flex-col items-center gap-1.5 py-3 rounded-[2rem] transition-all", theme === t.id ? "bg-white dark:bg-zinc-700 shadow-sm text-primary ring-1 ring-primary/10" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200")}> <t.icon className="h-4 w-4" /> <span className="text-[8px] font-black uppercase tracking-tighter">{t.label}</span> </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-2">Appearance</span>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-50 dark:bg-zinc-800/30 rounded-[2.5rem] border border-zinc-100/50 dark:border-zinc-800/50">
                      {[ { id: "light", label: "Light", icon: Sun }, { id: "dark", label: "Dark", icon: Moon }, { id: "system", label: "System", icon: Settings2 }, ].map((m) => (
                        <button key={m.id} onClick={() => setMode(m.id)} className={cn("flex flex-col items-center gap-1.5 py-3 rounded-[2rem] transition-all", mode === m.id ? "bg-white dark:bg-zinc-700 shadow-sm text-primary ring-1 ring-primary/10" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200")}> <m.icon className="h-4 w-4" /> <span className="text-[8px] font-black uppercase tracking-tighter">{m.label}</span> </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block ml-2">Text Size</span>
                    <div className="p-4 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-between border border-zinc-100/50 dark:border-zinc-800/50">
                      <button onClick={() => setFontSize(fontSize - 1)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-700 shadow-sm text-zinc-600 hover:text-primary transition-colors"><Minus className="h-3 w-3" /></button>
                      <span className="text-lg font-black tabular-nums text-zinc-900 dark:text-zinc-100">{fontSize}</span>
                      <button onClick={() => setFontSize(fontSize + 1)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-700 shadow-sm text-zinc-600 hover:text-primary transition-colors"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
                {session && ( <button onClick={() => void signOut()} className="w-full py-4 rounded-3xl bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 font-black text-[9px] uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2"> <LogOut className="h-3.5 w-3.5" /> Sign Out </button> )}
              </div>
            )}
          </div>
          <div className="p-5 bg-zinc-50/30 dark:bg-zinc-950/10 border-t border-zinc-100/50 dark:border-zinc-800/50 rounded-b-[2.5rem] md:rounded-none flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black text-[10px] border border-primary/10"> {currentChapter} </div>
              <div className="flex flex-col"> <span className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-400">Presence</span> <span className="text-xs font-serif font-bold italic truncate text-zinc-900 dark:text-zinc-100">{currentBook?.name}</span> </div>
            </div>
          </div>
        </div>
      )}
      {isVoiceoverActive && isVoiceoverMinimized && ( <button onClick={() => setIsVoiceoverMinimized(false)} className="fixed right-6 bottom-24 z-[100] h-14 w-14 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center animate-in slide-in-from-bottom-10 duration-700 hover:scale-110 active:scale-95 transition-all"> <Headphones className="h-6 w-6" /> <div className="absolute -top-1 -right-1 h-4 w-4 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center"> <div className={cn("h-2 w-2 rounded-full bg-primary", isVoiceoverPlaying && "animate-pulse")} /> </div> </button> )}
      {showFullLiturgical && info && ( <DailyAllView info={info} onClose={() => setShowFullLiturgical(false)} onSelectReading={handleSelectReading} /> )}
      {showLiturgicalCalendar && ( <LiturgicalCalendar onClose={() => setShowLiturgicalCalendar(false)} /> )}
    </>
  );
}

function ReadingRow({ label, citation, icon: Icon, onSelect }: { label: string, citation?: string, icon: any, onSelect: () => void }) {
  return ( <button onClick={onSelect} className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-primary/5 transition-all group active:scale-[0.98]"> <div className="flex items-center gap-3 overflow-hidden"> <div className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors"> <Icon className="h-4 w-4 text-zinc-400 group-hover:text-primary" /> </div> <div className="flex flex-col items-start text-left overflow-hidden"> <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</span> <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate w-full"> {label === "Sequence" ? "Victimae Paschali Laudes" : (citation ?? "")} </span> </div> </div> <ChevronRight className="h-3 w-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all" /> </button> );
}

function RailButton({ icon, active, onClick, label }: { icon: React.ReactNode, active?: boolean, onClick: () => void, label: string }) {
  return ( <button onClick={onClick} className={cn("group relative flex flex-col items-center gap-1 transition-all duration-300 active:scale-90 touch-none", "flex-shrink-0 md:w-auto w-12", active ? "text-primary" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100")}> <div className={cn("rounded-xl flex items-center justify-center transition-all duration-500", "h-9 w-9", active ? "bg-primary/5 shadow-inner border border-primary/10" : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800")}> {icon} </div> <span className={cn("text-[7px] font-black uppercase tracking-tight transition-opacity duration-300 hidden md:block", "md:opacity-0 md:group-hover:opacity-100", active ? "md:opacity-100" : "md:opacity-0")}> {label} </span> {active && ( <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" /> )} </button> );
}
