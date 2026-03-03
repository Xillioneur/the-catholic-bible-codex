import { create } from "zustand";

interface ReaderState {
  translationSlug: string;
  setTranslationSlug: (slug: string) => void;
  currentBookId: number | null;
  setCurrentBookId: (id: number | null) => void;
  currentChapter: number | null;
  setCurrentChapter: (chapter: number | null) => void;
  scrollToOrder: number | null;
  setScrollToOrder: (order: number | null) => void;
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
}));
