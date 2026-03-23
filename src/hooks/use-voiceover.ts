"use client";

import { useCallback, useEffect, useRef } from "react";
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

  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isAutoAdvancing = useRef(false);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      
      const handleVoicesChanged = () => {};
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = handleVoicesChanged;
      }
    }
    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, []);

  const getBestVoice = useCallback(() => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    return (
      voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
      voices.find((v) => v.name.includes("Premium") && v.lang.startsWith("en")) ||
      voices.find((v) => v.name.includes("Samantha")) || // iOS High Quality
      voices.find((v) => v.name.includes("Daniel")) || // iOS High Quality
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices[0] ||
      null
    );
  }, []);

  // iOS Safari requires a direct user interaction to "unlock" the audio context.
  // We call this immediately on button click.
  const unlockAudio = useCallback(() => {
    if (synthRef.current && !isPlaying) {
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      utterance.rate = 1; // Normal rate for unlock
      synthRef.current.speak(utterance);
    }
  }, [isPlaying]);

  const startWatchdog = useCallback(() => {
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      if (synthRef.current && isPlaying) {
        if (!synthRef.current.speaking) {
          // If we think we're playing but not speaking, verify/resume
          return; 
        }
        if (synthRef.current.paused) {
          synthRef.current.resume();
        } else {
          // iOS Keep-Alive: Gentle nudge only
          synthRef.current.resume();
        }
      }
    }, 5000);
  }, [isPlaying]);

  const stopWatchdog = useCallback(() => {
    if (watchdogRef.current) clearInterval(watchdogRef.current);
  }, []);

  const speak = useCallback(async (order: number) => {
    if (!synthRef.current) return;

    startWatchdog();
    isAutoAdvancing.current = true;
    
    // Only cancel if actually speaking to avoid destabilizing iOS queue
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const verse = await db.verses
      .where("[translationId+globalOrder]")
      .equals([translationSlug, order])
      .first();

    if (!verse) {
      stop();
      return;
    }

    setVerse(verse);
    const utterance = new SpeechSynthesisUtterance(verse.text);
    utterance.voice = getBestVoice();
    utterance.rate = speed;

    utterance.onend = () => {
      if (isAutoAdvancing.current) {
        setCurrentOrder(order + 1);
        if (isFollowEnabled) {
          setScrollToOrder(order + 1);
        }
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== "interrupted") {
        console.error("SpeechSynthesisUtterance error", event);
        stop();
      }
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [translationSlug, speed, getBestVoice, setVerse, setCurrentOrder, isFollowEnabled, setScrollToOrder]);

  const stop = useCallback(() => {
    stopWatchdog();
    setIsPlaying(false);
    setIsActive(false);
    setIsMinimized(false);
    setVerse(null);
    setCurrentOrder(null);
    if (synthRef.current) {
      isAutoAdvancing.current = false;
      synthRef.current.cancel();
    }
  }, [setIsPlaying, setIsActive, setIsMinimized, setVerse, setCurrentOrder]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopWatchdog();
      setIsPlaying(false);
      if (synthRef.current) {
        isAutoAdvancing.current = false;
        synthRef.current.cancel();
      }
    } else {
      unlockAudio();
      setIsActive(true);
      setIsMinimized(false);
      setIsPlaying(true);
    }
  }, [isPlaying, setIsPlaying, setIsActive, setIsMinimized, unlockAudio, stopWatchdog]);

  useEffect(() => {
    if (isPlaying) {
      startWatchdog();
      if (!isActive) setIsActive(true);
      if (currentOrder === null) {
        setCurrentOrder(globalCurrentOrder);
      } else {
        speak(currentOrder);
      }
    } else {
      stopWatchdog();
      if (synthRef.current) {
        isAutoAdvancing.current = false;
        synthRef.current.cancel();
      }
    }
  }, [isPlaying]);


  useEffect(() => {
    if (isPlaying && currentOrder !== null) {
      speak(currentOrder);
    }
  }, [currentOrder, isPlaying]);

  useEffect(() => {
    if (isPlaying && currentOrder !== null) {
      speak(currentOrder);
    }
  }, [speed]);

  const jumpToOrder = (order: number) => {
    unlockAudio();
    setIsActive(true);
    setIsMinimized(false);
    isAutoAdvancing.current = false;
    setCurrentOrder(order);
    if (!isPlaying) {
      setIsPlaying(true);
    } else {
      // Force restart if already playing
      speak(order);
    }
  };

  return {
    togglePlay,
    stop,
    skipForward: () => {
      unlockAudio();
      setCurrentOrder((currentOrder ?? globalCurrentOrder) + 1);
    },
    skipBackward: () => {
      unlockAudio();
      setCurrentOrder(Math.max(1, (currentOrder ?? globalCurrentOrder) - 1));
    },
    jumpToOrder,
    isPlaying,
    isActive,
    currentOrder,
    speed,
  };
}
