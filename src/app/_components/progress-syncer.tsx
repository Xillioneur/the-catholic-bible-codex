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
  
  const { data: profile } = api.user.getProfile.useQuery(undefined, {
    enabled: !!session,
  });

  const { data: cloudData } = api.user.getSyncData.useQuery(undefined, {
    enabled: !!session,
  });

  const localHighlights = useLiveQuery(() => db.highlights.where("userId").equals(currentUserId).toArray(), [currentUserId]);
  const localNotes = useLiveQuery(() => db.notes.where("userId").equals(currentUserId).toArray(), [currentUserId]);
  const localBookmarks = useLiveQuery(() => db.bookmarks.where("userId").equals(currentUserId).toArray(), [currentUserId]);
  const localVerseStatuses = useLiveQuery(() => db.verseStatuses.where("userId").equals(currentUserId).toArray(), [currentUserId]);

  const autoProgress = useReaderStore((state) => state.autoProgress);
  const hasInitialSync = useRef(false);
  const hasPulledCloudData = useRef(false);
  const hasMigrated = useRef(false);

  // Reset sync flags when user changes
  useEffect(() => {
    hasInitialSync.current = false;
    hasPulledCloudData.current = false;
    hasMigrated.current = false;
  }, [currentUserId]);

  // Data Migration: Ensure old records have globalOrder and translationSlug, and migrate guest data
  useEffect(() => {
    if (!localVerseStatuses || !localHighlights || !localNotes || !localBookmarks || hasMigrated.current) return;
    
    const migrate = async () => {
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
      }
    };
    void migrate();
  }, [localVerseStatuses, localHighlights, localNotes, localBookmarks, session]);

  // Initial Sync from DB to LocalStore (Progress only)
  useEffect(() => {
    if (!session) {
      hasInitialSync.current = true;
      return;
    }

    if (profile && !hasInitialSync.current) {
      console.log("[SYNC] Initial profile loaded", profile);
      // Only restore if the cloud progress is significantly different or local is 1
      if (profile.lastReadOrder > 1) {
        setTranslationSlug(profile.lastReadTranslation);
        setCurrentOrder(profile.lastReadOrder);
        setScrollToOrder(profile.lastReadOrder);
        console.log("[SYNC] Restored progress from cloud:", profile.lastReadTranslation, profile.lastReadOrder);
      }
      hasInitialSync.current = true;
    }
  }, [profile, session, setTranslationSlug, setCurrentOrder, setScrollToOrder]);

  // Initial Pull from Cloud to Dexie (The Great Restoration)
  useEffect(() => {
    if (cloudData && session && !hasPulledCloudData.current) {
      console.log("[SYNC] Cloud data loaded, starting restoration for user:", session.user.id);
      const restoreData = async () => {
        try {
          const userId = session.user.id;
          const syncTime = useReaderStore.getState().lastSync ?? 0;

          // Helper to check if we should restore an item
          const shouldRestore = (cloudCreatedAt: Date, localExists: boolean) => {
            if (localExists) return false;
            // If we've never synced, restore everything
            if (syncTime === 0) return true;
            // Only restore if the item was created on another device AFTER our last sync
            return cloudCreatedAt.getTime() > syncTime;
          };

          // RESTORE NOTES
          for (const n of cloudData.notes) {
            if (!n.verse?.translation?.slug) continue;
            
            const exists = await db.notes.where("[userId+verseId]")
              .equals([userId, n.verseId])
              .first();
            
            if (shouldRestore(n.createdAt, !!exists)) {
              await db.notes.add({
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

          // RESTORE HIGHLIGHTS
          for (const h of cloudData.highlights) {
            if (!h.verse?.translation?.slug) continue;
            
            const exists = await db.highlights.where("[userId+verseId]")
              .equals([userId, h.verseId])
              .first();
            
            if (shouldRestore(h.createdAt, !!exists)) {
              await db.highlights.add({
                userId,
                verseId: h.verseId,
                globalOrder: h.verse.globalOrder,
                translationSlug: h.verse.translation.slug,
                color: h.color,
                createdAt: h.createdAt.getTime(),
              });
            }
          }

          // RESTORE BOOKMARKS
          for (const b of cloudData.bookmarks) {
            if (!b.verse?.translation?.slug) continue;

            const exists = await db.bookmarks.where("[userId+verseId]")
              .equals([userId, b.verseId])
              .first();
            
            if (shouldRestore(b.createdAt, !!exists)) {
              await db.bookmarks.add({
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

          // RESTORE VERSE STATUSES (READ Progress)
          for (const s of cloudData.verseStatuses) {
            if (!s.verse?.translation?.slug) continue;

            const exists = await db.verseStatuses.where("[userId+verseId]")
              .equals([userId, s.verseId])
              .first();
            
            if (shouldRestore(s.readAt, !!exists)) {
              await db.verseStatuses.add({
                userId,
                verseId: s.verseId,
                globalOrder: s.verse.globalOrder,
                translationSlug: s.verse.translation.slug,
                isRead: true,
                readAt: s.readAt.getTime(),
              });
            }
          }
          console.log("[SYNC] Restoration complete");
          setLastSync(Date.now());
        } catch (e) {
          console.error("[SYNC] Restoration failed", e);
        }
      };
      void restoreData();
      hasPulledCloudData.current = true;
    }
  }, [cloudData, session]);

  // Periodic Progress Sync (Auto-Sync last position)
  useEffect(() => {
    if (!session || !hasInitialSync.current || !autoProgress) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      console.log("[SYNC] Saving progress...", currentOrder);
      updateProgress.mutate({
        lastReadOrder: currentOrder,
        lastReadTranslation: translationSlug,
      });
    }, 10000); // 10s

    return () => clearTimeout(timer);
  }, [currentOrder, translationSlug, session, autoProgress]);

  // Sync Highlights to Server (Stable Ref)
  useEffect(() => {
    if (!session || !localHighlights || !hasInitialSync.current) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const payload = localHighlights
        .filter(h => h.verseId && h.userId === session.user.id)
        .map(h => ({
          verseId: h.verseId,
          color: h.color,
          createdAt: h.createdAt,
        }));
      
      console.log("[SYNC] Syncing highlights...", payload.length);
      syncHighlights.mutate(payload);
    }, 15000);

    return () => clearTimeout(timer);
  }, [localHighlights, session]);

  // Sync Notes to Server (Stable Ref)
  useEffect(() => {
    if (!session || !localNotes || !hasInitialSync.current) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const payload = localNotes
        .filter(n => n.verseId && n.userId === session.user.id)
        .map(n => ({
          verseId: n.verseId,
          content: n.content,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        }));

      console.log("[SYNC] Syncing notes...", payload.length);
      syncNotes.mutate(payload);
    }, 15000);

    return () => clearTimeout(timer);
  }, [localNotes, session]);

  // Sync Bookmarks to Server (Stable Ref)
  useEffect(() => {
    if (!session || !localBookmarks || !hasInitialSync.current) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const payload = localBookmarks
        .filter(b => b.verseId && b.userId === session.user.id)
        .map(b => ({
          verseId: b.verseId,
          createdAt: b.createdAt,
        }));

      console.log("[SYNC] Syncing bookmarks...", payload.length);
      syncBookmarks.mutate(payload);
    }, 15000);

    return () => clearTimeout(timer);
  }, [localBookmarks, session]);

  // Sync Verse Statuses to Server (Manual Progress)
  useEffect(() => {
    if (!session || !localVerseStatuses || !hasInitialSync.current) return;

    const timer = setTimeout(async () => {
      if (document.visibilityState !== "visible") return;

      const payload = [];
      for (const s of localVerseStatuses) {
        if (!s.isRead || s.userId !== session.user.id) continue;
        if (s.verseId) {
          payload.push({
            verseId: s.verseId,
            isRead: true,
            readAt: s.readAt,
          });
        }
      }

      console.log("[SYNC] Syncing verse progress...", payload.length);
      syncVerseStatuses.mutate(payload);
    }, 15000);

    return () => clearTimeout(timer);
  }, [localVerseStatuses, session]);

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
