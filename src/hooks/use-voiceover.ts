"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReaderStore } from "./use-reader-store";
import { db } from "~/lib/db";

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
  const isFollowEnabled = useReaderStore((state) => state.isVoiceoverFollowEnabled);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const globalCurrentOrder = useReaderStore((state) => state.currentOrder);
  const playlist = useReaderStore((state) => state.voiceoverPlaylist);
  const setPlaylist = useReaderStore((state) => state.setVoiceoverPlaylist);

  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const isAutoAdvancing = useRef(false);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [verseProgress, setVerseProgress] = useState(0);
  const lastSpokenRef = useRef<{ order: number; speed: number } | null>(null);
  const sessionRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const handleVoicesChanged = () => setVoicesLoaded(true);
      if (synthRef.current) {
        if (synthRef.current.getVoices().length > 0) setVoicesLoaded(true);
        synthRef.current.onvoiceschanged = handleVoicesChanged;
      }
    }
    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  const getBestVoice = useCallback(() => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) return null;

    const premiumVoices = voices.filter(v => 
      v.lang.startsWith("en") && 
      (v.name.includes("Enhanced") || v.name.includes("Premium") || v.name.includes("High Quality"))
    );

    return (
      premiumVoices.find(v => v.name.includes("Alex")) ||
      premiumVoices.find(v => v.name.includes("Samantha")) ||
      premiumVoices.find(v => v.name.includes("Daniel")) ||
      voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices[0] ||
      null
    );
  }, [voicesLoaded]);

  const stop = useCallback(() => {
    isAutoAdvancing.current = false;
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setIsPlaying(false);
    setIsActive(false);
    setIsMinimized(false);
    setVerse(null);
    setCurrentOrder(null);
    setPlaylist(null);
    setVerseProgress(0);
    lastSpokenRef.current = null;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, [setIsPlaying, setIsActive, setIsMinimized, setVerse, setCurrentOrder, setPlaylist]);

  const speak = useCallback(async (order: number) => {
    if (!synthRef.current || !isAutoAdvancing.current) return;

    sessionRef.current++;
    const currentSession = sessionRef.current;
    lastSpokenRef.current = { order, speed };

    const verse = await db.verses
      .where("[translationId+globalOrder]")
      .equals([translationSlug, order])
      .first();

    if (!verse) {
      stop();
      return;
    }

    if (!isAutoAdvancing.current || currentSession !== sessionRef.current) return;

    // Clear any previous state
    synthRef.current.cancel();
    setVerse(verse);
    setVerseProgress(0);

    const utterance = new SpeechSynthesisUtterance(verse.text);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = speed;
    
    const getNextOrder = (current: number) => {
      if (playlist && playlist.length > 0) {
        const idx = playlist.indexOf(current);
        if (idx !== -1 && idx < playlist.length - 1) {
          return playlist[idx + 1];
        }
        return null;
      }
      return current + 1;
    };

    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    
    // Watchdog: If onend doesn't fire, advance after estimated time
    const estimatedMs = (verse.text.length * 100) / speed + 5000;
    advanceTimeoutRef.current = setTimeout(() => {
      if (isAutoAdvancing.current && currentSession === sessionRef.current && synthRef.current && !synthRef.current.speaking) {
        const next = getNextOrder(order);
        if (next !== null) {
          setCurrentOrder(next);
          if (isFollowEnabled) setScrollToOrder(next);
        } else {
          stop();
        }
      }
    }, estimatedMs);

    utterance.onboundary = (event) => {
      if (currentSession === sessionRef.current) {
        const progress = (event.charIndex / verse.text.length) * 100;
        setVerseProgress(progress);
      }
    };

    utterance.onend = () => {
      if (currentSession === sessionRef.current) {
        setVerseProgress(100);
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
        if (isAutoAdvancing.current) {
          const next = getNextOrder(order);
          if (next !== null) {
            setCurrentOrder(next);
            if (isFollowEnabled) setScrollToOrder(next);
          } else {
            stop();
          }
        }
      }
    };

    utterance.onerror = (event) => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (event.error !== "interrupted" && isAutoAdvancing.current && currentSession === sessionRef.current) {
        console.error("SpeechSynthesis error:", event);
        // Retry current verse once after short delay
        setTimeout(() => {
          if (isAutoAdvancing.current && currentSession === sessionRef.current) {
            speak(order);
          }
        }, 500);
      }
    };

    synthRef.current.speak(utterance);
  }, [translationSlug, speed, getBestVoice, isFollowEnabled, setCurrentOrder, setScrollToOrder, setVerse, stop, playlist]);

  useEffect(() => {
    if (isPlaying) {
      isAutoAdvancing.current = true;
      if (!isActive) setIsActive(true);
      
      const orderToSpeak = currentOrder ?? globalCurrentOrder;
      if (currentOrder === null) {
        setCurrentOrder(globalCurrentOrder);
        return;
      }

      if (lastSpokenRef.current?.order === orderToSpeak && lastSpokenRef.current?.speed === speed) {
        return;
      }

      void speak(orderToSpeak);
    } else {
      isAutoAdvancing.current = false;
      lastSpokenRef.current = null;
      if (synthRef.current) synthRef.current.cancel();
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    }
  }, [isPlaying, currentOrder, speed, voicesLoaded, speak, setIsActive, isActive, setCurrentOrder, globalCurrentOrder]);

  const jumpToOrder = (order: number, newPlaylist?: number[]) => {
    isAutoAdvancing.current = true;
    if (newPlaylist) setPlaylist(newPlaylist);
    if (isFollowEnabled) setScrollToOrder(order);
    
    if (!isPlaying) {
      setIsActive(true);
      setIsMinimized(false);
      setCurrentOrder(order);
      setIsPlaying(true);
    } else {
      setCurrentOrder(order);
    }
  };

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsActive(true);
      setIsMinimized(false);
      setIsPlaying(true);
    }
  }, [isPlaying, setIsActive, setIsMinimized, setIsPlaying]);

  return {
    togglePlay,
    stop,
    skipForward: () => {
      if (playlist) {
        const current = currentOrder ?? globalCurrentOrder;
        const idx = playlist.indexOf(current);
        if (idx !== -1 && idx < playlist.length - 1) {
          jumpToOrder(playlist[idx + 1]);
        }
      } else {
        const next = (currentOrder ?? globalCurrentOrder) + 1;
        jumpToOrder(next);
      }
    },
    skipBackward: () => {
      if (playlist) {
        const current = currentOrder ?? globalCurrentOrder;
        const idx = playlist.indexOf(current);
        if (idx > 0) {
          jumpToOrder(playlist[idx - 1]);
        }
      } else {
        const prev = Math.max(1, (currentOrder ?? globalCurrentOrder) - 1);
        jumpToOrder(prev);
      }
    },
    jumpToOrder,
    isPlaying,
    isActive,
    currentOrder,
    speed,
    verseProgress,
    playlist,
  };
}
