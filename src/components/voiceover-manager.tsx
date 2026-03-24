"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { db } from "~/lib/db";

export function VoiceoverManager() {
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
  
  const setVerseProgress = useReaderStore((state) => state.setVoiceoverProgress);

  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  const sessionRef = useRef<number>(0);
  const speakingOrderRef = useRef<number | null>(null);
  const isInternalCancelRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const handleVoicesChanged = () => setVoicesLoaded(true);
      if (synthRef.current) {
        if (synthRef.current.getVoices().length > 0) setVoicesLoaded(true);
        synthRef.current.onvoiceschanged = handleVoicesChanged;
      }
    }
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
    isInternalCancelRef.current = true;
    if (synthRef.current) {
      if (synthRef.current.paused) synthRef.current.resume();
      synthRef.current.cancel();
    }
    
    sessionRef.current++;
    speakingOrderRef.current = null;
    setIsPlaying(false);
    setIsActive(false);
    setIsMinimized(false);
    setVerse(null);
    setCurrentOrder(null);
    setPlaylist(null);
    setVerseProgress(0);
  }, [setIsPlaying, setIsActive, setIsMinimized, setVerse, setCurrentOrder, setPlaylist, setVerseProgress]);

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

  const speak = useCallback(async (order: number) => {
    if (!synthRef.current || !isPlaying) return;

    // CRITICAL FIX: Ensure we unpause before cancelling/speaking, otherwise the engine might hang
    if (synthRef.current.paused) synthRef.current.resume();
    
    // Ensure we interrupt any previous speech immediately
    synthRef.current.cancel();

    const currentSession = ++sessionRef.current;
    speakingOrderRef.current = order;
    setIsActive(true);

    try {
      const verse = await db.verses
        .where("[translationId+globalOrder]")
        .equals([translationSlug, order])
        .first();

      if (!verse || !isPlaying || currentSession !== sessionRef.current) {
        if (!verse && isPlaying) stop();
        return;
      }

      setVerse(verse);
      setVerseProgress(0);

      const utterance = new SpeechSynthesisUtterance(verse.text);
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = speed;
      utterance.volume = 1;

      utterance.onboundary = (event) => {
        if (currentSession === sessionRef.current) {
          const progress = (event.charIndex / verse.text.length) * 100;
          setVerseProgress(progress);
        }
      };

      utterance.onend = () => {
        if (isInternalCancelRef.current) {
          isInternalCancelRef.current = false;
          return;
        }

        const currentIsPlaying = useReaderStore.getState().isVoiceoverPlaying;
        if (currentSession === sessionRef.current && currentIsPlaying) {
          setVerseProgress(100);
          const next = getNextOrder(order);
          if (next !== null) {
            setCurrentOrder(next);
            const currentIsFollowEnabled = useReaderStore.getState().isVoiceoverFollowEnabled;
            if (currentIsFollowEnabled) setScrollToOrder(next);
          } else {
            stop();
          }
        }
      };

      utterance.onerror = (event) => {
        if (currentSession === sessionRef.current && event.error && event.error !== "interrupted" && event.error !== "canceled") {
          console.error("Voiceover error:", event.error);
          setTimeout(() => {
            const currentIsPlaying = useReaderStore.getState().isVoiceoverPlaying;
            if (currentSession === sessionRef.current && currentIsPlaying) {
              speakingOrderRef.current = null;
              void speak(order);
            }
          }, 500);
        }
      };

      isInternalCancelRef.current = false;
      synthRef.current.speak(utterance);

    } catch (err) {
      console.error("Voiceover engine error:", err);
    }
  }, [translationSlug, isPlaying, speed, getBestVoice, isFollowEnabled, setCurrentOrder, setScrollToOrder, setVerse, stop, getNextOrder, setIsActive, setVerseProgress]);

  // THE MAIN LOOP
  useEffect(() => {
    if (isPlaying) {
      const orderToSpeak = currentOrder ?? globalCurrentOrder;
      
      // 1. Handle Resume if paused
      // We check for paused state to resume playback without restarting the verse
      if (synthRef.current?.paused) {
        synthRef.current.resume();
        // If resuming the same order, we rely on the engine to continue.
        if (speakingOrderRef.current === orderToSpeak) return;
      }

      // 2. Recovery: If we think we are speaking but engine is idle (and not paused), force restart
      const isEngineIdle = synthRef.current && !synthRef.current.speaking && !synthRef.current.pending && !synthRef.current.paused;
      
      if (speakingOrderRef.current === orderToSpeak && !isEngineIdle) return;

      if (currentOrder === null) {
        setCurrentOrder(globalCurrentOrder);
        return;
      }

      void speak(orderToSpeak);
    } else {
      // NOT PLAYING (Pause or Stop)
      
      if (isActive) {
        // PAUSE: Keep state, just pause audio
        // We only pause if actually speaking to avoid "pausing" an empty queue
        if (synthRef.current?.speaking && !synthRef.current.paused) {
          synthRef.current.pause();
        }
      } else {
        // STOP: Reset everything
        speakingOrderRef.current = null;
        if (synthRef.current) {
          isInternalCancelRef.current = true;
          // IMPORTANT: Resume before cancel to clear any paused state
          if (synthRef.current.paused) synthRef.current.resume();
          synthRef.current.cancel();
        }
      }
    }
  }, [isPlaying, isActive, currentOrder, globalCurrentOrder, speed, speak, setCurrentOrder]);

  return null;
}
