"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TextSize   = "normal" | "large" | "xl";
export type TtsSpeed   = "slow" | "normal" | "fast";

interface AccessibilityState {
  easyReading:   boolean;
  textSize:      TextSize;
  highContrast:  boolean;
  reduceMotion:  boolean;
  autoReadTTS:   boolean;
  ttsSpeed:      TtsSpeed;

  setEasyReading:  (v: boolean) => void;
  setTextSize:     (v: TextSize) => void;
  setHighContrast: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setAutoReadTTS:  (v: boolean) => void;
  setTtsSpeed:     (v: TtsSpeed) => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      easyReading:   false,
      textSize:      "normal",
      highContrast:  false,
      reduceMotion:  false,
      autoReadTTS:   false,
      ttsSpeed:      "normal",

      setEasyReading:  (v) => set({ easyReading: v }),
      setTextSize:     (v) => set({ textSize: v }),
      setHighContrast: (v) => set({ highContrast: v }),
      setReduceMotion: (v) => set({ reduceMotion: v }),
      setAutoReadTTS:  (v) => set({ autoReadTTS: v }),
      setTtsSpeed:     (v) => set({ ttsSpeed: v }),
    }),
    { name: "aula-accessibility" },
  ),
);
