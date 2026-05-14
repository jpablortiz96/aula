"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API types — not yet in lib.dom.d.ts for all TS versions
interface SpeechRecognitionAlternativeExt {
  readonly transcript: string;
}
interface SpeechRecognitionResultExt {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternativeExt;
  [index: number]: SpeechRecognitionAlternativeExt;
}
interface SpeechRecognitionResultListExt {
  readonly length: number;
  item(index: number): SpeechRecognitionResultExt;
  [index: number]: SpeechRecognitionResultExt;
}
interface SpeechRecognitionEventExt extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListExt;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventExt) => void) | null;
  onend:    (() => void) | null;
  onerror:  (() => void) | null;
  start(): void;
  stop():  void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as SpeechRecognitionCtor | null;
}

export interface UseSpeechRecognitionReturn {
  isListening:       boolean;
  interimTranscript: string;
  supported:         boolean;
  start:             () => void;
  stop:              () => void;
}

export function useSpeechRecognition(
  onFinal: (text: string) => void
): UseSpeechRecognitionReturn {
  const [isListening,       setIsListening]       = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef     = useRef(onFinal);
  onFinalRef.current   = onFinal;

  const supported = typeof window !== "undefined" && getSpeechRecognitionCtor() !== null;

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang            = "es-CO";
    recognition.continuous      = false;
    recognition.interimResults  = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          onFinalRef.current(result[0].transcript.trim());
          setInterimTranscript("");
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) setInterimTranscript(interim);
    };

    recognition.onend   = () => { setIsListening(false); setInterimTranscript(""); };
    recognition.onerror = () => { setIsListening(false); setInterimTranscript(""); };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setInterimTranscript("");
    recognitionRef.current.start();
    setIsListening(true);
  }, [isListening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, interimTranscript, supported, start, stop };
}
