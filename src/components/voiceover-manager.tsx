"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReaderStore, type VoiceoverQueueItem } from "~/hooks/use-reader-store";
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
  const liturgicalReadings = useReaderStore((state) => state.liturgicalReadings);
  const selectedVoiceURI = useReaderStore((state) => state.voiceoverVoiceURI);

  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  const sessionRef = useRef<number>(0);
  const speakingOrderRef = useRef<number | null>(null);
  const speakingTextRef = useRef<string | null>(null);
  const isInternalCancelRef = useRef<boolean>(false);
  const isSpeakingTitleRef = useRef<boolean>(false);
  
  const lastCharIndexRef = useRef<number>(0);
  const lastOrderRef = useRef<number | null>(null);
  const lastTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
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
    }
  }, []);

  const getBestVoice = useCallback(() => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) return null;

    if (translationSlug === "vul") {
      const latinVoices = voices.filter(v => v.lang.startsWith("la"));
      if (latinVoices.length > 0) {
        return latinVoices.find(v => v.name.includes("Enhanced") || v.name.includes("Premium")) || latinVoices[0] || null;
      }
      const romanceVoices = voices.filter(v => v.lang.startsWith("it") || v.lang.startsWith("es"));
      if (romanceVoices.length > 0) return romanceVoices[0] || null;
      return voices[0] || null;
    }

    if (selectedVoiceURI) {
      const selected = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (selected) return selected;
    }

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
  }, [voicesLoaded, selectedVoiceURI, translationSlug]);

  const stop = useCallback(() => {
    isInternalCancelRef.current = true;
    lastCharIndexRef.current = 0;
    
    if (synthRef.current) {
      if (synthRef.current.paused) synthRef.current.resume();
      synthRef.current.cancel();
    }
    
    sessionRef.current++;
    speakingOrderRef.current = null;
    speakingTextRef.current = null;
    setIsPlaying(false);
    setIsActive(false);
    setIsMinimized(false);
    setVerse(null);
    setCurrentOrder(null);
    setNonBibleText(null);
    setPlaylist(null);
    setQueue(null);
    setVerseProgress(0);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }
  }, [setIsPlaying, setIsActive, setIsMinimized, setVerse, setCurrentOrder, setNonBibleText, setPlaylist, setQueue, setVerseProgress]);

  const getNextQueueItem = useCallback((): VoiceoverQueueItem | null => {
    if (!queue || queue.length === 0) return null;
    
    let currentIndex = -1;
    if (nonBibleText) {
      currentIndex = queue.findIndex(item => item.type === "text" && item.text === nonBibleText);
    } else if (currentOrder !== null) {
      currentIndex = queue.findIndex(item => item.type === "verse" && item.order === currentOrder);
    }
    
    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      return queue[currentIndex + 1] ?? null;
    }
    return null;
  }, [queue, nonBibleText, currentOrder]);

  const getNextOrder = useCallback((current: number) => {
    if (playlist && playlist.length > 0) {
      const idx = playlist.indexOf(current);
      if (idx !== -1 && idx < playlist.length - 1) {
        return playlist[idx + 1] ?? null;
      }
      return null;
    }
    return current + 1;
  }, [playlist]);

  const skipForward = useCallback(() => {
    const nextItem = getNextQueueItem();
    if (nextItem) {
      lastCharIndexRef.current = 0;
      if (nextItem.type === "verse") {
        setNonBibleText(null);
        setCurrentOrder(nextItem.order);
      } else {
        setCurrentOrder(null);
        setVerse(null);
        setNonBibleText(nextItem.text);
      }
      return;
    }

    if (nonBibleText) {
      setNonBibleText(null);
      setCurrentOrder(globalCurrentOrder);
      return;
    }
    const current = currentOrder ?? globalCurrentOrder;
    const next = getNextOrder(current);
    if (next !== null) {
      lastCharIndexRef.current = 0;
      setCurrentOrder(next);
    }
  }, [currentOrder, globalCurrentOrder, getNextOrder, getNextQueueItem, setCurrentOrder, nonBibleText, setNonBibleText, setVerse]);

  const skipBackward = useCallback(() => {
    if (queue && queue.length > 0) {
      let currentIndex = -1;
      if (nonBibleText) {
        currentIndex = queue.findIndex(item => item.type === "text" && item.text === nonBibleText);
      } else if (currentOrder !== null) {
        currentIndex = queue.findIndex(item => item.type === "verse" && item.order === currentOrder);
      }
      
      if (currentIndex > 0) {
        const prevItem = queue[currentIndex - 1]!;
        lastCharIndexRef.current = 0;
        if (prevItem.type === "verse") {
          setNonBibleText(null);
          setCurrentOrder(prevItem.order);
        } else {
          setCurrentOrder(null);
          setVerse(null);
          setNonBibleText(prevItem.text);
        }
        return;
      }
    }

    if (nonBibleText) {
      setNonBibleText(null);
      setCurrentOrder(globalCurrentOrder);
      return;
    }
    const current = currentOrder ?? globalCurrentOrder;
    lastCharIndexRef.current = 0;
    if (playlist) {
      const idx = playlist.indexOf(current);
      if (idx > 0) {
        const prev = playlist[idx - 1];
        if (prev !== undefined) setCurrentOrder(prev);
      }
    } else {
      setCurrentOrder(Math.max(1, current - 1));
    }
  }, [currentOrder, globalCurrentOrder, playlist, queue, setCurrentOrder, nonBibleText, setNonBibleText, setVerse]);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler("stop", stop);
      navigator.mediaSession.setActionHandler("previoustrack", skipBackward);
      navigator.mediaSession.setActionHandler("nexttrack", skipForward);
    }
  }, [setIsPlaying, stop, skipBackward, skipForward]);

  // Listen for custom skip events from useVoiceover hook
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

  const cleanText = useCallback((text: string) => {
    return text.replace(/[*†‡§_]/g, " ");
  }, []);

  const speakText = useCallback(async (text: string, title?: string, charOffset = 0) => {
    if (!synthRef.current || !isPlaying) return;

    isInternalCancelRef.current = true;
    if (synthRef.current.paused) synthRef.current.resume();
    synthRef.current.cancel();

    const currentSession = ++sessionRef.current;
    speakingTextRef.current = text;
    speakingOrderRef.current = null;
    setIsActive(true);

    let textToSpeak = cleanText(text);
    if (charOffset > 0 && charOffset < textToSpeak.length) {
      textToSpeak = textToSpeak.slice(charOffset);
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const voice = getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = speed;
    utterance.volume = 1;

    utterance.onboundary = (event) => {
      if (currentSession === sessionRef.current) {
        lastCharIndexRef.current = charOffset + event.charIndex;
        const progress = (lastCharIndexRef.current / text.length) * 100;
        setVerseProgress(progress);
      }
    };

    utterance.onend = () => {
      if (isInternalCancelRef.current) {
        isInternalCancelRef.current = false;
        return;
      }
      if (currentSession === sessionRef.current && useReaderStore.getState().isVoiceoverPlaying) {
        setVerseProgress(100);
        lastCharIndexRef.current = 0;
        
        const nextItem = getNextQueueItem();
        if (nextItem) {
          if (nextItem.type === "verse") {
            setNonBibleText(null);
            setCurrentOrder(nextItem.order);
          } else {
            setNonBibleText(nextItem.text);
          }
        } else if (playlist && playlist.length > 0) {
          setNonBibleText(null);
          setCurrentOrder(playlist[0]!);
        } else {
          stop();
        }
      }
    };

    isInternalCancelRef.current = false;
    synthRef.current.speak(utterance);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title ?? "Sanctuary Text",
        artist: "Catholic Bible Codex",
        album: "Verbum Domini",
        artwork: [{ src: "/favicon.svg", sizes: "512x512", type: "image/svg+xml" }]
      });
      navigator.mediaSession.playbackState = "playing";
    }
  }, [isPlaying, speed, getBestVoice, cleanText, setVerseProgress, setNonBibleText, setCurrentOrder, playlist, stop, getNextQueueItem]);

  const speak = useCallback(async (order: number, forceTitle = false, charOffset = 0) => {
    if (!synthRef.current || !isPlaying) return;

    isInternalCancelRef.current = true;
    if (synthRef.current.paused) synthRef.current.resume();
    synthRef.current.cancel();

    const currentSession = ++sessionRef.current;
    speakingOrderRef.current = order;
    speakingTextRef.current = null;
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

      let textToSpeak = "";
      let isTitle = false;

      if (isReadTitlesEnabled && !forceTitle && !isSpeakingTitleRef.current) {
        const reading = liturgicalReadings.find(r => r.orders[0] === order);
        if (reading) {
          textToSpeak = cleanText(`${reading.type}. ${reading.citation}.`);
          isTitle = true;
        } else if (verse.verse === 1) {
          textToSpeak = cleanText(`${verse.book.name}. Chapter ${verse.chapter}.`);
          isTitle = true;
        }
      }

      if (isTitle) {
        isSpeakingTitleRef.current = true;
      } else {
        isSpeakingTitleRef.current = false;
        textToSpeak = cleanText(verse.text);
        if (charOffset > 0 && charOffset < textToSpeak.length) {
          textToSpeak = textToSpeak.slice(charOffset);
        } else {
          lastCharIndexRef.current = 0;
        }
        setVerse(verse);
        setVerseProgress(0);
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = speed;
      utterance.volume = 1;

      utterance.onboundary = (event) => {
        if (currentSession === sessionRef.current && !isTitle) {
          lastCharIndexRef.current = charOffset + event.charIndex;
          const progress = (lastCharIndexRef.current / verse.text.length) * 100;
          setVerseProgress(progress);
        }
      };

      utterance.onend = () => {
        if (isInternalCancelRef.current) {
          isInternalCancelRef.current = false;
          return;
        }
        if (currentSession === sessionRef.current && useReaderStore.getState().isVoiceoverPlaying) {
          if (isTitle) {
            void speak(order, true, 0); 
          } else {
            setVerseProgress(100);
            lastCharIndexRef.current = 0;
            
            const nextItem = getNextQueueItem();
            if (nextItem) {
              if (nextItem.type === "verse") {
                setCurrentOrder(nextItem.order);
                if (useReaderStore.getState().isVoiceoverFollowEnabled) setScrollToOrder(nextItem.order);
              } else {
                setNonBibleText(nextItem.text);
              }
            } else {
              const next = getNextOrder(order);
              if (next !== null) {
                setCurrentOrder(next);
                if (useReaderStore.getState().isVoiceoverFollowEnabled) setScrollToOrder(next);
              } else {
                stop();
              }
            }
          }
        }
      };

      isInternalCancelRef.current = false;
      synthRef.current.speak(utterance);

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: isTitle ? `Title: ${textToSpeak}` : `${verse.book.name} ${verse.chapter}:${verse.verse}`,
          artist: "Catholic Bible Codex",
          album: "Verbum Domini",
          artwork: [{ src: "/favicon.svg", sizes: "512x512", type: "image/svg+xml" }]
        });
        navigator.mediaSession.playbackState = "playing";
      }
    } catch (err) {
      console.error("Voiceover engine error:", err);
    }
  }, [translationSlug, isPlaying, speed, getBestVoice, isReadTitlesEnabled, liturgicalReadings, setCurrentOrder, setScrollToOrder, setVerse, stop, getNextOrder, getNextQueueItem, setIsActive, setVerseProgress, cleanText, setNonBibleText]);

  useEffect(() => {
    if (!synthRef.current) return;

    if (nonBibleText !== lastTextRef.current) {
      lastCharIndexRef.current = 0;
      lastTextRef.current = nonBibleText;
    }
    if (currentOrder !== lastOrderRef.current) {
      lastCharIndexRef.current = 0;
      lastOrderRef.current = currentOrder;
    }

    if (isPlaying) {
      if (nonBibleText) {
        if (synthRef.current.speaking && speakingTextRef.current === nonBibleText && !isInternalCancelRef.current) return;
        const timer = setTimeout(() => {
          void speakText(nonBibleText, "Liturgical Sequence", lastCharIndexRef.current);
        }, 50);
        return () => clearTimeout(timer);
      } else {
        const orderToSpeak = currentOrder ?? globalCurrentOrder;
        if (synthRef.current.speaking && speakingOrderRef.current === orderToSpeak && !isInternalCancelRef.current) return;
        
        // Only trigger speak if we have a valid order and it's not already speaking it
        const timer = setTimeout(() => {
          void speak(orderToSpeak, false, lastCharIndexRef.current);
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      if (isActive) {
        isInternalCancelRef.current = true;
        synthRef.current.cancel();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
      } else {
        speakingOrderRef.current = null;
        speakingTextRef.current = null;
        lastCharIndexRef.current = 0;
        isInternalCancelRef.current = true;
        if (synthRef.current.paused) synthRef.current.resume();
        synthRef.current.cancel();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
      }
    }
  }, [isPlaying, isActive, currentOrder, globalCurrentOrder, nonBibleText, speak, speakText]);

  return null;
}
