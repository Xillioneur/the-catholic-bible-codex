"use client";

import { useRef, useState, memo } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { VerseOverlay } from "./verse-overlay";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useBibleReader } from "~/hooks/use-bible-reader";
import { BookHeader, ChapterHeader, LiturgicalReadingHeader } from "./bible/section-header";
import { LoadingScreen } from "./bible/loading-screen";
import { cn } from "~/lib/utils";
import { useSession } from "next-auth/react";

export function BibleReader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows, isLoading, rowVirtualizer } = useBibleReader(containerRef);
  const [activeVerse, setActiveVerse] = useState<any | null>(null);

  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "guest";

  const bookmarks = useLiveQuery(() => db.bookmarks.where("userId").equals(currentUserId).toArray(), [currentUserId]) ?? [];
  const highlights = useLiveQuery(() => db.highlights.where("userId").equals(currentUserId).toArray(), [currentUserId]) ?? [];
  const readVerseIds = useLiveQuery(async () => {
    const statuses = await db.verseStatuses.where("userId").equals(currentUserId).toArray();
    return new Set(statuses.filter(s => s.isRead).map(s => s.verseId));
  }, [currentUserId]) ?? new Set<string>();
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const searchHighlight = useReaderStore((state) => state.searchHighlight);
  const voiceoverCurrentOrder = useReaderStore((state) => state.voiceoverCurrentOrder);

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
              {row.type === "liturgical-header" && (
                <LiturgicalReadingHeader 
                  type={row.readingType} 
                  citation={row.citation} 
                />
              )}
              {row.type === "prose-block" && (
                <div className="max-w-4xl mx-auto px-6 sm:px-12 md:px-16 py-4 flex flex-wrap items-baseline gap-x-1.5 leading-[1.8]">
                  {row.verses.map((v) => {
                    return (
                      <div key={v.id} className="contents">
                        <InlineVerse 
                          verse={v}
                          hasBookmark={bookmarks.some(b => b.verseId === v.id)}
                          hasHighlight={highlights.some(h => h.verseId === v.id)}
                          isRead={readVerseIds.has(v.id)}
                          isLiturgical={liturgicalReadings.some(r => r.orders.includes(v.globalOrder))}
                          isSearchTarget={searchHighlight?.targetOrder === v.globalOrder}
                          isVoiceoverActive={voiceoverCurrentOrder === v.globalOrder}
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
          bookSlug={activeVerse.book.slug}
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
  isRead,
  isLiturgical, 
  isSearchTarget, 
  isVoiceoverActive,
  onClick 
}: { 
  verse: any, 
  hasBookmark: boolean, 
  hasHighlight: boolean, 
  isRead: boolean,
  isLiturgical: boolean, 
  isSearchTarget: boolean, 
  isVoiceoverActive: boolean,
  onClick: () => void 
}) => {
  const fontSize = useReaderStore((state) => state.fontSize);

  return (
    <span 
      id={`verse-${verse.globalOrder}`}
      onClick={onClick}
      className={cn(
        "inline cursor-pointer transition-all duration-300 rounded px-1 -mx-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-serif relative",
        hasHighlight && "bg-yellow-400/10 border-b border-yellow-400/30",
        isRead && !hasHighlight && "opacity-60",
        isLiturgical && "text-primary font-semibold bg-primary/[0.03] dark:bg-primary/[0.08]",
        isSearchTarget && "ring-2 ring-primary/20 bg-primary/5 rounded-md",
        isVoiceoverActive && "bg-primary/10 ring-1 ring-primary/30"
      )}
      style={{ fontSize: `${fontSize}px` }}
    >
      <sup className={cn(
        "text-[0.6em] font-black mr-1 transition-all duration-300 tabular-nums px-1 rounded-sm",
        hasBookmark 
          ? "bg-primary text-white shadow-[0_2px_8px_-2px_rgba(var(--primary-rgb),0.4)] opacity-100 scale-110" 
          : "text-zinc-400 opacity-60",
        isRead && !hasBookmark && "text-emerald-500 opacity-100",
        isVoiceoverActive && "bg-primary text-white"
      )}>
        {verse.verse}
      </sup>
      {verse.text}
    </span>
  );
});

InlineVerse.displayName = "InlineVerse";
