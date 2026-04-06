"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Clock, MapPin } from "lucide-react";
import { cn } from "~/lib/utils";
import { useReaderStore } from "~/hooks/use-reader-store";

interface LiturgicalCalendarProps {
  onClose: () => void;
}

export function LiturgicalCalendar({ onClose }: LiturgicalCalendarProps) {
  const [mounted, setMounted] = useState(false);
  const selectedDate = useReaderStore((state) => state.liturgicalDate);
  const setLiturgicalDate = useReaderStore((state) => state.setLiturgicalDate);
  
  // Local state for the "view" (month/year being displayed)
  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Fill in leading empty days (from previous month)
    const firstDayOfWeek = date.getDay(); // 0 = Sunday
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [viewDate]);

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    setLiturgicalDate(date);
    onClose();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() && 
           date.getMonth() === selectedDate.getMonth() && 
           date.getFullYear() === selectedDate.getFullYear();
  };

  const content = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      {/* BACKDROP */}
      <div 
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-900 overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-auto">
        
        {/* LEFT PANEL: Quick Select & Info */}
        <div className="w-full md:w-64 bg-zinc-50 dark:bg-zinc-900/50 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 p-6 flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70">Liturgical Browser</span>
            </div>
            <h2 className="text-xl font-serif font-black italic text-zinc-900 dark:text-zinc-50">Sanctuary Calendar</h2>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => handleSelectDate(new Date())}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-primary/30 transition-all group active:scale-95 shadow-sm"
            >
              <div className="h-8 w-8 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Return To</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Today</span>
              </div>
            </button>

            <button 
              onClick={() => {
                // Find next Easter or major feast logic could go here
                const nextSunday = new Date();
                nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
                handleSelectDate(nextSunday);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-primary/30 transition-all group active:scale-95 shadow-sm"
            >
              <div className="h-8 w-8 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Upcoming</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Lord's Day</span>
              </div>
            </button>
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-zinc-800 hidden md:flex flex-col gap-4">
            <div className="flex items-center gap-3 text-zinc-400">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Global Catholic Rite</span>
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-500 italic">
              Browsing the Universal Calendar. Readings are updated daily from official Lectionary sources.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: The Calendar Grid */}
        <div className="flex-1 p-6 md:p-8 flex flex-col">
          <header className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{year}</span>
              <h3 className="text-2xl font-serif font-black italic text-zinc-900 dark:text-zinc-50 tracking-tight">{monthName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all border border-zinc-100 dark:border-zinc-800 active:scale-90"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all border border-zinc-100 dark:border-zinc-800 active:scale-90"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="h-8 flex items-center justify-center text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {daysInMonth.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
              
              const active = isSelected(date);
              const current = isToday(date);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleSelectDate(date)}
                  className={cn(
                    "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative group active:scale-90",
                    active 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105 z-10" 
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <span className={cn(
                    "text-xs md:text-sm font-bold tracking-tighter",
                    active ? "text-white" : "text-zinc-900 dark:text-zinc-100"
                  )}>
                    {date.getDate()}
                  </span>
                  {current && !active && (
                    <div className="absolute bottom-2 h-1 w-1 rounded-full bg-primary" />
                  )}
                  {active && (
                    <div className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-white/40" />
                  )}
                </button>
              );
            })}
          </div>

          <button 
            onClick={onClose}
            className="mt-auto w-full py-4 rounded-2xl md:hidden text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400"
          >
            Cancel Browser
          </button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 h-10 w-10 rounded-full hidden md:flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-primary transition-all border border-zinc-100 dark:border-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
