import { create } from "zustand";

interface ReadingTarget {
  citation: string;
  bookSlug: string;
  chapter: number;
  verses: number[];
  order: number;
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
  
  // Highlighting
  liturgicalHighlight: {
    bookSlug: string;
    chapter: number;
    verses: number[];
  } | null;
  setLiturgicalHighlight: (highlight: { bookSlug: string; chapter: number; verses: number[] } | null) => void;
  
  // Guide System
  liturgicalGuide: ReadingTarget | null;
  setLiturgicalGuide: (guide: ReadingTarget | null) => void;
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
  
  isParallelView: false,
  parallelTranslationSlug: "webbe",
  
  liturgicalHighlight: null,
  setLiturgicalHighlight: (highlight) => set({ liturgicalHighlight: highlight }),
  
  liturgicalGuide: null,
  setLiturgicalGuide: (guide) => set({ liturgicalGuide: guide }),
}));
