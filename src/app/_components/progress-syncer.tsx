"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "~/lib/db";

export function ProgressSyncer() {
  const { data: session } = useSession();
  const currentOrder = useReaderStore((state) => state.currentOrder);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const setCurrentOrder = useReaderStore((state) => state.setCurrentOrder);
  const setTranslationSlug = useReaderStore((state) => state.setTranslationSlug);
  
  const updateProgress = api.user.updateProgress.useMutation({
    onSuccess: () => console.log("[SYNC] Progress saved to cloud"),
    onError: (e) => console.error("[SYNC] Progress save failed", e),
  });
  
  const syncHighlights = api.user.syncHighlights.useMutation({
    onSuccess: () => console.log("[SYNC] Highlights saved to cloud"),
    onError: (e) => console.error("[SYNC] Highlights save failed", e),
  });
  
  const syncNotes = api.user.syncNotes.useMutation({
    onSuccess: () => console.log("[SYNC] Notes saved to cloud"),
    onError: (e) => console.error("[SYNC] Notes save failed", e),
  });
  
  const syncBookmarks = api.user.syncBookmarks.useMutation({
    onSuccess: () => console.log("[SYNC] Bookmarks saved to cloud"),
    onError: (e) => console.error("[SYNC] Bookmarks save failed", e),
  });
  
  const { data: profile } = api.user.getProfile.useQuery(undefined, {
    enabled: !!session,
  });

  const { data: cloudData } = api.user.getSyncData.useQuery(undefined, {
    enabled: !!session,
  });

  const localHighlights = useLiveQuery(() => db.highlights.toArray());
  const localNotes = useLiveQuery(() => db.notes.toArray());
  const localBookmarks = useLiveQuery(() => db.bookmarks.toArray());

  const hasInitialSync = useRef(false);
  const hasPulledCloudData = useRef(false);

  // Initial Sync from DB to LocalStore (Progress only)
  useEffect(() => {
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
  }, [profile, setTranslationSlug, setCurrentOrder, setScrollToOrder]);

  // Initial Pull from Cloud to Dexie (The Great Restoration)
  useEffect(() => {
    if (cloudData && !hasPulledCloudData.current) {
      console.log("[SYNC] Cloud data loaded, starting restoration...", cloudData);
      const restoreData = async () => {
        try {
          // RESTORE NOTES
          for (const n of cloudData.notes) {
            // Find local verse ID for this globalOrder/translation
            const localVerse = await db.verses
              .where("[translationId+globalOrder]")
              .equals([n.verse.translation.slug, n.verse.globalOrder])
              .first();
            
            if (!localVerse) continue;

            const exists = await db.notes.where("[translationSlug+globalOrder]")
              .equals([localVerse.translationId, localVerse.globalOrder])
              .first();
            
            if (!exists) {
              await db.notes.add({
                verseId: localVerse.id,
                globalOrder: localVerse.globalOrder,
                translationSlug: localVerse.translationId,
                content: n.content,
                createdAt: n.createdAt.getTime(),
                updatedAt: n.updatedAt.getTime(),
              });
            }
          }

          // RESTORE HIGHLIGHTS
          for (const h of cloudData.highlights) {
            const localVerse = await db.verses
              .where("[translationId+globalOrder]")
              .equals([h.verse.translation.slug, h.verse.globalOrder])
              .first();
            
            if (!localVerse) continue;

            const exists = await db.highlights.where("[translationSlug+globalOrder]")
              .equals([localVerse.translationId, localVerse.globalOrder])
              .first();
            
            if (!exists) {
              await db.highlights.add({
                verseId: localVerse.id,
                globalOrder: localVerse.globalOrder,
                translationSlug: localVerse.translationId,
                color: h.color,
                createdAt: h.createdAt.getTime(),
              });
            }
          }

          // RESTORE BOOKMARKS
          for (const b of cloudData.bookmarks) {
            const localVerse = await db.verses
              .where("[translationId+globalOrder]")
              .equals([b.verse.translation.slug, b.verse.globalOrder])
              .first();
            
            if (!localVerse) continue;

            const exists = await db.bookmarks.where("[translationSlug+globalOrder]")
              .equals([localVerse.translationId, localVerse.globalOrder])
              .first();
            
            if (!exists) {
              await db.bookmarks.add({
                verseId: localVerse.id,
                bookId: b.verse.bookId,
                chapter: b.verse.chapter,
                verse: b.verse.verse,
                globalOrder: b.verse.globalOrder,
                translationSlug: b.verse.translation.slug,
                createdAt: b.createdAt.getTime(),
              });
            }
          }
          console.log("[SYNC] Restoration complete");
        } catch (e) {
          console.error("[SYNC] Restoration failed", e);
        }
      };
      void restoreData();
      hasPulledCloudData.current = true;
    }
  }, [cloudData]);

  // Periodic Progress Sync
  useEffect(() => {
    if (!session || !hasInitialSync.current) return;

    const timer = setTimeout(() => {
      console.log("[SYNC] Saving progress...", currentOrder);
      updateProgress.mutate({
        lastReadOrder: currentOrder,
        lastReadTranslation: translationSlug,
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentOrder, translationSlug, session]);

  // Sync Highlights to Server (Stable Ref)
  useEffect(() => {
    if (!session || !localHighlights || localHighlights.length === 0 || !hasInitialSync.current) return;

    const timer = setTimeout(() => {
      const payload = localHighlights
        .filter(h => h.globalOrder && h.translationSlug) // Ensure stable refs exist
        .map(h => ({
          globalOrder: h.globalOrder,
          translationSlug: h.translationSlug,
          color: h.color,
          createdAt: h.createdAt,
        }));
      
      if (payload.length > 0) {
        console.log("[SYNC] Syncing highlights...");
        syncHighlights.mutate(payload);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [localHighlights, session]);

  // Sync Notes to Server (Stable Ref)
  useEffect(() => {
    if (!session || !localNotes || localNotes.length === 0 || !hasInitialSync.current) return;

    const timer = setTimeout(() => {
      const payload = localNotes
        .filter(n => n.globalOrder && n.translationSlug)
        .map(n => ({
          globalOrder: n.globalOrder,
          translationSlug: n.translationSlug,
          content: n.content,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        }));

      if (payload.length > 0) {
        console.log("[SYNC] Syncing notes...");
        syncNotes.mutate(payload);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [localNotes, session]);

  // Sync Bookmarks to Server (Stable Ref)
  useEffect(() => {
    if (!session || !localBookmarks || localBookmarks.length === 0 || !hasInitialSync.current) return;

    const timer = setTimeout(() => {
      const payload = localBookmarks
        .filter(b => b.globalOrder && b.translationSlug)
        .map(b => ({
          globalOrder: b.globalOrder,
          translationSlug: b.translationSlug,
          createdAt: b.createdAt,
        }));

      if (payload.length > 0) {
        console.log("[SYNC] Syncing bookmarks...");
        syncBookmarks.mutate(payload);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [localBookmarks, session]);

  return null;
}
