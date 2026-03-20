"use client";

import { useState, useCallback } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";
import { 
  Bookmark as BookmarkIcon, 
  Highlighter, 
  MessageSquare, 
  ExternalLink, 
  X, 
  Scroll, 
  BookOpen,
  MoreHorizontal
} from "lucide-react";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { getCatechismUrl, getCatenaAureaUrl, getPatristicCommentaryUrl } from "~/lib/bible-utils";
import { api } from "~/trpc/react";

interface VerseOverlayProps {
  verseId: string;
  bookId: number;
  bookName: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  text: string;
  globalOrder: number;
  onClose: () => void;
}

export function VerseOverlay({ verseId, bookId, bookName, bookSlug, chapter, verse, text, globalOrder, onClose }: VerseOverlayProps) {
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const [noteContent, setNoteContent] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const bookmark = useLiveQuery(() => db.bookmarks.where("verseId").equals(verseId).first(), [verseId]);
  const highlight = useLiveQuery(() => db.highlights.where("verseId").equals(verseId).first(), [verseId]);
  const note = useLiveQuery(() => db.notes.where("verseId").equals(verseId).first(), [verseId]);

  const { data: parallels, isLoading: isComparing } = api.bible.getVerseInAllTranslations.useQuery(
    { bookSlug, chapter, verse },
    { enabled: showCompare }
  );

  const toggleBookmark = async () => {
    if (bookmark) {
      await db.bookmarks.delete(bookmark.id!);
    } else {
      await db.bookmarks.add({ 
        verseId, 
        bookId, 
        chapter, 
        verse, 
        globalOrder, 
        translationSlug, 
        createdAt: Date.now() 
      });
    }
  };

  const toggleHighlight = async (color: string = "yellow") => {
    if (highlight) {
      await db.highlights.delete(highlight.id!);
    } else {
      await db.highlights.add({ verseId, color, createdAt: Date.now() });
    }
  };

  const saveNote = async () => {
    if (note) {
      await db.notes.update(note.id!, { content: noteContent, updatedAt: Date.now() });
    } else {
      await db.notes.add({ verseId, content: noteContent, createdAt: Date.now(), updatedAt: Date.now() });
    }
    setIsEditingNote(false);
  };

  // Minimalist Markdown-to-HTML for performance (Divine Simplicity)
  const parseMarkdown = (md: string) => {
    return md
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="fixed inset-x-0 bottom-8 z-[150] flex flex-col items-center px-4 pointer-events-none">
      
      {/* 1. THE NOTE EDITOR (FLOATS ABOVE PILL) */}
      {isEditingNote && (
        <div className="mb-4 w-full max-w-sm glass rounded-3xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sacred Reflection</span>
            <div className="flex gap-2">
              <span className="text-[7px] font-bold text-zinc-400">Markdown enabled: **bold**, *italic*</span>
            </div>
          </div>
          <textarea
            autoFocus
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Type your reflection..."
            className="w-full h-32 bg-transparent border-none outline-none text-sm font-serif italic text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={saveNote} className="flex-1 bg-primary text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Save Reflection</button>
            <button onClick={() => setIsEditingNote(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-500">Cancel</button>
          </div>
        </div>
      )}

      {/* 2. THE PARALLEL VIEW / COMPARE */}
      {showCompare && !isEditingNote && (
        <div className="mb-4 w-full max-w-sm glass rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto border border-primary/10">
          <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Parallel Translations</span>
            <button onClick={() => setShowCompare(false)} className="text-zinc-400 hover:text-zinc-900"><X className="h-3 w-3" /></button>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 space-y-4">
            {isComparing ? (
              <div className="flex justify-center py-8"><div className="h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : parallels?.map((p: any) => (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[8px] font-black uppercase text-zinc-500">{p.translation.abbreviation}</span>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">{p.translation.name}</span>
                </div>
                <p className="text-xs font-serif leading-relaxed text-zinc-700 dark:text-zinc-300">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. THE EXTRAS (FLOATS ABOVE PILL) */}
      {showExtras && !isEditingNote && !showCompare && (
        <div className="mb-4 w-full max-w-sm glass rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto border border-primary/10">
          <div className="p-3 grid gap-1">
            <a href={getCatechismUrl(bookName, chapter, verse)} target="_blank" className="flex items-center gap-3 p-2 hover:bg-primary/5 rounded-xl transition-colors">
              <ExternalLink className="h-3.5 w-3.5 text-primary opacity-60" />
              <span className="text-[10px] font-black uppercase tracking-tight text-zinc-600 dark:text-zinc-400">Catechism (CCC)</span>
            </a>
            {getCatenaAureaUrl(bookName, chapter) && (
              <a href={getCatenaAureaUrl(bookName, chapter)} target="_blank" className="flex items-center gap-3 p-2 hover:bg-primary/5 rounded-xl transition-colors">
                <Scroll className="h-3.5 w-3.5 text-amber-600 opacity-60" />
                <span className="text-[10px] font-black uppercase tracking-tight text-zinc-600 dark:text-zinc-400">Catena Aurea</span>
              </a>
            )}
            <a href={getPatristicCommentaryUrl(bookName, chapter)} target="_blank" className="flex items-center gap-3 p-2 hover:bg-primary/5 rounded-xl transition-colors">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600 opacity-60" />
              <span className="text-[10px] font-black uppercase tracking-tight text-zinc-600 dark:text-zinc-400">New Advent Commentary</span>
            </a>
          </div>
        </div>
      )}

      {/* 4. NOTE PREVIEW (IF NOTE EXISTS) */}
      {note && !isEditingNote && !showExtras && !showCompare && (
        <div className="mb-4 w-full max-w-sm glass rounded-3xl p-4 shadow-xl animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto border border-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-3 w-3 text-primary/40" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Reflection Note</span>
          </div>
          <div 
            className="text-xs font-serif italic text-zinc-700 dark:text-zinc-300 leading-relaxed prose prose-sm dark:prose-invert max-h-24 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(note.content) }}
          />
        </div>
      )}

      {/* 5. THE MAIN ACTION PILL */}
      <div className="glass rounded-full px-2 py-1.5 shadow-2xl shadow-primary/20 flex items-center gap-1 border border-white/40 dark:border-zinc-800/40 animate-in slide-in-from-bottom-8 duration-500 pointer-events-auto">
        
        {/* CITATION LABEL */}
        <div className="px-4 py-1.5 mr-1 border-r border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
            {bookName.slice(0, 3)} {chapter}:{verse}
          </span>
        </div>

        {/* ACTIONS */}
        <button 
          onClick={() => toggleHighlight()}
          className={cn("p-2.5 rounded-full transition-all active:scale-90", highlight ? "bg-yellow-400 text-white shadow-lg shadow-yellow-400/20" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400")}
        >
          <Highlighter className="h-4 w-4" />
        </button>

        <button 
          onClick={() => { setIsEditingNote(true); setNoteContent(note?.content ?? ""); setShowExtras(false); setShowCompare(false); }}
          className={cn("p-2.5 rounded-full transition-all active:scale-90", note ? "text-primary bg-primary/10" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400")}
        >
          <MessageSquare className="h-4 w-4" />
        </button>

        <button 
          onClick={() => { setShowCompare(!showCompare); setIsEditingNote(false); setShowExtras(false); }}
          className={cn("p-2.5 rounded-full transition-all active:scale-90", showCompare ? "bg-primary text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400")}
        >
          <BookOpen className="h-4 w-4" />
        </button>

        <button 
          onClick={toggleBookmark}
          className={cn("p-2.5 rounded-full transition-all active:scale-90", bookmark ? "text-primary bg-primary/10" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400")}
        >
          <BookmarkIcon className={cn("h-4 w-4", bookmark && "fill-primary")} />
        </button>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <button 
          onClick={() => { setShowExtras(!showExtras); setIsEditingNote(false); setShowCompare(false); }}
          className={cn("p-2.5 rounded-full transition-all active:scale-90", showExtras ? "bg-primary text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <button 
          onClick={onClose}
          className="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-all ml-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
