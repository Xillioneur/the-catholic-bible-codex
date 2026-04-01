"use client";

import { useCallback } from "react";
import { useReaderStore } from "./use-reader-store";

export function useVoiceover() {
  const isPlaying = useReaderStore((state) => state.isVoiceoverPlaying);
  const setIsPlaying = useReaderStore((state) => state.setIsVoiceoverPlaying);
  const isActive = useReaderStore((state) => state.isVoiceoverActive);
  const setIsActive = useReaderStore((state) => state.setIsVoiceoverActive);
  const setIsMinimized = useReaderStore((state) => state.setIsVoiceoverMinimized);

  const speed = useReaderStore((state) => state.voiceoverSpeed);
  const currentOrder = useReaderStore((state) => state.voiceoverCurrentOrder);
  const setCurrentOrder = useReaderStore((state) => state.setVoiceoverCurrentOrder);
  const setVerse = useReaderStore((state) => state.setVoiceoverCurrentVerse);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const globalCurrentOrder = useReaderStore((state) => state.currentOrder);
  const playlist = useReaderStore((state) => state.voiceoverPlaylist);
  const setPlaylist = useReaderStore((state) => state.setVoiceoverPlaylist);
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);
  
  const verseProgress = useReaderStore((state) => state.voiceoverProgress);
  const setVerseProgress = useReaderStore((state) => state.setVoiceoverProgress);
  const resetVoiceover = useReaderStore((state) => state.resetVoiceover);

  const unlockAudio = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stop = useCallback(() => {
    // Atomic reset to prevent intermediate "paused" state
    resetVoiceover();
  }, [resetVoiceover]);

  const jumpToOrder = useCallback((order: number, newPlaylist?: number[]) => {
    // Reset state for a new jump
    setIsPlaying(false);
    
    // Warm up engine for iOS
    unlockAudio();
    
    if (newPlaylist) setPlaylist(newPlaylist);
    if (isFollowEnabled) setScrollToOrder(order);
    
    setIsActive(true);
    setIsMinimized(false);
    setCurrentOrder(order);
    setIsPlaying(true);
  }, [setPlaylist, isFollowEnabled, setScrollToOrder, setIsActive, setIsMinimized, setCurrentOrder, setIsPlaying]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsActive(true);
      setIsMinimized(false);
      setIsPlaying(true);
    }
  }, [isPlaying, setIsActive, setIsMinimized, setIsPlaying]);

  const getNextOrder = useCallback((current: number) => {
    if (playlist && playlist.length > 0) {
      const idx = playlist.indexOf(current);
      if (idx !== -1 && idx < playlist.length - 1) {
        return playlist[idx + 1];
      }
      return null;
    }
    return current + 1;
  }, [playlist]);

  const skipForward = useCallback(() => {
    const current = currentOrder ?? globalCurrentOrder;
    const next = getNextOrder(current);
    if (next !== null) jumpToOrder(next);
  }, [currentOrder, globalCurrentOrder, getNextOrder, jumpToOrder]);

  const skipBackward = useCallback(() => {
    const current = currentOrder ?? globalCurrentOrder;
    if (playlist) {
      const idx = playlist.indexOf(current);
      if (idx > 0) jumpToOrder(playlist[idx - 1]);
    } else {
      jumpToOrder(Math.max(1, current - 1));
    }
  }, [currentOrder, globalCurrentOrder, playlist, jumpToOrder]);

  return {
    togglePlay,
    stop,
    skipForward,
    skipBackward,
    jumpToOrder,
    unlockAudio,
    isPlaying,
    isActive,
    currentOrder,
    speed,
    verseProgress,
    playlist,
  };
}
