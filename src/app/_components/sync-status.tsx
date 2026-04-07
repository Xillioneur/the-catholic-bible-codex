"use client";

import { useEffect, useState } from "react";
import { 
  Database, 
  History, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  Wifi, 
  WifiOff,
  ChevronUp,
  Trash2,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useSession } from "next-auth/react";
import { useReaderStore } from "~/hooks/use-reader-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function SyncStatus() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const lastSync = useReaderStore((state) => state.lastSync);
  const isSyncing = useReaderStore((state) => state.isSyncing);
  const isMinimized = useReaderStore((state) => state.isSyncStatusMinimized);
  const setIsMinimized = useReaderStore((state) => state.setIsSyncStatusMinimized);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Better cache/SW detection
    const checkSW = async () => {
      if ("serviceWorker" in navigator) {
        // First try ready
        const ready = await navigator.serviceWorker.ready;
        if (ready.active) {
          setIsCached(true);
          return;
        }

        // Check current registration
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.active) {
          setIsCached(true);
        }
      }
    };
    
    void checkSW();
    const interval = setInterval(checkSW, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleClearCache = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
      toast.success("Sanctuary cache cleared. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  // Minimized trigger - just a small dot or icon
  // Positioned bottom-24 on mobile to be above nav, sm:bottom-6 on desktop
  if (isMinimized) {
    return (
      <div className="fixed bottom-24 right-4 z-[100] sm:bottom-6 sm:right-6">
        <button
          onClick={() => setIsMinimized(false)}
          className="group relative flex h-8 w-8 items-center justify-center rounded-full glass border border-white/20 dark:border-zinc-800/50 shadow-lg transition-all hover:scale-110 active:scale-95"
          title="Show Sanctuary Status"
        >
          <div className={cn(
            "h-2 w-2 rounded-full transition-all duration-500",
            isSyncing ? "bg-primary animate-pulse scale-125" : isCached ? "bg-emerald-500" : "bg-zinc-400"
          )} />
          <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-2 w-2 text-white" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end gap-2">
      {/* Offline Alert */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-1.5 glass-red rounded-full border border-red-200/50 dark:border-red-900/50 shadow-lg animate-in slide-in-from-bottom-2 duration-500">
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Offline Sanctuary</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Minimize Button */}
        <button 
          onClick={() => setIsMinimized(true)}
          className="p-1.5 rounded-full glass border border-white/10 opacity-40 hover:opacity-100 transition-opacity shadow-sm"
          title="Minimize Status Hub"
        >
          <Minimize2 className="h-3 w-3" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 glass rounded-full border shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-95 pointer-events-auto",
                isOnline ? "border-white/40 dark:border-zinc-800/40" : "border-zinc-200/20 dark:border-zinc-800/20 opacity-90"
              )}
            >
              <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-200/50 dark:border-zinc-800/50">
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 text-primary animate-spin" />
                ) : isCached ? (
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-zinc-300 animate-pulse" />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("h-3.5 w-3.5", isOnline ? "text-primary" : "text-zinc-500")} />
                <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-600 dark:text-zinc-400">
                  {session ? "Cloud Sanctuary" : "Local Sanctuary"}
                </span>
              </div>
              
              <ChevronUp className="h-3 w-3 ml-1 opacity-40" />
            </button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            align="end" 
            side="top" 
            sideOffset={12}
            className="w-64 glass-card border-white/20 dark:border-zinc-800/50 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200 mb-2 sm:mb-0"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">App Health</span>
                <span className="text-xs font-semibold">Sanctuary Status</span>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className="bg-white/10 dark:bg-zinc-800/50" />
            
            <div className="p-2 flex flex-col gap-2">
              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Wifi className={cn("h-3 w-3", isOnline ? "text-emerald-500" : "text-zinc-500")} />
                    <span className="text-[9px] font-bold uppercase text-zinc-500">Network</span>
                  </div>
                  <span className="text-[10px] font-medium">{isOnline ? "Connected" : "Offline"}</span>
                </div>
                
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Database className={cn("h-3 w-3", isCached ? "text-emerald-500" : "text-zinc-500")} />
                    <span className="text-[9px] font-bold uppercase text-zinc-500">Storage</span>
                  </div>
                  <span className="text-[10px] font-medium">{isCached ? "Encrypted" : "Syncing..."}</span>
                </div>
              </div>

              {/* Sync History */}
              <div className="flex flex-col gap-1 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-3 w-3 text-primary" />
                    <span className="text-[9px] font-bold uppercase text-primary/80">Last Saved</span>
                  </div>
                  {isSyncing && <Loader2 className="h-2.5 w-2.5 text-primary animate-spin" />}
                </div>
                <span className="text-[11px] font-semibold">
                  {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true }) : "No sync yet"}
                </span>
                <span className="text-[9px] text-zinc-500 leading-tight mt-1">
                  Progress is persisted across devices.
                </span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-white/10 dark:bg-zinc-800/50" />
            
            <DropdownMenuItem 
              className="flex items-center gap-2 focus:bg-primary/10 cursor-pointer py-2.5"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Force Synchronize</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              className="flex items-center gap-2 text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer py-2.5"
              onClick={handleClearCache}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Clear Sanctuary Cache</span>
            </DropdownMenuItem>
            
            <div className="px-3 py-2 mt-1 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 opacity-40">
                  <div className="h-1 w-1 rounded-full bg-zinc-500" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">Ver 1.0.4</span>
                </div>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors"
                >
                  Collapse
                </button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
