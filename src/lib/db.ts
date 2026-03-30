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
  userId: string; // "guest" or real userId
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
  userId: string; // "guest" or real userId
  verseId: string;
  globalOrder: number;
  translationSlug: string;
  color: string;
  createdAt: number;
}

export interface LocalNote {
  id?: number;
  userId: string; // "guest" or real userId
  verseId: string;
  globalOrder: number;
  translationSlug: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalVerseStatus {
  id?: number;
  userId: string;
  verseId: string;
  globalOrder: number;
  translationSlug: string;
  isRead: boolean;
  readAt: number;
}

export interface LocalReadingPlan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  totalDays: number;
  category: string;
}

export interface LocalReadingPlanDay {
  id: string;
  planId: string;
  dayNumber: number;
  title?: string;
  references: string[];
}

export interface LocalUserReadingPlan {
  id?: number;
  userId: string;
  planId: string;
  currentDay: number;
  completedDays: number[];
  isCompleted: boolean;
  startedAt: number;
  completedAt?: number;
}

export class VerbumDominiDB extends Dexie {
  verses!: Table<LocalVerse>;
  bookmarks!: Table<LocalBookmark>;
  highlights!: Table<LocalHighlight>;
  notes!: Table<LocalNote>;
  verseStatuses!: Table<LocalVerseStatus>;
  readingPlans!: Table<LocalReadingPlan>;
  readingPlanDays!: Table<LocalReadingPlanDay>;
  userReadingPlans!: Table<LocalUserReadingPlan>;

  constructor() {
    super("VerbumDominiDB");
    // Version 7: Explicit day completion tracking
    this.version(7).stores({
      verses: "id, globalOrder, translationId, [translationId+globalOrder]",
      bookmarks: "++id, userId, verseId, translationSlug, [userId+verseId], [userId+translationSlug+globalOrder]",
      highlights: "++id, userId, verseId, [userId+verseId], [userId+translationSlug+globalOrder]",
      notes: "++id, userId, verseId, [userId+verseId], [userId+translationSlug+globalOrder]",
      verseStatuses: "++id, userId, verseId, [userId+verseId], [userId+translationSlug+globalOrder]",
      readingPlans: "id, slug, category",
      readingPlanDays: "id, planId, [planId+dayNumber]",
      userReadingPlans: "++id, userId, planId, [userId+planId]"
    });
  }
}

export const db = new VerbumDominiDB();
