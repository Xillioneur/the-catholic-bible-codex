"use client";

import { useMemo, useEffect, useState } from "react";
import { useVoiceover } from "~/hooks/use-voiceover";
import { useReaderStore } from "~/hooks/use-reader-store";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Settings2,
  MousePointer2,
  X,
  Target,
  Minimize2,
  Church,
  Type,
  User,
  ChevronLeft
} from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "~/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "~/trpc/react";

export function VoiceoverPlayer() {
  const { togglePlay, skipForward, skipBackward, jumpToOrder, stop, isPlaying, isActive, speed, verseProgress, playlist } = useVoiceover();
  const currentVerse = useReaderStore((state) => state.voiceoverCurrentVerse);
  const currentReaderOrder = useReaderStore((state) => state.currentOrder);
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);
  const setIsFollowEnabled = useReaderStore((state) => state.setIsFollowEnabled);
  const isReadTitlesEnabled = useReaderStore((state) => state.isVoiceoverReadTitlesEnabled);
  const setIsReadTitlesEnabled = useReaderStore((state) => state.setIsReadTitlesEnabled);
  const voiceURI = useReaderStore((state) => state.voiceoverVoiceURI);
  const setVoiceURI = useReaderStore((state) => state.setVoiceoverVoiceURI);
  
  const isMinimized = useReaderStore((state) => state.isVoiceoverMinimized);
  const setIsMinimized = useReaderStore((state) => state.setIsVoiceoverMinimized);
  const isNavigatorVisible = useReaderStore((state) => state.isNavigatorVisible);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [menuView, setMenuView] = useState<"main" | "voices">("main");

  useEffect(() => {
    const loadVoices = () => {
      let v = window.speechSynthesis.getVoices();
      if (v.length === 0) {
        setTimeout(() => {
          v = window.speechSynthesis.getVoices();
          setVoices(v.filter(voice => voice.lang.startsWith("en")));
        }, 100);
      } else {
        setVoices(v.filter(voice => voice.lang.startsWith("en")));
      }
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const utils = api.useUtils();

  const isLiturgical = useMemo(() => {
    if (!playlist || !liturgicalReadings.length) return false;
    const allLiturgicalOrders = liturgicalReadings.flatMap(r => r.orders);
    return playlist.every(o => allLiturgicalOrders.includes(o));
  }, [playlist, liturgicalReadings]);

  const handleJumpToChapter = async () => {
    if (!currentVerse) return;
    const order = await utils.bible.getVerseOrder.fetch({
      translationSlug,
      bookSlug: currentVerse.book.slug,
      chapter: currentVerse.chapter,
      verse: 1
    });
    if (order !== null) {
      jumpToOrder(order);
      setScrollToOrder(order);
      toast.success(`Jumped to ${currentVerse.book.name} ${currentVerse.chapter}`);
    }
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const currentVoice = voices.find(v => v.voiceURI === voiceURI);

  return (
    <AnimatePresence>
      {isActive && !isMinimized && currentVerse && (
        <motion.div 
          initial={{ y: 100, x: "-50%", opacity: 0 }}
          animate={{ 
            y: 0, 
            x: "-50%", 
            opacity: 1,
            bottom: isNavigatorVisible ? "160px" : "128px" // bottom-40 vs bottom-32 on mobile
          }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          exit={{ y: 100, x: "-50%", opacity: 0 }}
          className="fixed left-1/2 z-[200] w-[95%] max-w-lg sm:bottom-6"
        >
          <div className="relative group overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/20 dark:border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-2 transition-all duration-500 hover:shadow-primary/20">
            {/* Progress Bar (Full Width Top) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800/50">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${verseProgress}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 px-2 py-1">
              {/* Verse Badge - Now a Jump Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={handleJumpToChapter}
                      className="flex flex-col items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 shrink-0 hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-90 group/ch"
                    >
                      {isLiturgical ? (
                        <Church className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      ) : (
                        <>
                          <span className="text-[6px] sm:text-[8px] font-black leading-none text-zinc-400 mb-0.5 group-hover/ch:text-primary transition-colors">CH</span>
                          <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 group-hover/ch:text-primary transition-colors">{currentVerse.chapter}</span>
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={10} className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white border-none py-2 px-3 rounded-full">
                    {isLiturgical ? "Daily Readings Mode" : "Restart Chapter"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Title & Info */}
              <div className="flex-1 min-w-0 px-2 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary truncate">
                    {isLiturgical ? "Liturgical Reading" : currentVerse.book.name}
                  </h3>
                  <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold text-zinc-400 tabular-nums shrink-0">
                    {currentVerse.book.name} {currentVerse.chapter}:{currentVerse.verse}
                  </span>
                </div>
                <div className="mt-1 relative h-4 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={currentVerse.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-[11px] font-serif italic text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-none"
                    >
                      {currentVerse.text}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Main Actions Container */}
              <div className="flex items-center gap-1.5 pr-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (currentReaderOrder) {
                            jumpToOrder(currentReaderOrder);
                            toast.success("Synced to view");
                          }
                        }}
                        className="h-8 w-8 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={10} className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white border-none py-2 px-3 rounded-full">
                      Sync to View
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipBackward}
                  className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  onClick={togglePlay}
                  className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-[1.5rem] transition-all duration-300 shadow-xl active:scale-95",
                    isPlaying 
                      ? "bg-primary text-white shadow-primary/20 hover:bg-primary/90" 
                      : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current ml-0.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipForward}
                  className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                <DropdownMenu onOpenChange={(open) => { if (!open) setMenuView("main"); }}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    side="top" 
                    align="end" 
                    sideOffset={12}
                    className="w-64 p-3 rounded-[2rem] shadow-2xl border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl overflow-hidden"
                  >
                    {menuView === "main" ? (
                      <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-3 py-3">
                          Settings
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 mb-3" />
                        
                        <button
                          onClick={(e) => { e.preventDefault(); setMenuView("voices"); }}
                          className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold hover:bg-primary/5 text-zinc-600 dark:text-zinc-300 group"
                        >
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-zinc-400 group-hover:text-primary" />
                            <span>Voice</span>
                          </div>
                          <span className="text-[9px] font-medium text-zinc-400 group-hover:text-primary max-w-[80px] truncate">
                            {currentVoice?.name ?? "Default"}
                          </span>
                        </button>

                        <DropdownMenuCheckboxItem
                          checked={isReadTitlesEnabled}
                          onCheckedChange={setIsReadTitlesEnabled}
                          className="rounded-xl py-3 text-[11px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary mt-1"
                        >
                          <div className="flex items-center gap-3">
                            <Type className="h-4 w-4" />
                            Read Titles
                          </div>
                        </DropdownMenuCheckboxItem>

                        <DropdownMenuCheckboxItem
                          checked={isFollowEnabled}
                          onCheckedChange={setIsFollowEnabled}
                          className="rounded-xl py-3 text-[11px] font-black uppercase tracking-widest focus:bg-primary/10 focus:text-primary"
                        >
                          <div className="flex items-center gap-3">
                            <MousePointer2 className="h-4 w-4" />
                            Follow Reading
                          </div>
                        </DropdownMenuCheckboxItem>

                        <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />

                        <div className="px-2 py-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3 ml-1">Speed</p>
                          <div className="grid grid-cols-3 gap-2">
                            {speeds.map((s) => (
                              <button
                                key={s}
                                onClick={() => useReaderStore.setState({ voiceoverSpeed: s })}
                                className={cn(
                                  "h-8 rounded-xl text-[10px] font-black transition-all border",
                                  speed === s 
                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                    : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                                )}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                        <button
                          onClick={(e) => { e.preventDefault(); setMenuView("main"); }}
                          className="w-full flex items-center gap-2 px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/5 rounded-xl transition-colors mb-2"
                        >
                          <ChevronLeft className="h-3 w-3" />
                          Back
                        </button>
                        <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 mb-1" />
                        <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-elegant">
                          {voices.length === 0 ? (
                            <div className="px-3 py-4 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              Loading...
                            </div>
                          ) : (
                            <div className="grid gap-0.5">
                              {voices.map((voice) => (
                                <button
                                  key={voice.voiceURI}
                                  onClick={() => setVoiceURI(voice.voiceURI)}
                                  className={cn(
                                    "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group",
                                    voiceURI === voice.voiceURI 
                                      ? "bg-primary/10 text-primary font-bold" 
                                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                  )}
                                >
                                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                                    <span className="truncate font-medium text-[11px] leading-tight">{voice.name}</span>
                                    <span className="text-[8px] opacity-50 uppercase tracking-tighter font-black">{voice.lang}</span>
                                  </div>
                                  {voiceURI === voice.voiceURI && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex flex-col gap-1 ml-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsMinimized(true)}
                    className="h-5 w-5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-400"
                  >
                    <Minimize2 className="h-2.5 w-2.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={stop}
                    className="h-5 w-5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-300 hover:text-red-500"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
