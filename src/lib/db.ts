import Dexie, { type Table } from "dexie";

export interface LocalBookmark {
  id?: number;
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  translationSlug: string;
  createdAt: number;
}

export interface LocalHighlight {
  id?: number;
  verseId: string;
  color: string;
  createdAt: number;
}

export interface LocalNote {
  id?: number;
  verseId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export class VerbumDominiDB extends Dexie {
  bookmarks!: Table<LocalBookmark>;
  highlights!: Table<LocalHighlight>;
  notes!: Table<LocalNote>;

  constructor() {
    super("VerbumDominiDB");
    this.version(1).stores({
      bookmarks: "++id, verseId, translationSlug",
      highlights: "++id, verseId",
      notes: "++id, verseId",
    });
  }
}

export const db = new VerbumDominiDB();
