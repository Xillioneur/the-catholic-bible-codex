"use client";

import { useState } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";
import { Bookmark as BookmarkIcon, Highlighter, MessageSquare, Share2, ExternalLink, ChevronDown, Trash2, Scroll, BookOpen } from "lucide-react";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { getCatechismUrl, getCatenaAureaUrl, getPatristicCommentaryUrl } from "~/lib/bible-utils";

interface VerseOverlayProps {
  verseId: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  onClose: () => void;
}

export function VerseOverlay({ verseId, bookId, bookName, chapter, verse, text, onClose }: VerseOverlayProps) {
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const [noteContent, setNoteContent] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const bookmark = useLiveQuery(() => db.bookmarks.where("verseId").equals(verseId).first(), [verseId]);
  const highlight = useLiveQuery(() => db.highlights.where("verseId").equals(verseId).first(), [verseId]);
  const note = useLiveQuery(() => db.notes.where("verseId").equals(verseId).first(), [verseId]);

  const toggleBookmark = async () => {
    if (bookmark) {
      await db.bookmarks.delete(bookmark.id!);
    } else {
      await db.bookmarks.add({
        verseId,
        bookId,
        chapter,
        verse,
        translationSlug,
        createdAt: Date.now(),
      });
    }
  };

  const toggleHighlight = async (color: string = "yellow") => {
    if (highlight) {
      await db.highlights.delete(highlight.id!);
    } else {
      await db.highlights.add({
        verseId,
        color,
        createdAt: Date.now(),
      });
    }
  };

  const saveNote = async () => {
    if (note) {
      await db.notes.update(note.id!, {
        content: noteContent,
        updatedAt: Date.now(),
      });
    } else {
      await db.notes.add({
        verseId,
        content: noteContent,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    setIsEditingNote(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4 md:p-8 animate-in slide-in-from-bottom-full duration-500">
      <div className="max-w-2xl mx-auto rounded-[2.5rem] border border-white/40 bg-white/60 shadow-2xl shadow-blue-900/20 backdrop-blur-3xl p-8 dark:border-zinc-800/40 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
              {bookName} {chapter}:{verse}
            </span>
            <span className="text-xs text-zinc-400 font-medium">Sacred Scripture</span>
          </div>
          <button 
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-8 max-h-32 overflow-auto">
          <p className="text-lg font-serif italic leading-relaxed text-zinc-700 dark:text-zinc-300">
            "{text}"
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button 
            onClick={() => toggleHighlight()}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all group",
              highlight ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 dark:bg-zinc-800/50"
            )}
          >
            <Highlighter className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Highlight</span>
          </button>
          <button 
            onClick={() => {
              setIsEditingNote(true);
              setNoteContent(note?.content ?? "");
            }}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all group",
              note ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 dark:bg-zinc-800/50"
            )}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Note</span>
          </button>
          <button 
            onClick={toggleBookmark}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all group",
              bookmark ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 dark:bg-zinc-800/50"
            )}
          >
            <BookmarkIcon className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Bookmark</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 transition-all dark:bg-zinc-800/50 group">
            <Share2 className="h-5 w-5 text-zinc-400 group-hover:text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest">Share</span>
          </button>
        </div>

        {isEditingNote && (
          <div className="mb-6 space-y-3 animate-in fade-in zoom-in duration-200">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Record your reflections..."
              className="w-full h-24 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
            <div className="flex gap-2">
              <button onClick={saveNote} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Save Note</button>
              <button onClick={() => setIsEditingNote(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500">Cancel</button>
            </div>
          </div>
        )}

        {!isEditingNote && note && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Your Reflection</span>
              <button onClick={async () => await db.notes.delete(note.id!)} className="text-zinc-400 hover:text-red-500 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{note.content}</p>
          </div>
        )}

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
           <a 
              href={getCatechismUrl(bookName, chapter, verse)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-2 rounded-2xl transition-all"
           >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center dark:bg-blue-900/30">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Catechism</span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">View CCC References</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-zinc-400 rotate-[-90deg]" />
           </a>

           {getCatenaAureaUrl(bookName, chapter) && (
             <a 
                href={getCatenaAureaUrl(bookName, chapter)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-2 rounded-2xl transition-all"
             >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center dark:bg-amber-900/30">
                    <Scroll className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Catena Aurea</span>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Patristic Commentary</span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-zinc-400 rotate-[-90deg]" />
             </a>
           )}

           <a 
              href={getPatristicCommentaryUrl(bookName, chapter)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-2 rounded-2xl transition-all"
           >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-900/30">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Study Tool</span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">New Advent Commentary</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-zinc-400 rotate-[-90deg]" />
           </a>
        </div>
      </div>
    </div>
  );
}
