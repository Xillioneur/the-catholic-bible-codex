"use client";

import { useRef, useState, memo } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { VerseOverlay } from "./verse-overlay";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useBibleReader, type BibleRow } from "~/hooks/use-bible-reader";
import { BookHeader, ChapterHeader, LiturgicalReadingHeader } from "./bible/section-header";
import { VerseItem } from "./bible/verse-item";
import { LoadingScreen } from "./bible/loading-screen";
import { cn } from "~/lib/utils";

export function BibleReader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows, isLoading, rowVirtualizer } = useBibleReader(containerRef);
  const [activeVerse, setActiveVerse] = useState<any | null>(null);

  const bookmarks = useLiveQuery(() => db.bookmarks.toArray()) ?? [];
  const highlights = useLiveQuery(() => db.highlights.toArray()) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray()) ?? [];
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const searchHighlight = useReaderStore((state) => state.searchHighlight);

  if (isLoading) return <LoadingScreen />;

  return (
    <div 
      ref={containerRef} 
      className="h-full overflow-y-auto scrollbar-none bg-white dark:bg-zinc-950 selection:bg-primary/20 selection:text-primary pb-20 md:pb-0"
    >
      <div
        className="w-full relative"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {row.type === "book-header" && <BookHeader book={row.book} />}
              {row.type === "chapter-header" && <ChapterHeader chapter={row.chapter} />}
              {row.type === "prose-block" && (
                <div className="max-w-4xl mx-auto px-6 sm:px-12 md:px-16 py-4 flex flex-wrap items-baseline gap-x-1.5 leading-[1.8]">
                  {row.verses.map((v) => {
                    const reading = liturgicalReadings.find(r => r.orders[0] === v.globalOrder);
                    return (
                      <div key={v.id} className="contents">
                        {reading && (
                          <LiturgicalReadingHeader 
                            type={reading.type} 
                            citation={reading.citation} 
                          />
                        )}
                        <InlineVerse 
                          verse={v}
                          hasBookmark={bookmarks.some(b => b.verseId === v.id)}
                          hasHighlight={highlights.some(h => h.verseId === v.id)}
                          hasNote={notes.some(n => n.verseId === v.id)}
                          isLiturgical={liturgicalReadings.some(r => r.orders.includes(v.globalOrder))}
                          isSearchTarget={searchHighlight?.targetOrder === v.globalOrder}
                          searchQuery={searchHighlight?.query}
                          onClick={() => setActiveVerse(v)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeVerse && (
        <VerseOverlay 
          verseId={activeVerse.id} 
          bookId={activeVerse.bookId} 
          bookName={activeVerse.book.name}
          chapter={activeVerse.chapter} 
          verse={activeVerse.verse} 
          text={activeVerse.text}
          globalOrder={activeVerse.globalOrder}
          onClose={() => setActiveVerse(null)}
        />
      )}
    </div>
  );
}

const InlineVerse = memo(({ 
  verse, 
  hasBookmark, 
  hasHighlight, 
  hasNote, 
  isLiturgical, 
  isSearchTarget, 
  searchQuery, 
  onClick 
}: { 
  verse: any, 
  hasBookmark: boolean, 
  hasHighlight: boolean, 
  hasNote: boolean, 
  isLiturgical: boolean, 
  isSearchTarget: boolean, 
  searchQuery?: string,
  onClick: () => void 
}) => {
  const fontSize = useReaderStore((state) => state.fontSize);

  return (
    <span 
      onClick={onClick}
      className={cn(
        "inline cursor-pointer transition-all duration-300 rounded px-1 -mx-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-serif relative",
        hasHighlight && "bg-yellow-400/10 border-b border-yellow-400/30",
        isLiturgical && "text-primary font-medium bg-primary/5 dark:bg-primary/10 shadow-[0_0_15px_-5px_var(--primary)] ring-[0.5px] ring-primary/20",
        isSearchTarget && "ring-2 ring-primary/20 bg-primary/5 rounded-md"
      )}
      style={{ fontSize: `${fontSize}px` }}
    >
      <sup className="text-[0.6em] font-black mr-1 text-zinc-400 opacity-60 tabular-nums">
        {verse.verse}
      </sup>
      {verse.text}
    </span>
  );
});

InlineVerse.displayName = "InlineVerse";
