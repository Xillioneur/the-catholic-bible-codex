import Dexie, { type Table } from "dexie";

export interface LocalVerse {
  id: string;
  translationId: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  globalOrder: number;
  book: {
    name: string;
    abbreviation: string;
    slug: string;
    category: string;
    testament: string;
  };
}

export interface LocalBookmark {
  id?: number;
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  globalOrder: number;
  translationSlug: string;
  createdAt: number;
}

export interface LocalHighlight {
  id?: number;
  verseId: string;
  globalOrder: number;
  translationSlug: string;
  color: string;
  createdAt: number;
}

export interface LocalNote {
  id?: number;
  verseId: string;
  globalOrder: number;
  translationSlug: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export class VerbumDominiDB extends Dexie {
  verses!: Table<LocalVerse>;
  bookmarks!: Table<LocalBookmark>;
  highlights!: Table<LocalHighlight>;
  notes!: Table<LocalNote>;

  constructor() {
    super("VerbumDominiDB");
    this.version(3).stores({
      verses: "id, globalOrder, translationId, [translationId+globalOrder]",
      bookmarks: "++id, verseId, translationSlug, [translationSlug+globalOrder]",
      highlights: "++id, verseId, [translationSlug+globalOrder]",
      notes: "++id, verseId, [translationSlug+globalOrder]",
    });
  }
}

export const db = new VerbumDominiDB();
