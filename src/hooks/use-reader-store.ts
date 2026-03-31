import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Reading {
  type: string;
  citation: string;
  orders: number[];
  verses?: any[]; // Full cached verse data for instant loading
}

interface ReaderState {
  translationSlug: string;
  setTranslationSlug: (slug: string) => void;
  currentBookId: number | null;
  setCurrentBookId: (id: number | null) => void;
  currentChapter: number | null;
  setCurrentChapter: (chapter: number | null) => void;
  
  // LIVE POSITION
  currentOrder: number;
  setCurrentOrder: (order: number) => void;
  lastVisibleOrder: number;
  setLastVisibleOrder: (order: number) => void;
  progress: number;
  setProgress: (val: number) => void;
  totalVerseCount: number;
  setTotalVerseCount: (count: number) => void;

  // Navigation
  scrollToOrder: number | null;
  setScrollToOrder: (order: number | null) => void;
  
  // ADVANCED HIGHLIGHTING (The Sanctuary Layer)
  liturgicalReadings: Reading[];
  setLiturgicalReadings: (readings: Reading[]) => void;
  liturgicalGuide: {
    type: string;
    citation: string;
    order: number;
  } | null;
  setLiturgicalGuide: (guide: { type: string; citation: string; order: number } | null) => void;
  isNavigatorVisible: boolean;
  setIsNavigatorVisible: (visible: boolean) => void;
  activeReadingType: string | null;
  setActiveReadingType: (type: string | null) => void;
  
  // Search UI
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchHighlight: {
    query: string;
    targetOrder: number | null;
  } | null;
  setSearchHighlight: (highlight: { query: string; targetOrder: number | null } | null) => void;

  // Journey Guide
  journeyGuide: {
    planId: string;
    planName: string;
    planSlug: string;
    dayNumber: number;
    orders: number[];
    references: string[];
  } | null;
  setJourneyGuide: (guide: { planId: string; planName: string; planSlug: string; dayNumber: number; orders: number[]; references: string[] } | null) => void;

  // Journey Session Progress (tracks specifically which assigned verses have been scrolled past)
  journeySeenOrders: Record<string, number[]>; // planId-dayNumber -> array of globalOrders
  addJourneySeenOrder: (key: string, orders: number[]) => void;
  clearDayProgress: (key: string) => void;
  clearJourneyProgress: () => void;

  // Sidebar UI
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Advanced Settings
  fontSize: number;
  setFontSize: (size: number) => void;
  autoProgress: boolean;
  setAutoProgress: (enabled: boolean) => void;
  theme: "sanctuary" | "traditional" | "midnight";
  setTheme: (theme: "sanctuary" | "traditional" | "midnight") => void;

  // VOICEOVER
  isVoiceoverPlaying: boolean;
  setIsVoiceoverPlaying: (playing: boolean) => void;
  isVoiceoverActive: boolean;
  setIsVoiceoverActive: (active: boolean) => void;
  isVoiceoverMinimized: boolean;
  setIsVoiceoverMinimized: (minimized: boolean) => void;
  voiceoverSpeed: number;
  setVoiceoverSpeed: (speed: number) => void;
  voiceoverCurrentOrder: number | null;
  setVoiceoverCurrentOrder: (order: number | null) => void;
  voiceoverCurrentVerse: any | null;
  setVoiceoverCurrentVerse: (verse: any | null) => void;
  voiceoverProgress: number;
  setVoiceoverProgress: (progress: number) => void;
  isVoiceoverFollowEnabled: boolean;
  setIsVoiceoverFollowEnabled: (enabled: boolean) => void;
  isVoiceoverReadTitlesEnabled: boolean;
  setIsVoiceoverReadTitlesEnabled: (enabled: boolean) => void;
  voiceoverVoiceURI: string | null;
  setVoiceoverVoiceURI: (uri: string | null) => void;
  voiceoverPlaylist: number[] | null;
  setVoiceoverPlaylist: (playlist: number[] | null) => void;
  resetVoiceover: () => void;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      translationSlug: "drb",
      setTranslationSlug: (slug) => set({ translationSlug: slug }),
      currentBookId: null,
      setCurrentBookId: (id) => set({ currentBookId: id }),
      currentChapter: null,
      setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
      
      currentOrder: 1,
      setCurrentOrder: (order) => set({ currentOrder: order }),
      lastVisibleOrder: 1,
      setLastVisibleOrder: (order) => set({ lastVisibleOrder: order }),
      progress: 0,
      setProgress: (val) => set({ progress: val }),
      totalVerseCount: 0,
      setTotalVerseCount: (count) => set({ totalVerseCount: count }),

      scrollToOrder: null,
      setScrollToOrder: (order) => set({ scrollToOrder: order }),
      
      liturgicalReadings: [],
      setLiturgicalReadings: (readings) => set({ liturgicalReadings: readings }),
      liturgicalGuide: null,
      setLiturgicalGuide: (guide) => set({ liturgicalGuide: guide }),
      isNavigatorVisible: false,
      setIsNavigatorVisible: (visible) => set({ isNavigatorVisible: visible }),
      activeReadingType: null,
      setActiveReadingType: (type) => set({ activeReadingType: type }),

      isSearchOpen: false,
      setIsSearchOpen: (open) => set({ isSearchOpen: open }),
      searchHighlight: null,
      setSearchHighlight: (highlight) => set({ searchHighlight: highlight }),

      journeyGuide: null,
      setJourneyGuide: (guide) => set({ journeyGuide: guide }),

      journeySeenOrders: {},
      addJourneySeenOrder: (key, orders) => set((state) => {
        const existing = state.journeySeenOrders[key] || [];
        const newOrders = orders.filter(o => !existing.includes(o));
        if (newOrders.length === 0) return state;
        return {
          journeySeenOrders: {
            ...state.journeySeenOrders,
            [key]: [...existing, ...newOrders]
          }
        };
      }),
      clearDayProgress: (key) => set((state) => {
        const next = { ...state.journeySeenOrders };
        delete next[key];
        return { journeySeenOrders: next };
      }),
      clearJourneyProgress: () => set({ journeySeenOrders: {} }),

      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      fontSize: 18,
      setFontSize: (size) => set({ fontSize: size }),
      autoProgress: true,
      setAutoProgress: (enabled) => set({ autoProgress: enabled }),
      theme: "sanctuary",
      setTheme: (theme) => set({ theme }),

      // VOICEOVER
      isVoiceoverPlaying: false,
      setIsVoiceoverPlaying: (playing) => set({ isVoiceoverPlaying: playing }),
      isVoiceoverActive: false,
      setIsVoiceoverActive: (active) => set({ isVoiceoverActive: active }),
      isVoiceoverMinimized: false,
      setIsVoiceoverMinimized: (minimized) => set({ isVoiceoverMinimized: minimized }),
      voiceoverSpeed: 1.0,
      setVoiceoverSpeed: (speed) => set({ voiceoverSpeed: speed }),
      voiceoverCurrentOrder: null,
      setVoiceoverCurrentOrder: (order) => set({ voiceoverCurrentOrder: order }),
      voiceoverCurrentVerse: null,
      setVoiceoverCurrentVerse: (verse) => set({ voiceoverCurrentVerse: verse }),
      voiceoverProgress: 0,
      setVoiceoverProgress: (progress) => set({ voiceoverProgress: progress }),
      isVoiceoverFollowEnabled: true,
      setIsVoiceoverFollowEnabled: (enabled) => set({ isVoiceoverFollowEnabled: enabled }),
      isVoiceoverReadTitlesEnabled: true,
      setIsVoiceoverReadTitlesEnabled: (enabled) => set({ isVoiceoverReadTitlesEnabled: enabled }),
      voiceoverVoiceURI: null,
      setVoiceoverVoiceURI: (uri) => set({ voiceoverVoiceURI: uri }),
      voiceoverPlaylist: null,
      setVoiceoverPlaylist: (playlist) => set({ voiceoverPlaylist: playlist }),
      resetVoiceover: () => set({
        isVoiceoverPlaying: false,
        isVoiceoverActive: false,
        isVoiceoverMinimized: false,
        voiceoverCurrentVerse: null,
        voiceoverCurrentOrder: null,
        voiceoverPlaylist: null,
        voiceoverProgress: 0,
      }),
    }),
    {
      name: "bible-reader-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        translationSlug: state.translationSlug,
        currentOrder: state.currentOrder,
        lastVisibleOrder: state.lastVisibleOrder,
        journeySeenOrders: state.journeySeenOrders,
        fontSize: state.fontSize,
        autoProgress: state.autoProgress,
        theme: state.theme,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
