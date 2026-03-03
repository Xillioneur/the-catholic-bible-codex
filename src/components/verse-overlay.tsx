"use client";

import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";
import { Bookmark, Highlighter, MessageSquare, Share2, ExternalLink, ChevronDown } from "lucide-react";

interface VerseOverlayProps {
  verseId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  onClose: () => void;
}

export function VerseOverlay({ verseId, bookName, chapter, verse, text, onClose }: VerseOverlayProps) {
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

        <div className="mb-8">
          <p className="text-lg font-serif italic leading-relaxed text-zinc-700 dark:text-zinc-300">
            "{text}"
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 transition-all dark:bg-zinc-800/50 dark:hover:bg-blue-900/20 group">
            <Highlighter className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest">Highlight</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 transition-all dark:bg-zinc-800/50 dark:hover:bg-blue-900/20 group">
            <MessageSquare className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest">Note</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 transition-all dark:bg-zinc-800/50 dark:hover:bg-blue-900/20 group">
            <Bookmark className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest">Bookmark</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 transition-all dark:bg-zinc-800/50 dark:hover:bg-blue-900/20 group">
            <Share2 className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest">Share</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
           <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center dark:bg-blue-900/30">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Catechism</span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">View CCC References</span>
                </div>
              </div>
              <div className="h-6 w-6 rounded-full border border-zinc-200 flex items-center justify-center group-hover:bg-zinc-50 transition-colors dark:border-zinc-800">
                <ChevronDown className="h-3 w-3 text-zinc-400 rotate-[-90deg]" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
