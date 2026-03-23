"use client";

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
  Volume2,
  Target,
  Minimize2
} from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
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

export function VoiceoverPlayer() {
  const { togglePlay, skipForward, skipBackward, jumpToOrder, stop, isPlaying, isActive, speed } = useVoiceover();
  const currentVerse = useReaderStore((state) => state.voiceoverCurrentVerse);
  const currentReaderOrder = useReaderStore((state) => state.currentOrder);
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);
  const setIsFollowEnabled = useReaderStore((state) => state.setIsFollowEnabled);
  const isMinimized = useReaderStore((state) => state.isVoiceoverMinimized);
  const setIsMinimized = useReaderStore((state) => state.setIsVoiceoverMinimized);


  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <AnimatePresence>
      {isActive && !isMinimized && currentVerse && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-2xl px-4"
        >
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden">
            {/* Progress/Verse Preview */}
            <div className="px-4 py-2 bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 shrink-0">
                  Now Reading
                </span>
                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {currentVerse.book.name} {currentVerse.chapter}:{currentVerse.verse}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsMinimized(true)}
                  className="h-6 w-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={stop}
                  className="h-6 w-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Main Controls */}
            <div className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 min-w-0 hidden md:block">
                <p className="text-sm font-serif italic text-zinc-600 dark:text-zinc-400 line-clamp-1">
                  "{currentVerse.text}"
                </p>
              </div>

              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (currentReaderOrder) {
                            jumpToOrder(currentReaderOrder);
                            toast.success("Synced to current reading position");
                          }
                        }}
                        className="h-10 w-10 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Target className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white border-none py-2 px-3">
                      Sync to View
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipBackward}
                  className="h-10 w-10 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  onClick={togglePlay}
                  className={cn(
                    "h-14 w-14 rounded-full transition-all duration-300 shadow-lg",
                    isPlaying 
                      ? "bg-primary text-white shadow-primary/30 hover:bg-primary/90" 
                      : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 fill-current" />
                  ) : (
                    <Play className="h-6 w-6 fill-current ml-1" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipForward}
                  className="h-10 w-10 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2 hidden md:block" />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl"
                    >
                      <span className="tabular-nums">{speed}x</span>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-zinc-100 dark:border-zinc-800">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-2 py-3">
                      Playback Settings
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                    
                    <div className="py-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 px-2 mb-2">Speed</p>
                      <div className="grid grid-cols-3 gap-1">
                        {speeds.map((s) => (
                          <button
                            key={s}
                            onClick={() => useReaderStore.setState({ voiceoverSpeed: s })}
                            className={cn(
                              "h-8 rounded-lg text-[10px] font-bold transition-all",
                              speed === s 
                                ? "bg-primary text-white" 
                                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            )}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                    
                    <DropdownMenuCheckboxItem
                      checked={isFollowEnabled}
                      onCheckedChange={setIsFollowEnabled}
                      className="rounded-xl mt-1 py-3 text-xs font-bold focus:bg-primary/10 focus:text-primary"
                    >
                      <div className="flex items-center gap-2">
                        <MousePointer2 className="h-3.5 w-3.5" />
                        Follow Reading
                      </div>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
