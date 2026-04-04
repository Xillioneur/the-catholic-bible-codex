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
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";

export function VoiceoverControls() {
  const { togglePlay, skipForward, skipBackward, isPlaying, speed } = useVoiceover();
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);
  const setIsFollowEnabled = useReaderStore((state) => state.setIsVoiceoverFollowEnabled);
  const isReadTitlesEnabled = useReaderStore((state) => state.isVoiceoverReadTitlesEnabled);
  const setIsReadTitlesEnabled = useReaderStore((state) => state.setIsReadTitlesEnabled);
  const voiceURI = useReaderStore((state) => state.voiceoverVoiceURI);
  const setVoiceURI = useReaderStore((state) => state.setVoiceoverVoiceURI);
  const translationSlug = useReaderStore((state) => state.translationSlug);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [menuView, setMenuView] = useState<"main" | "voices">("main");

  const isLatin = translationSlug === "vul";

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

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const currentVoice = voices.find(v => v.voiceURI === voiceURI);

  return (
    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={skipBackward}
        className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <SkipBack className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className={cn(
          "h-9 w-9 rounded-full transition-all duration-300",
          isPlaying 
            ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90" 
            : "text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 fill-current ml-0.5" />
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

      <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

      <DropdownMenu onOpenChange={(open) => { if (!open) setMenuView("main"); }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 gap-1.5"
          >
            <span className="tabular-nums">{speed}x</span>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-2 rounded-2xl shadow-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
          {menuView === "main" ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-200">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-2 py-3">
                Settings
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 mb-1" />
              
              <button
                disabled={isLatin}
                onClick={(e) => { e.preventDefault(); setMenuView("voices"); }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-3 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 group transition-all",
                  isLatin ? "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/50" : "hover:bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-zinc-400 group-hover:text-primary" />
                  <span>Voice</span>
                </div>
                <div className="flex items-center gap-2">
                  {isLatin && (
                    <span className="text-[7px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">
                      Latin Mode
                    </span>
                  )}
                  <span className="text-[9px] font-medium text-zinc-400 group-hover:text-primary max-w-[80px] truncate">
                    {isLatin ? "Auto-Latin" : (currentVoice?.name ?? "Default")}
                  </span>
                </div>
              </button>

              <DropdownMenuCheckboxItem
                checked={isReadTitlesEnabled}
                onCheckedChange={setIsReadTitlesEnabled}
                className="text-xs font-bold rounded-xl py-3 px-2.5 mt-1 focus:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <Type className="h-4 w-4" />
                  Read Titles
                </div>
              </DropdownMenuCheckboxItem>

              <DropdownMenuCheckboxItem
                checked={isFollowEnabled}
                onCheckedChange={setIsFollowEnabled}
                className="text-xs font-bold rounded-xl py-3 px-2.5 focus:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <MousePointer2 className="h-4 w-4" />
                  Follow Reading
                </div>
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
              
              <div className="px-2 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2.5 ml-0.5">Speed</p>
                <div className="grid grid-cols-3 gap-1">
                  {speeds.map((s) => (
                    <button
                      key={s}
                      onClick={() => useReaderStore.setState({ voiceoverSpeed: s })}
                      className={cn(
                        "h-8 rounded-lg text-[10px] font-black transition-all border",
                        speed === s 
                          ? "bg-primary border-primary text-white" 
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400"
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
                className="w-full flex items-center gap-2 px-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/5 rounded-xl transition-colors mb-1"
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
                  voices.map((voice) => (
                    <button
                      key={voice.voiceURI}
                      onClick={() => setVoiceURI(voice.voiceURI)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group mb-0.5",
                        voiceURI === voice.voiceURI 
                          ? "bg-primary/10 text-primary font-bold" 
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <span className="truncate font-medium leading-tight">{voice.name}</span>
                        <span className="text-[8px] opacity-50 uppercase tracking-tighter font-black">{voice.lang}</span>
                      </div>
                      {voiceURI === voice.voiceURI && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
