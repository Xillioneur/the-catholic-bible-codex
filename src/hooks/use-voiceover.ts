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
  const isAutoAdvancing = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      
      const handleVoicesChanged = () => {};
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = handleVoicesChanged;
      }
    }
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

  const speak = useCallback(async (order: number) => {
    if (!synthRef.current) return;

    isAutoAdvancing.current = true;
    synthRef.current.cancel();

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

    synthRef.current.speak(utterance);
  }, [translationSlug, speed, getBestVoice, setVerse, setCurrentOrder, isFollowEnabled, setScrollToOrder]);

  const stop = useCallback(() => {
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
  }, [isPlaying, setIsPlaying, setIsActive, setIsMinimized, unlockAudio]);
  useEffect(() => {
    if (isPlaying) {
      if (!isActive) setIsActive(true);
      if (currentOrder === null) {
        setCurrentOrder(globalCurrentOrder);
      } else {
        speak(currentOrder);
      }
    } else {
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
    skipForward: () => setCurrentOrder((currentOrder ?? globalCurrentOrder) + 1),
    skipBackward: () => setCurrentOrder(Math.max(1, (currentOrder ?? globalCurrentOrder) - 1)),
    jumpToOrder,
    isPlaying,
    isActive,
    currentOrder,
    speed,
  };
}
