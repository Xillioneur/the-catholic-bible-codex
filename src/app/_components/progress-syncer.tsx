"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/lib/db";

export function ProgressSyncer() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "guest";
  
  const currentOrder = useReaderStore((state) => state.currentOrder);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentOrder = useReaderStore((state) => state.setCurrentOrder);
  const setTranslationSlug = useReaderStore((state) => state.setTranslationSlug);
  
  const setLastSync = useReaderStore((state) => state.setLastSync);
  const setIsSyncing = useReaderStore((state) => state.setIsSyncing);
  
  const updateProgress = api.user.updateProgress.useMutation({
    onMutate: () => setIsSyncing(true),
    onSuccess: () => {
      console.log("[SYNC] Progress saved to cloud");
      setLastSync(Date.now());
    },
    onSettled: () => setIsSyncing(false),
    onError: (e) => console.error("[SYNC] Progress save failed", e),
  });
  
  const syncHighlights = api.user.syncHighlights.useMutation({
    onMutate: () => setIsSyncing(true),
    onSuccess: () => {
      console.log("[SYNC] Highlights saved to cloud");
      setLastSync(Date.now());
    },
    onSettled: () => setIsSyncing(false),
    onError: (e) => console.error("[SYNC] Highlights save failed", e),
  });
  
  const syncNotes = api.user.syncNotes.useMutation({
    onMutate: () => setIsSyncing(true),
    onSuccess: () => {
      console.log("[SYNC] Notes saved to cloud");
      setLastSync(Date.now());
    },
    onSettled: () => setIsSyncing(false),
    onError: (e) => console.error("[SYNC] Notes save failed", e),
  });
  
  const syncBookmarks = api.user.syncBookmarks.useMutation({
    onMutate: () => setIsSyncing(true),
    onSuccess: () => {
      console.log("[SYNC] Bookmarks saved to cloud");
      setLastSync(Date.now());
    },
    onSettled: () => setIsSyncing(false),
    onError: (e) => console.error("[SYNC] Bookmarks save failed", e),
  });
  
  const syncVerseStatuses = api.user.syncVerseStatuses.useMutation({
    onMutate: () => setIsSyncing(true),
    onSuccess: () => {
      console.log("[SYNC] Verse progress saved to cloud");
      setLastSync(Date.now());
    },
    onSettled: () => setIsSyncing(false),
    onError: (e) => console.error("[SYNC] Verse progress save failed", e),
  });
  
  const { data: syncData } = api.user.getUnifiedSyncData.useQuery(undefined, {
    enabled: !!session,
    staleTime: Infinity,
  });

  const localHighlights = useLiveQuery(() => db.highlights.where("userId").equals(currentUserId).toArray(), [currentUserId]);
  const localNotes = useLiveQuery(() => db.notes.where("userId").equals(currentUserId).toArray(), [currentUserId]);
  const localBookmarks = useLiveQuery(() => db.bookmarks.where("userId").equals(currentUserId).toArray(), [currentUserId]);
  const localVerseStatuses = useLiveQuery(() => db.verseStatuses.where("userId").equals(currentUserId).toArray(), [currentUserId]);

  const autoProgress = useReaderStore((state) => state.autoProgress);
  const hasHydrated = useReaderStore((state) => state.hasHydrated);
  const hasInitialSync = useRef(false);
  const hasPulledCloudData = useRef(false);
  const hasMigrated = useRef(false);
  const isMigrating = useRef(false);
  const isRestoring = useRef(false);

  // Reset sync flags when user changes
  useEffect(() => {
    hasInitialSync.current = false;
    hasPulledCloudData.current = false;
    hasMigrated.current = false;
  }, [currentUserId]);

  // Data Migration: Ensure old records have globalOrder and translationSlug, and migrate guest data
  useEffect(() => {
    if (!localVerseStatuses || !localHighlights || !localNotes || !localBookmarks || hasMigrated.current || !hasHydrated || isMigrating.current) return;
    
    const migrate = async () => {
      isMigrating.current = true;
      try {
        const userId = session?.user?.id;
        
        // 1. Migrate Guest Data to User ID if logged in
        if (userId) {
          const guestStatuses = await db.verseStatuses.where("userId").equals("guest").toArray();
          const guestHighlights = await db.highlights.where("userId").equals("guest").toArray();
          const guestNotes = await db.notes.where("userId").equals("guest").toArray();
          const guestBookmarks = await db.bookmarks.where("userId").equals("guest").toArray();

          for (const s of guestStatuses) {
            const exists = await db.verseStatuses.where("[userId+verseId]").equals([userId, s.verseId]).first();
            if (!exists) await db.verseStatuses.update(s.id!, { userId });
            else await db.verseStatuses.delete(s.id!);
          }
          for (const h of guestHighlights) {
            const exists = await db.highlights.where("[userId+verseId]").equals([userId, h.verseId]).first();
            if (!exists) await db.highlights.update(h.id!, { userId });
            else await db.highlights.delete(h.id!);
          }
          for (const n of guestNotes) {
            const exists = await db.notes.where("[userId+verseId]").equals([userId, n.verseId]).first();
            if (!exists) await db.notes.update(n.id!, { userId });
            else await db.notes.delete(n.id!);
          }
          for (const b of guestBookmarks) {
            const exists = await db.bookmarks.where("[userId+verseId]").equals([userId, b.verseId]).first();
            if (!exists) await db.bookmarks.update(b.id!, { userId });
            else await db.bookmarks.delete(b.id!);
          }
          if (guestStatuses.length + guestHighlights.length + guestNotes.length + guestBookmarks.length > 0) {
            console.log("[SYNC] Guest data migrated to user:", userId);
          }
        }

        // 2. Repair Missing Metadata (globalOrder / translationSlug)
        const repair = async (table: any, items: any[]) => {
          if (!table || !items?.length) return;
          const toRepair = items.filter(item => item && (!item.globalOrder || !item.translationSlug));
          for (const item of toRepair) {
            // [HYDRATION REMOVAL]: We can't rely on db.verses anymore.
            // If it's missing metadata, we just ensure the userId is correct.
            if (userId && item.userId !== userId) await table.update(item.id!, { userId });
          }
        };

        await repair(db.verseStatuses, localVerseStatuses);
        await repair(db.highlights, localHighlights);
        await repair(db.notes, localNotes);
        await repair(db.bookmarks, localBookmarks);

        hasMigrated.current = true;
        console.log("[SYNC] Data migration and repair complete");
      } catch (e) {
        console.error("[SYNC] Migration failed", e);
      } finally {
        isMigrating.current = false;
      }
    };
    void migrate();
  }, [localVerseStatuses, localHighlights, localNotes, localBookmarks, session, hasHydrated]);

  // UNIFIED RESTORATION EFFECT
  useEffect(() => {
    if (!session || !syncData || !hasHydrated || hasPulledCloudData.current || isRestoring.current) return;

    const performRestoration = async () => {
      isRestoring.current = true;
      try {
        const userId = session.user.id;
        const { profile, notes, highlights, bookmarks, verseStatuses } = syncData;

        // 1. RESTORE PROGRESS (Atomic with study data)
        if (profile && !hasInitialSync.current) {
          if (profile.lastReadOrder > 1) {
            setTranslationSlug(profile.lastReadTranslation);
            setCurrentOrder(profile.lastReadOrder);
            setScrollToOrder(profile.lastReadOrder);
            console.log("[SYNC] Restored progress from cloud:", profile.lastReadTranslation, profile.lastReadOrder);
          }
          hasInitialSync.current = true;
        }

        // 2. RESTORE STUDY DATA
        const syncTime = useReaderStore.getState().lastSync ?? 0;
        const shouldRestore = (cloudCreatedAt: Date, localExists: boolean) => {
          if (localExists) return false;
          if (syncTime === 0) return true;
          return cloudCreatedAt.getTime() > syncTime;
        };

        const notesToRestore = [];
        const highlightsToRestore = [];
        const bookmarksToRestore = [];
        const statusesToRestore = [];

        for (const n of notes) {
          if (!n.verse?.translation?.slug) continue;
          const exists = await db.notes.where("[userId+verseId]").equals([userId, n.verseId]).first();
          if (shouldRestore(n.createdAt, !!exists)) {
            notesToRestore.push({
              userId,
              verseId: n.verseId,
              globalOrder: n.verse.globalOrder,
              translationSlug: n.verse.translation.slug,
              content: n.content,
              createdAt: n.createdAt.getTime(),
              updatedAt: n.updatedAt.getTime(),
            });
          }
        }

        for (const h of highlights) {
          if (!h.verse?.translation?.slug) continue;
          const exists = await db.highlights.where("[userId+verseId]").equals([userId, h.verseId]).first();
          if (shouldRestore(h.createdAt, !!exists)) {
            highlightsToRestore.push({
              userId,
              verseId: h.verseId,
              globalOrder: h.verse.globalOrder,
              translationSlug: h.verse.translation.slug,
              color: h.color,
              createdAt: h.createdAt.getTime(),
            });
          }
        }

        for (const b of bookmarks) {
          if (!b.verse?.translation?.slug) continue;
          const exists = await db.bookmarks.where("[userId+verseId]").equals([userId, b.verseId]).first();
          if (shouldRestore(b.createdAt, !!exists)) {
            bookmarksToRestore.push({
              userId,
              verseId: b.verseId,
              bookId: b.verse.bookId,
              chapter: b.verse.chapter,
              verse: b.verse.verse,
              globalOrder: b.verse.globalOrder,
              translationSlug: b.verse.translation.slug,
              createdAt: b.createdAt.getTime(),
            });
          }
        }

        for (const s of verseStatuses) {
          if (!s.verse?.translation?.slug) continue;
          const exists = await db.verseStatuses.where("[userId+verseId]").equals([userId, s.verseId]).first();
          if (shouldRestore(s.readAt, !!exists)) {
            statusesToRestore.push({
              userId,
              verseId: s.verseId,
              globalOrder: s.verse.globalOrder,
              translationSlug: s.verse.translation.slug,
              isRead: true,
              readAt: s.readAt.getTime(),
            });
          }
        }

        if (notesToRestore.length > 0) await db.notes.bulkAdd(notesToRestore);
        if (highlightsToRestore.length > 0) await db.highlights.bulkAdd(highlightsToRestore);
        if (bookmarksToRestore.length > 0) await db.bookmarks.bulkAdd(bookmarksToRestore);
        if (statusesToRestore.length > 0) await db.verseStatuses.bulkAdd(statusesToRestore);

        console.log(`[SYNC] Restoration complete: ${notesToRestore.length} notes, ${highlightsToRestore.length} highlights, ${bookmarksToRestore.length} bookmarks, ${statusesToRestore.length} statuses`);
        setLastSync(Date.now());
        hasPulledCloudData.current = true;
      } catch (e) {
        console.error("[SYNC] Restoration failed", e);
      } finally {
        isRestoring.current = false;
      }
    };

    void performRestoration();
  }, [syncData, session, hasHydrated]);

  // UNIFIED PERIODIC SYNC TO CLOUD
  useEffect(() => {
    if (!session || !hasInitialSync.current || !hasPulledCloudData.current) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;

      const userId = session.user.id;

      // 1. Sync Progress
      if (autoProgress) {
        updateProgress.mutate({
          lastReadOrder: currentOrder,
          lastReadTranslation: translationSlug,
        });
      }

      // 2. Sync Study Data
      if (localHighlights) {
        const hPayload = localHighlights
          .filter(h => h.verseId && h.userId === userId)
          .map(h => ({ verseId: h.verseId, color: h.color, createdAt: h.createdAt }));
        if (hPayload.length > 0) syncHighlights.mutate(hPayload);
      }

      if (localNotes) {
        const nPayload = localNotes
          .filter(n => n.verseId && n.userId === userId)
          .map(n => ({ verseId: n.verseId, content: n.content, createdAt: n.createdAt, updatedAt: n.updatedAt }));
        if (nPayload.length > 0) syncNotes.mutate(nPayload);
      }

      if (localBookmarks) {
        const bPayload = localBookmarks
          .filter(b => b.verseId && b.userId === userId)
          .map(b => ({ verseId: b.verseId, createdAt: b.createdAt }));
        if (bPayload.length > 0) syncBookmarks.mutate(bPayload);
      }

      if (localVerseStatuses) {
        const sPayload = localVerseStatuses
          .filter(s => s.isRead && s.userId === userId && s.verseId)
          .map(s => ({ verseId: s.verseId, isRead: true, readAt: s.readAt }));
        if (sPayload.length > 0) syncVerseStatuses.mutate(sPayload);
      }

    }, 20000); // 20s Debounce for unified sync

    return () => clearTimeout(timer);
  }, [currentOrder, translationSlug, localHighlights, localNotes, localBookmarks, localVerseStatuses, session, autoProgress]);

  // Visibility Change Sync: Immediate sync when leaving
  useEffect(() => {
    if (!session || !hasInitialSync.current) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        console.log("[SYNC] Page hidden, triggering immediate sync...");
        
        // Highlights
        if (localHighlights) {
          const hPayload = localHighlights
            .filter(h => h.verseId && h.userId === session.user.id)
            .map(h => ({ verseId: h.verseId, color: h.color, createdAt: h.createdAt }));
          if (hPayload.length > 0) syncHighlights.mutate(hPayload);
        }

        // Notes
        if (localNotes) {
          const nPayload = localNotes
            .filter(n => n.verseId && n.userId === session.user.id)
            .map(n => ({ verseId: n.verseId, content: n.content, createdAt: n.createdAt, updatedAt: n.updatedAt }));
          if (nPayload.length > 0) syncNotes.mutate(nPayload);
        }

        // Bookmarks
        if (localBookmarks) {
          const bPayload = localBookmarks
            .filter(b => b.verseId && b.userId === session.user.id)
            .map(b => ({ verseId: b.verseId, createdAt: b.createdAt }));
          if (bPayload.length > 0) syncBookmarks.mutate(bPayload);
        }

        // Verse Statuses
        if (localVerseStatuses) {
          const sPayload = localVerseStatuses
            .filter(s => s.isRead && s.userId === session.user.id && s.verseId)
            .map(s => ({ verseId: s.verseId, isRead: true, readAt: s.readAt }));
          if (sPayload.length > 0) syncVerseStatuses.mutate(sPayload);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [localHighlights, localNotes, localBookmarks, localVerseStatuses, session]);

  return null;
}
