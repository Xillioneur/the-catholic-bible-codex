"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudCheck, CloudOff, Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSession } from "next-auth/react";

export function SyncStatus() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check for Serwist/Service Worker caching
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsCached(true);
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-3 pointer-events-none">
      {/* Offline Status Pill */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-1.5 glass-red rounded-full border border-red-200/50 dark:border-red-900/50 shadow-lg animate-in slide-in-from-right-4 duration-500">
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-[8px] font-black uppercase tracking-widest text-red-600">Offline Sanctuary</span>
        </div>
      )}

      {/* Main Sync Pillar */}
      <div className={cn(
        "flex items-center gap-3 px-3 py-1.5 glass rounded-full border shadow-lg transition-all duration-700",
        isOnline ? "border-white/40 dark:border-zinc-800/40" : "border-zinc-200/20 dark:border-zinc-800/20 opacity-50"
      )}>
        <div className="flex items-center gap-2 pr-2 border-r border-zinc-200/50 dark:border-zinc-800/50">
          {isCached ? (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[7px] font-black uppercase tracking-tighter text-zinc-400">Local Cache</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-2 w-2 text-zinc-300 animate-spin" />
              <span className="text-[7px] font-black uppercase tracking-tighter text-zinc-400">Caching...</span>
            </div>
          )}
        </div>

        {session ? (
          <div className="flex items-center gap-2">
            <Cloud className="h-3 w-3 text-primary opacity-60" />
            <span className="text-[7px] font-black uppercase tracking-tighter text-zinc-500">Cloud Sanctuary</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
            <span className="text-[7px] font-black uppercase tracking-tighter text-zinc-500">Local Sanctuary</span>
          </div>
        )}
      </div>
    </div>
  );
}
