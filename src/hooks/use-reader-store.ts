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
  startOrder: number;
  setStartOrder: (order: number) => void;
  isParallelView: boolean;
  setIsParallelView: (isParallel: boolean) => void;
  parallelTranslationSlug: string | null;
  setParallelTranslationSlug: (slug: string | null) => void;
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
  startOrder: 1,
  setStartOrder: (order) => set({ startOrder: order }),
  isParallelView: false,
  setIsParallelView: (isParallel) => set({ isParallelView: isParallel }),
  parallelTranslationSlug: "webbe",
  setParallelTranslationSlug: (slug) => set({ parallelTranslationSlug: slug }),
}));
