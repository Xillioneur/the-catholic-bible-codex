"use client";

import { useCallback } from "react";
import { useReaderStore, type VoiceoverQueueItem } from "./use-reader-store";

export function useVoiceover() {
  const isPlaying = useReaderStore((state) => state.isVoiceoverPlaying);
  const setIsPlaying = useReaderStore((state) => state.setIsVoiceoverPlaying);
  const isActive = useReaderStore((state) => state.isVoiceoverActive);
  const setIsActive = useReaderStore((state) => state.setIsVoiceoverActive);
  const setIsMinimized = useReaderStore((state) => state.setIsVoiceoverMinimized);

  const speed = useReaderStore((state) => state.voiceoverSpeed);
  const currentOrder = useReaderStore((state) => state.voiceoverCurrentOrder);
  const setCurrentOrder = useReaderStore((state) => state.setVoiceoverCurrentOrder);
  const setNonBibleText = useReaderStore((state) => state.setVoiceoverNonBibleText);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const playlist = useReaderStore((state) => state.voiceoverPlaylist);
  const setPlaylist = useReaderStore((state) => state.setVoiceoverPlaylist);
  const queue = useReaderStore((state) => state.voiceoverQueue);
  const setQueue = useReaderStore((state) => state.setVoiceoverQueue);
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);
  const setIsTitleSkipActive = useReaderStore((state) => state.setIsVoiceoverTitleSkipActive);
  
  const verseProgress = useReaderStore((state) => state.voiceoverProgress);
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
    resetVoiceover();
  }, [resetVoiceover]);

  const jumpToOrder = useCallback((order: number, newPlaylist?: number[], skipTitles = false) => {
    // [THE SACRED RESTART]
    // If we are already playing this exact verse, we want to RESTART it.
    // By setting to null first, the VoiceoverManager's useEffect will see a CHANGE
    // and reset its character index to 0.
    if (currentOrder === order && isPlaying) {
      setCurrentOrder(null);
    }

    setIsPlaying(false);
    unlockAudio();
    
    if (newPlaylist) setPlaylist(newPlaylist);
    setQueue(null);
    if (isFollowEnabled) setScrollToOrder(order);
    
    setNonBibleText(null);
    setIsActive(true);
    setIsMinimized(false);
    
    // Signal the manager to skip titles for this specific jump
    setIsTitleSkipActive(skipTitles);

    // Defer the set order to ensure state change is detected for restart
    setTimeout(() => {
      setCurrentOrder(order);
      setIsPlaying(true);
    }, 10);
  }, [currentOrder, isPlaying, setIsPlaying, unlockAudio, setPlaylist, isFollowEnabled, setScrollToOrder, setIsActive, setIsMinimized, setNonBibleText, setQueue, setIsTitleSkipActive, setCurrentOrder]);

  const jumpToText = useCallback((text: string) => {
    setIsPlaying(false);
    unlockAudio();
    
    setCurrentOrder(null);
    setQueue(null);
    setPlaylist(null);
    setNonBibleText(text);
    
    setIsActive(true);
    setIsMinimized(false);
    setIsPlaying(true);
  }, [setIsPlaying, unlockAudio, setCurrentOrder, setPlaylist, setNonBibleText, setIsActive, setIsMinimized, setQueue]);

  const jumpToQueue = useCallback((newQueue: VoiceoverQueueItem[]) => {
    setIsPlaying(false);
    unlockAudio();
    
    setPlaylist(null);
    setQueue(newQueue);
    
    const first = newQueue[0];
    if (first?.type === "verse") {
      setNonBibleText(null);
      setCurrentOrder(first.order);
      if (isFollowEnabled) setScrollToOrder(first.order);
    } else if (first?.type === "text") {
      setCurrentOrder(null);
      setNonBibleText(first.text);
    }
    
    setIsActive(true);
    setIsMinimized(false);
    setIsPlaying(true);
  }, [setIsPlaying, unlockAudio, setPlaylist, setQueue, setCurrentOrder, setNonBibleText, setIsActive, setIsMinimized, isFollowEnabled, setScrollToOrder]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsActive(true);
      setIsMinimized(false);
      setIsPlaying(true);
    }
  }, [isPlaying, setIsActive, setIsMinimized, setIsPlaying]);

  const skipForward = useCallback(() => {
    const event = new CustomEvent("voiceover-skip-forward");
    window.dispatchEvent(event);
  }, []);

  const skipBackward = useCallback(() => {
    const event = new CustomEvent("voiceover-skip-backward");
    window.dispatchEvent(event);
  }, []);

  return {
    togglePlay,
    stop,
    skipForward,
    skipBackward,
    jumpToOrder,
    jumpToText,
    jumpToQueue,
    unlockAudio,
    isPlaying,
    isActive,
    currentOrder,
    speed,
    verseProgress,
    playlist,
    queue,
  };
}
