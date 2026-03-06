import { create } from "zustand";

interface ReadingTarget {
  citation: string;
  bookSlug: string;
  chapter: number;
  verses: number[];
  order: number;
  type?: "First" | "Psalm" | "Second" | "Gospel";
}

interface ReaderState {
  translationSlug: string;
  setTranslationSlug: (slug: string) => void;
  currentBookId: number | null;
  setCurrentBookId: (id: number | null) => void;
  currentChapter: number | null;
  setCurrentChapter: (chapter: number | null) => void;
  
  // Navigation
  scrollToOrder: number | null;
  setScrollToOrder: (order: number | null) => void;
  
  // Highlighting System
  highlightedOrders: number[];
  highlightMetadata: {
    type?: string;
    citation?: string;
  } | null;
  setHighlightedOrders: (orders: number[], metadata?: { type?: string; citation?: string }) => void;
  
  // Guide System
  liturgicalGuide: ReadingTarget | null;
  setLiturgicalGuide: (guide: ReadingTarget | null) => void;

  // Search UI
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchHighlight: {
    query: string;
    targetOrder: number | null;
  } | null;
  setSearchHighlight: (highlight: { query: string; targetOrder: number | null } | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  translationSlug: "drb",
  setTranslationSlug: (slug) => set({ translationSlug: slug }),
  currentBookId: null,
  setCurrentBookId: (id) => set({ currentBookId: id }),
  currentChapter: null,
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  
  scrollToOrder: null,
  setScrollToOrder: (order) => set({ scrollToOrder: order }),
  
  highlightedOrders: [],
  highlightMetadata: null,
  setHighlightedOrders: (orders, metadata) => set({ 
    highlightedOrders: orders, 
    highlightMetadata: metadata ?? null 
  }),
  
  liturgicalGuide: null,
  setLiturgicalGuide: (guide) => set({ liturgicalGuide: guide }),

  isSearchOpen: false,
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
  searchHighlight: null,
  setSearchHighlight: (highlight) => set({ searchHighlight: highlight }),
}));
