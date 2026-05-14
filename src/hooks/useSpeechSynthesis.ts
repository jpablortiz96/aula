"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cleanTextForSpeech } from "@/lib/textToSpeech";
import type { Lang } from "@/store/i18nStore";

export interface UseSpeechSynthesisReturn {
  speaking: boolean;
  supported: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

const VOICE_PRIORITY_ES = ["es-CO", "es-MX", "es-US", "es-ES", "es-"];
const VOICE_PRIORITY_EN = ["en-US", "en-GB", "en-AU", "en-"];

export function useSpeechSynthesis(lang: Lang = "es"): UseSpeechSynthesisReturn {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const bcp47    = lang === "en" ? "en-US" : "es-CO";
  const priority = lang === "en" ? VOICE_PRIORITY_EN : VOICE_PRIORITY_ES;

  useEffect(() => {
    if (!supported) return;

    function pickVoice() {
      const voices = speechSynthesis.getVoices();
      for (const prefix of priority) {
        const match = voices.find((v) => v.lang.startsWith(prefix));
        if (match) { voiceRef.current = match; return; }
      }
      voiceRef.current = null;
    }

    pickVoice();
    speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, [supported, priority]);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    speechSynthesis.cancel();
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;
    const utt = new SpeechSynthesisUtterance(cleaned);
    if (voiceRef.current) utt.voice = voiceRef.current;
    utt.lang  = bcp47;
    utt.rate  = 0.92;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utt);
  }, [supported, bcp47]);

  const cancel = useCallback(() => {
    if (!supported) return;
    speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speaking, supported, speak, cancel };
}
