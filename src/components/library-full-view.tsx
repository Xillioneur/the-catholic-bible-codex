"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, BookOpen, Library as LibraryIcon, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

interface LibraryFullViewProps {
  books: any[];
  translations: any[];
  currentTranslation: string;
  currentBookId: number | null;
  onClose: () => void;
  onSelectBook: (slug: string) => void;
  onSelectTranslation: (slug: string) => void;
}

export function LibraryFullView({ 
  books, 
  translations, 
  currentTranslation, 
  currentBookId, 
  onClose, 
  onSelectBook, 
  onSelectTranslation 
}: LibraryFullViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const categories = useMemo(() => {
    const cats = [
      "Pentateuch", "History", "Wisdom", "Prophets", 
      "Gospels", "Acts", "Epistles", "Revelation"
    ];
    return cats.map(c => ({
      name: c,
      books: books.filter(b => b.category === c).sort((a, b) => a.order - b.order)
    })).filter(c => c.books.length > 0);
  }, [books]);

  const content = (
    <div className="fixed inset-0 z-[300] flex flex-col bg-white dark:bg-zinc-950 animate-in fade-in duration-500 pointer-events-auto overflow-hidden">
      
      {/* HEADER */}
      <div className="w-full border-b border-zinc-100 dark:border-zinc-900/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-30">
        <header className="max-w-7xl mx-auto px-6 py-6 md:py-10 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <LibraryIcon className="h-4 w-4 text-primary opacity-60" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Sacred Library</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-serif font-black italic text-zinc-900 dark:text-zinc-50 tracking-tight">
              The 73 Books of the Word
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200/20">
              {translations.map((t) => (
                <button 
                  key={t.id} 
                  onClick={() => onSelectTranslation(t.slug)} 
                  className={cn(
                    "px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all", 
                    currentTranslation === t.slug ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button 
              onClick={onClose}
              className="h-12 w-12 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all hover:rotate-90 border border-zinc-100 dark:border-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
      </div>

      {/* BODY - THE EXPANSIVE GRID */}
      <div className="flex-1 overflow-y-auto scrollbar-elegant py-12 bg-zinc-50/10 dark:bg-zinc-900/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-16">
            {categories.map((cat) => (
              <div key={cat.name} className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-900 pb-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">
                    {cat.name}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-primary/20" />
                </div>
                
                <div className="grid gap-1">
                  {cat.books.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => onSelectBook(book.slug)}
                      className={cn(
                        "group w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between",
                        currentBookId === book.id 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "hover:bg-primary/5 text-zinc-600 dark:text-zinc-400 hover:text-primary"
                      )}
                    >
                      <span className="font-serif italic text-lg tracking-tight">
                        {book.name}
                      </span>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-all transform group-hover:translate-x-1",
                        currentBookId === book.id ? "text-white/60" : "text-zinc-300"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="h-24" />
        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full border-t border-zinc-100 dark:border-zinc-900/50 bg-white dark:bg-zinc-950 p-6 flex justify-center z-30">
        <button 
          onClick={onClose}
          className="px-12 py-3.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[10px] uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all"
        >
          Return to Reading
        </button>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
