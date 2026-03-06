"use client";

import { useRef, useState } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { VerseOverlay } from "./verse-overlay";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { ScriptureGuide } from "./scripture-guide";
import { useBibleReader } from "~/hooks/use-bible-reader";
import { VerseItem } from "./bible/verse-item";
import { LoadingScreen } from "./bible/loading-screen";
import { BookHeader, ChapterHeader } from "./bible/section-header";

export function BibleReader() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [activeVerse, setActiveVerse] = useState<any | null>(null);

  const { 
    rows, 
    isLoading, 
    rowVirtualizer, 
    currentOrder 
  } = useBibleReader(parentRef);

  const highlightedOrders = useReaderStore((state) => state.highlightedOrders);
  const searchHighlight = useReaderStore((state) => state.searchHighlight);

  const localHighlights = useLiveQuery(() => db.highlights.toArray()) ?? [];
  const localBookmarks = useLiveQuery(() => db.bookmarks.toArray()) ?? [];
  const localNotes = useLiveQuery(() => db.notes.toArray()) ?? [];

  if (isLoading) return <LoadingScreen />;

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <>
      <div ref={parentRef} className="h-full w-full overflow-auto bg-transparent scroll-smooth selection:bg-primary/10 scrollbar-none">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }} className="max-w-4xl mx-auto">
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;

            return (
              <div
                key={virtualRow.index}
                style={{ 
                  position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)`,
                  willChange: "transform"
                }}
              >
                {row.type === "book-header" && <BookHeader book={row.book} />}
                {row.type === "chapter-header" && <ChapterHeader chapter={row.chapter} />}
                {row.type === "verse" && (
                  <VerseItem 
                    verse={row.verse}
                    hasHighlight={localHighlights.some(h => h.verseId === row.verse.id)}
                    isLiturgical={highlightedOrders.includes(row.verse.globalOrder)}
                    isSearchTarget={searchHighlight?.targetOrder === row.verse.globalOrder}
                    searchQuery={searchHighlight?.query}
                    hasBookmark={localBookmarks.some(b => b.verseId === row.verse.id)}
                    hasNote={localNotes.some(n => n.verseId === row.verse.id)}
                    onClick={() => setActiveVerse(row.verse)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ScriptureGuide currentOrder={currentOrder} />

      {activeVerse && (
        <VerseOverlay 
          verseId={activeVerse.id} bookId={activeVerse.bookId} bookName={activeVerse.book.name}
          chapter={activeVerse.chapter} verse={activeVerse.verse} text={activeVerse.text}
          onClose={() => setActiveVerse(null)}
        />
      )}
    </>
  );
}
