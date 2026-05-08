"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReaderStore, type VoiceoverQueueItem } from "~/hooks/use-reader-store";
import { db } from "~/lib/db";

/**
 * VoiceoverManager: The Sacred Voice of Verbum Domini.
 * Optimized specifically for iPhone (iOS) Background & Locked-Screen Playback.
 */
export function VoiceoverManager() {
  const isPlaying = useReaderStore((state) => state.isVoiceoverPlaying);
  const storeSetIsPlaying = useReaderStore((state) => state.setIsVoiceoverPlaying);
  const isActive = useReaderStore((state) => state.isVoiceoverActive);
  const setIsActive = useReaderStore((state) => state.setIsVoiceoverActive);
  const setIsMinimized = useReaderStore((state) => state.setIsVoiceoverMinimized);

  const speed = useReaderStore((state) => state.voiceoverSpeed);
  const currentOrder = useReaderStore((state) => state.voiceoverCurrentOrder);
  const setCurrentOrder = useReaderStore((state) => state.setVoiceoverCurrentOrder);
  const setVerse = useReaderStore((state) => state.setVoiceoverCurrentVerse);
  const nonBibleText = useReaderStore((state) => state.voiceoverNonBibleText);
  const setNonBibleText = useReaderStore((state) => state.setVoiceoverNonBibleText);
  const setScrollToOrder = useReaderStore((state) => state.setScrollToOrder);
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const globalCurrentOrder = useReaderStore((state) => state.currentOrder);
  const playlist = useReaderStore((state) => state.voiceoverPlaylist);
  const setPlaylist = useReaderStore((state) => state.setVoiceoverPlaylist);
  const queue = useReaderStore((state) => state.voiceoverQueue);
  const setQueue = useReaderStore((state) => state.setVoiceoverQueue);
  
  const setVerseProgress = useReaderStore((state) => state.setVoiceoverProgress);
  const isReadTitlesEnabled = useReaderStore((state) => state.isVoiceoverReadTitlesEnabled);
  const isTitleSkipActive = useReaderStore((state) => state.isVoiceoverTitleSkipActive);
  const setIsTitleSkipActive = useReaderStore((state) => state.setIsVoiceoverTitleSkipActive);
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const selectedVoiceURI = useReaderStore((state) => state.voiceoverVoiceURI);

  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  // THE SACRED ANCHOR: The persistent audio session that keeps iOS from sleeping
  const anchorAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayingPromiseRef = useRef<Promise<void> | null>(null);
  
  const sessionRef = useRef<number>(0);
  const speakingOrderRef = useRef<number | null>(null);
  const speakingTextRef = useRef<string | null>(null);
  const isInternalCancelRef = useRef<boolean>(false);
  const isSpeakingTitleRef = useRef<boolean>(false);
  
  const lastCharIndexRef = useRef<number>(0);
  const lastOrderRef = useRef<number | null>(null);
  const lastTextRef = useRef<string | null>(null);

  const playAnchor = useCallback(() => {
    const audio = anchorAudioRef.current;
    if (!audio || !audio.paused || audioPlayingPromiseRef.current) return;
    
    audioPlayingPromiseRef.current = audio.play();
    audioPlayingPromiseRef.current
      .then(() => {
        audioPlayingPromiseRef.current = null;
      })
      .catch(e => {
        audioPlayingPromiseRef.current = null;
        // Silently handle AbortError and NotSupportedError to prevent console noise
        if (e.name !== "AbortError" && e.name !== "NotSupportedError") {
          console.warn("[SACRED-ANCHOR] Playback failed:", e);
        }
      });
  }, []);

  // Initialize Speech Synthesis and the Audio Anchor
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      
      const audio = new Audio();
      // [THE SACRED ANCHOR]
      // Using a robust, minimal silent WAV that is universally supported without codec issues.
      audio.src = "data:audio/wav;base64,UklGRjIAAABXQVZFRm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAA";
      audio.loop = true;
      audio.volume = 0.01;
      audio.preload = "auto";
      anchorAudioRef.current = audio;

      // Ensure audio starts on user interaction
      const handleStartAnchor = () => {
        console.log("[SACRED-ANCHOR] Activating background session...");
        playAnchor();
      };
      window.addEventListener("voiceover-start-anchor", handleStartAnchor);

      /**
       * [THE SACRED WATCHDOG]
       * iPhone background execution is maintained by this periodic tick.
       * If the engine stalls while it should be playing, we pulse it.
       */
      const watchdog = setInterval(() => {
        const state = useReaderStore.getState();
        if (state.isVoiceoverPlaying && synthRef.current && !synthRef.current.speaking && !synthRef.current.pending) {
           console.log("[WATCHDOG] Engine stalled in background. Pulsing...");
           // Force a re-trigger of the current item
           const order = state.voiceoverCurrentOrder ?? state.currentOrder;
           if (state.voiceoverNonBibleText) {
             void speakText(state.voiceoverNonBibleText, "Liturgical Sequence", lastCharIndexRef.current);
           } else {
             void speak(order, false, lastCharIndexRef.current);
           }
        }
      }, 5000);

      const handleVoicesChanged = () => {
        setVoicesLoaded(true);
        if (synthRef.current?.getVoices().length === 0) {
          setTimeout(() => setVoicesLoaded(true), 100);
        }
      };
      if (synthRef.current) {
        if (synthRef.current.getVoices().length > 0) setVoicesLoaded(true);
        synthRef.current.onvoiceschanged = handleVoicesChanged;
      }

      return () => {
        window.removeEventListener("voiceover-start-anchor", handleStartAnchor);
        clearInterval(watchdog);
      };
    }
  }, [playAnchor]);

  const getBestVoice = useCallback(() => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) return null;

    if (translationSlug === "vul") {
      const latinVoices = voices.filter(v => v.lang.startsWith("la"));
      if (latinVoices.length > 0) return latinVoices.find(v => v.name.includes("Enhanced") || v.name.includes("Premium")) || latinVoices[0] || null;
      return voices.find(v => v.lang.startsWith("it") || v.lang.startsWith("es")) || voices[0] || null;
    }

    if (selectedVoiceURI) {
      const selected = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (selected) return selected;
    }

    const premiumVoices = voices.filter(v => v.lang.startsWith("en") && (v.name.includes("Enhanced") || v.name.includes("Premium")));
    return premiumVoices.find(v => v.name.includes("Alex")) || premiumVoices.find(v => v.name.includes("Samantha")) || premiumVoices.find(v => v.name.includes("Daniel")) || voices.find(v => v.lang.startsWith("en-US")) || voices[0] || null;
  }, [voicesLoaded, selectedVoiceURI, translationSlug]);

  const stop = useCallback(() => {
    isInternalCancelRef.current = true;
    if (synthRef.current) {
      if (synthRef.current.paused) synthRef.current.resume();
      synthRef.current.cancel();
    }
    if (anchorAudioRef.current) {
      anchorAudioRef.current.pause();
    }
    
    sessionRef.current++;
    speakingOrderRef.current = null;
    speakingTextRef.current = null;
    storeSetIsPlaying(false);
    setIsActive(false);
    setIsMinimized(false);
    setVerse(null);
    setCurrentOrder(null);
    setNonBibleText(null);
    setPlaylist(null);
    setQueue(null);
    setVerseProgress(0);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
  }, [storeSetIsPlaying, setIsActive, setIsMinimized, setVerse, setCurrentOrder, setNonBibleText, setPlaylist, setQueue, setVerseProgress]);

  const getNextQueueItem = useCallback((): VoiceoverQueueItem | null => {
    const s = useReaderStore.getState();
    const q = s.voiceoverQueue;
    const nb = s.voiceoverNonBibleText;
    const co = s.voiceoverCurrentOrder;

    if (!q || q.length === 0) return null;
    let currentIndex = -1;
    if (nb) currentIndex = q.findIndex(item => item.type === "text" && item.text === nb);
    else if (co !== null) currentIndex = q.findIndex(item => item.type === "verse" && item.order === co);
    if (currentIndex !== -1 && currentIndex < q.length - 1) return q[currentIndex + 1] ?? null;
    return null;
  }, []);

  const getNextOrder = useCallback((current: number) => {
    const s = useReaderStore.getState();
    const pl = s.voiceoverPlaylist;
    if (pl && pl.length > 0) {
      const idx = pl.indexOf(current);
      if (idx !== -1 && idx < pl.length - 1) return pl[idx + 1] ?? null;
      return null;
    }
    return current + 1;
  }, []);

  const skipForward = useCallback(() => {
    const nextItem = getNextQueueItem();
    if (nextItem) {
      if (nextItem.type === "verse") { setNonBibleText(null); setCurrentOrder(nextItem.order); }
      else { setCurrentOrder(null); setVerse(null); setNonBibleText(nextItem.text); }
      return;
    }
    const s = useReaderStore.getState();
    if (s.voiceoverNonBibleText) { setNonBibleText(null); setCurrentOrder(s.currentOrder); return; }
    const current = s.voiceoverCurrentOrder ?? s.currentOrder;
    const next = getNextOrder(current);
    if (next !== null) setCurrentOrder(next);
  }, [getNextOrder, getNextQueueItem, setCurrentOrder, setNonBibleText, setVerse]);

  const skipBackward = useCallback(() => {
    const s = useReaderStore.getState();
    if (s.voiceoverQueue && s.voiceoverQueue.length > 0) {
      let currentIndex = -1;
      if (s.voiceoverNonBibleText) currentIndex = s.voiceoverQueue.findIndex(item => item.type === "text" && item.text === s.voiceoverNonBibleText);
      else if (s.voiceoverCurrentOrder !== null) currentIndex = s.voiceoverQueue.findIndex(item => item.type === "verse" && item.order === s.voiceoverCurrentOrder);
      if (currentIndex > 0) {
        const prevItem = s.voiceoverQueue[currentIndex - 1]!;
        if (prevItem.type === "verse") { setNonBibleText(null); setCurrentOrder(prevItem.order); }
        else { setCurrentOrder(null); setVerse(null); setNonBibleText(prevItem.text); }
        return;
      }
    }
    if (s.voiceoverNonBibleText) { setNonBibleText(null); setCurrentOrder(s.currentOrder); return; }
    const current = s.voiceoverCurrentOrder ?? s.currentOrder;
    if (s.voiceoverPlaylist) {
      const idx = s.voiceoverPlaylist.indexOf(current);
      if (idx > 0) { const prev = s.voiceoverPlaylist[idx - 1]; if (prev !== undefined) setCurrentOrder(prev); }
    } else { setCurrentOrder(Math.max(1, current - 1)); }
  }, [setCurrentOrder, setNonBibleText, setVerse]);

  // Lock Screen Controls Setup
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => {
        window.dispatchEvent(new CustomEvent("voiceover-start-anchor"));
        storeSetIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler("pause", () => storeSetIsPlaying(false));
      navigator.mediaSession.setActionHandler("stop", stop);
      navigator.mediaSession.setActionHandler("previoustrack", skipBackward);
      navigator.mediaSession.setActionHandler("nexttrack", skipForward);
    }
  }, [storeSetIsPlaying, stop, skipBackward, skipForward]);

  useEffect(() => {
    const handleSkipFwd = () => skipForward();
    const handleSkipBwd = () => skipBackward();
    window.addEventListener("voiceover-skip-forward", handleSkipFwd);
    window.addEventListener("voiceover-skip-backward", handleSkipBwd);
    return () => {
      window.removeEventListener("voiceover-skip-forward", handleSkipFwd);
      window.removeEventListener("voiceover-skip-backward", handleSkipBwd);
    };
  }, [skipForward, skipBackward]);

  const cleanText = useCallback((text: string) => text.replace(/[*†‡§_]/g, " "), []);

  const updateMediaSession = useCallback((title: string, artist = "Catholic Bible Codex") => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: "Verbum Domini",
        artwork: [
          { src: "/logo.svg", sizes: "512x512", type: "image/svg+xml" },
          { src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml" }
        ]
      });
      navigator.mediaSession.playbackState = useReaderStore.getState().isVoiceoverPlaying ? "playing" : "paused";
    }
  }, []);

  const speakText = useCallback(async (text: string, title?: string, charOffset = 0) => {
    if (!synthRef.current || !useReaderStore.getState().isVoiceoverPlaying) return;

    isInternalCancelRef.current = true;
    if (synthRef.current.paused) synthRef.current.resume();
    synthRef.current.cancel();

    const currentSession = ++sessionRef.current;
    speakingTextRef.current = text;
    speakingOrderRef.current = null;
    setIsActive(true);

    // iOS specific settle time
    await new Promise(r => setTimeout(r, 80));
    if (currentSession !== sessionRef.current || !useReaderStore.getState().isVoiceoverPlaying) return;

    let textToSpeak = cleanText(text);
    if (charOffset > 0 && charOffset < textToSpeak.length) textToSpeak = textToSpeak.slice(charOffset);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = speed;
    utterance.volume = 1;

    utterance.onboundary = (event) => {
      if (currentSession === sessionRef.current) {
        lastCharIndexRef.current = charOffset + event.charIndex;
        setVerseProgress((lastCharIndexRef.current / text.length) * 100);
      }
    };

    utterance.onend = () => {
      if (isInternalCancelRef.current) { isInternalCancelRef.current = false; return; }
      const s = useReaderStore.getState();
      if (currentSession === sessionRef.current && s.isVoiceoverPlaying) {
        setVerseProgress(100);
        lastCharIndexRef.current = 0;
        const nextItem = getNextQueueItem();
        if (nextItem) {
          if (nextItem.type === "verse") { 
            setNonBibleText(null); 
            setCurrentOrder(nextItem.order); 
            void speak(nextItem.order);
          } else { 
            setNonBibleText(nextItem.text); 
            void speakText(nextItem.text);
          }
        } else if (s.voiceoverPlaylist && s.voiceoverPlaylist.length > 0) {
          setNonBibleText(null); 
          setCurrentOrder(s.voiceoverPlaylist[0]!);
          void speak(s.voiceoverPlaylist[0]!);
        } else { stop(); }
      }
    };

    utterance.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      if (useReaderStore.getState().isVoiceoverPlaying && currentSession === sessionRef.current) {
        setTimeout(() => { if (useReaderStore.getState().isVoiceoverPlaying) void speakText(text, title, lastCharIndexRef.current); }, 1000);
      }
    };

    isInternalCancelRef.current = false;
    synthRef.current.speak(utterance);
    updateMediaSession(title ?? "Sacred Text");
    
    // Ensure anchor is playing
    playAnchor();
  }, [speed, getBestVoice, cleanText, setVerseProgress, setNonBibleText, setCurrentOrder, stop, getNextQueueItem, updateMediaSession, playAnchor]);

  const speak = useCallback(async (order: number, forceTitle = false, charOffset = 0) => {
    if (!synthRef.current || !useReaderStore.getState().isVoiceoverPlaying) return;

    isInternalCancelRef.current = true;
    if (synthRef.current.paused) synthRef.current.resume();
    synthRef.current.cancel();

    const currentSession = ++sessionRef.current;
    speakingOrderRef.current = order;
    speakingTextRef.current = null;
    setIsActive(true);

    await new Promise(r => setTimeout(r, 80));
    if (currentSession !== sessionRef.current || !useReaderStore.getState().isVoiceoverPlaying) return;

    try {
      let verse = await db.verses.where("[translationId+globalOrder]").equals([translationSlug, order]).first();
      if (!verse) {
        const metadata = await db.verses.where("globalOrder").equals(order).first();
        if (metadata) {
          verse = await db.verses.where({ translationId: translationSlug, bookId: metadata.bookId, chapter: metadata.chapter, verse: metadata.verse }).first();
          if (!verse && translationSlug !== "drb") {
            verse = await db.verses.where({ translationId: "drb", bookId: metadata.bookId, chapter: metadata.chapter, verse: metadata.verse }).first();
          }
        }
      }

      if (!verse || !useReaderStore.getState().isVoiceoverPlaying || currentSession !== sessionRef.current) {
        if (!verse && useReaderStore.getState().isVoiceoverPlaying) {
          const next = getNextOrder(order);
          if (next !== null && next !== order) void speak(next, false, 0);
          else stop();
        }
        return;
      }

      let textToSpeak = "";
      let isTitle = false;
      const shouldSkipTitles = isTitleSkipActive;
      if (shouldSkipTitles) setIsTitleSkipActive(false);

      if (isReadTitlesEnabled && !forceTitle && !isSpeakingTitleRef.current && !shouldSkipTitles) {
        const reading = liturgicalReadings.find(r => r.orders[0] === order);
        if (reading) { textToSpeak = cleanText(`${reading.type}. ${reading.citation}.`); isTitle = true; }
        else if (verse.verse === 1) { textToSpeak = cleanText(`${verse.book.name}. Chapter ${verse.chapter}.`); isTitle = true; }
      }

      if (isTitle) { isSpeakingTitleRef.current = true; }
      else {
        isSpeakingTitleRef.current = false;
        textToSpeak = cleanText(verse.text);
        if (charOffset > 0 && charOffset < textToSpeak.length) textToSpeak = textToSpeak.slice(charOffset);
        else lastCharIndexRef.current = 0;
        setVerse(verse);
        setVerseProgress(0);
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      if (verse.translationId === "vul") utterance.lang = "la-IT";
      else if (translationSlug === "vul" && verse.translationId !== "vul") utterance.lang = "en-US";
      utterance.rate = speed;
      utterance.volume = 1;

      utterance.onboundary = (event) => {
        if (currentSession === sessionRef.current && !isTitle) {
          lastCharIndexRef.current = charOffset + event.charIndex;
          setVerseProgress((lastCharIndexRef.current / verse!.text.length) * 100);
        }
      };

      utterance.onend = () => {
        if (isInternalCancelRef.current) { isInternalCancelRef.current = false; return; }
        const s = useReaderStore.getState();
        if (currentSession === sessionRef.current && s.isVoiceoverPlaying) {
          if (isTitle) void speak(order, true, 0); 
          else {
            setVerseProgress(100);
            lastCharIndexRef.current = 0;
            const nextItem = getNextQueueItem();
            if (nextItem) {
              if (nextItem.type === "verse") { 
                setCurrentOrder(nextItem.order); 
                if (s.isVoiceoverFollowEnabled) setScrollToOrder(nextItem.order); 
                void speak(nextItem.order);
              } else { 
                setNonBibleText(nextItem.text); 
                void speakText(nextItem.text);
              }
            } else {
              const next = getNextOrder(order);
              if (next !== null) { 
                setCurrentOrder(next); 
                if (s.isVoiceoverFollowEnabled) setScrollToOrder(next); 
                void speak(next);
              } else stop();
            }
          }
        }
      };

      utterance.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return;
        if (useReaderStore.getState().isVoiceoverPlaying && currentSession === sessionRef.current) {
          setTimeout(() => { if (useReaderStore.getState().isVoiceoverPlaying) void speak(order, forceTitle, lastCharIndexRef.current); }, 1000);
        }
      };

      isInternalCancelRef.current = false;
      synthRef.current.speak(utterance);
      updateMediaSession(isTitle ? textToSpeak : `${verse.book.name} ${verse.chapter}:${verse.verse}`);

      // Ensure anchor is playing
      playAnchor();
    } catch (err) { console.error("Voiceover engine error:", err); }
  }, [translationSlug, speed, getBestVoice, isReadTitlesEnabled, liturgicalReadings, setCurrentOrder, setScrollToOrder, setVerse, stop, getNextOrder, getNextQueueItem, setIsActive, setVerseProgress, cleanText, setNonBibleText, isTitleSkipActive, setIsTitleSkipActive, updateMediaSession, playAnchor]);

  useEffect(() => {
    if (!synthRef.current) return;
    if (nonBibleText !== lastTextRef.current) { lastCharIndexRef.current = 0; lastTextRef.current = nonBibleText; }
    if (currentOrder !== lastOrderRef.current) { lastCharIndexRef.current = 0; lastOrderRef.current = currentOrder; }

    if (isPlaying) {
      // Ensure the background session is warm
      playAnchor();

      if (nonBibleText) {
        if (synthRef.current.speaking && speakingTextRef.current === nonBibleText && !isInternalCancelRef.current) return;
        const timer = setTimeout(() => { void speakText(nonBibleText, "Liturgical Sequence", lastCharIndexRef.current); }, 50);
        return () => clearTimeout(timer);
      } else {
        const orderToSpeak = currentOrder ?? globalCurrentOrder;
        if (synthRef.current.speaking && speakingOrderRef.current === orderToSpeak && !isInternalCancelRef.current) return;
        const timer = setTimeout(() => { void speak(orderToSpeak, false, lastCharIndexRef.current); }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      if (isActive) {
        isInternalCancelRef.current = true;
        synthRef.current.cancel();
        if (anchorAudioRef.current) anchorAudioRef.current.pause();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
      } else {
        speakingOrderRef.current = null;
        speakingTextRef.current = null;
        lastCharIndexRef.current = 0;
        isInternalCancelRef.current = true;
        if (synthRef.current.paused) synthRef.current.resume();
        synthRef.current.cancel();
        if (anchorAudioRef.current) anchorAudioRef.current.pause();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
      }
    }
  }, [isPlaying, isActive, currentOrder, globalCurrentOrder, nonBibleText, speak, speakText, playAnchor]);

  return null;
}
