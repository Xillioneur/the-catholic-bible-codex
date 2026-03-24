"use client";

import { useVoiceover } from "~/hooks/use-voiceover";
import { useReaderStore } from "~/hooks/use-reader-store";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Settings2,
  MousePointer2
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
import { cn } from "~/lib/utils";

export function VoiceoverControls() {
  const { togglePlay, skipForward, skipBackward, isPlaying, speed } = useVoiceover();
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);
  const setIsFollowEnabled = useReaderStore((state) => state.setIsVoiceoverFollowEnabled);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 gap-1.5"
          >
            <span className="tabular-nums">{speed}x</span>
            <Settings2 className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="w-56 p-2 rounded-2xl shadow-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-2 py-3">
            Playback Speed
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 mb-1" />
          <div className="grid grid-cols-3 gap-1 p-1">
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
          <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
          <DropdownMenuCheckboxItem
            checked={isFollowEnabled}
            onCheckedChange={setIsFollowEnabled}
            className="text-xs font-bold rounded-xl focus:bg-primary/10 focus:text-primary py-2.5"
          >
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-3 w-3" />
              Follow Reading
            </div>
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
