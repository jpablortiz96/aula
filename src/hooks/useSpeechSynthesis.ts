"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cleanTextForSpeech } from "@/lib/textToSpeech";

export interface UseSpeechSynthesisReturn {
  speaking: boolean;
  supported: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

const VOICE_PRIORITY = ["es-CO", "es-MX", "es-US", "es-ES", "es-"];

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;

    function pickVoice() {
      const voices = speechSynthesis.getVoices();
      for (const prefix of VOICE_PRIORITY) {
        const match = voices.find((v) => v.lang.startsWith(prefix));
        if (match) { voiceRef.current = match; return; }
      }
      voiceRef.current = null;
    }

    pickVoice();
    speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    speechSynthesis.cancel();
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;
    const utt = new SpeechSynthesisUtterance(cleaned);
    if (voiceRef.current) utt.voice = voiceRef.current;
    utt.lang = "es-CO";
    utt.rate = 0.92;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utt);
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speaking, supported, speak, cancel };
}
