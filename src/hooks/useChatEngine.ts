"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEngineStore } from "@/store/engineStore";
import { detectBestEngine, clearEngineCache } from "@/engines/EngineRegistry";
import { MediaPipeEngine } from "@/engines/mediapipe/MediaPipeEngine";
import { CloudBoostEngine } from "@/engines/cloud-boost/CloudBoostEngine";
import { LegacyOnnxEngine } from "@/engines/legacy/LegacyOnnxEngine";
import type { ChatEngine, ChatMessage, EngineCapabilities, EngineId } from "@/engines/types";
import type { ModelStatus } from "@/lib/constants";

function createEngine(id: EngineId): ChatEngine {
  switch (id) {
    case "mediapipe":    return new MediaPipeEngine();
    case "cloud-boost":  return new CloudBoostEngine();
    case "legacy-onnx":  return new LegacyOnnxEngine();
  }
}

export interface UseChatEngineReturn {
  resolvedEngineId: EngineId | null;
  status: ModelStatus;
  capabilities: EngineCapabilities | null;
  progress: number;
  streamedText: string;
  tokensPerSecond: number | null;
  lastTtftMs: number | null;
  lastTotalMs: number | null;
  error: string | null;
  load: () => void;
  generate: (prompt: string) => void;
  abort: () => void;
  switchEngine: (id: EngineId | "auto") => void;
}

const SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content:
    "Eres AULA, un tutor para estudiantes de secundaria en Latinoamérica. " +
    "Responde en español neutro. " +
    "Usa markdown y LaTeX ($...$ inline, $$...$$ display). Máximo 200 palabras. Máximo 2 emojis.",
};

export function useChatEngine(): UseChatEngineReturn {
  const { selectedEngineId, preferCloud, setEngine } = useEngineStore();

  const engineRef = useRef<ChatEngine | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  const [resolvedEngineId, setResolvedEngineId] = useState<EngineId | null>(null);
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [capabilities, setCapabilities] = useState<EngineCapabilities | null>(null);
  const [progress, setProgress] = useState(0);
  const [streamedText, setStreamedText] = useState("");
  const [tokensPerSecond, setTokensPerSecond] = useState<number | null>(null);
  const [lastTtftMs, setLastTtftMs] = useState<number | null>(null);
  const [lastTotalMs, setLastTotalMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generationStartRef = useRef<number | null>(null);
  const firstTokenTimeRef = useRef<number | null>(null);
  const tokenCountRef = useRef(0);

  // Resolve which engine to use
  const resolveEngine = useCallback(async (): Promise<EngineId> => {
    if (selectedEngineId !== "auto") return selectedEngineId;
    return detectBestEngine(preferCloud);
  }, [selectedEngineId, preferCloud]);

  const load = useCallback(async () => {
    setError(null);
    setProgress(0);
    setStatus("loading");

    try {
      const id = await resolveEngine();
      setResolvedEngineId(id);

      // Unload existing engine if switching
      if (engineRef.current?.id !== id) {
        await engineRef.current?.unload?.();
        engineRef.current = createEngine(id);
        historyRef.current = [];
      }

      setCapabilities(engineRef.current.capabilities);

      await engineRef.current.load((p) => setProgress(p));
      setStatus("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
    }
  }, [resolveEngine]);

  // Expose load as a stable trigger
  const loadRef = useRef(load);
  loadRef.current = load;
  const triggerLoad = useCallback(() => { void loadRef.current(); }, []);

  const generate = useCallback((prompt: string) => {
    if (!engineRef.current || status !== "ready") return;

    setError(null);
    setStreamedText("");
    setTokensPerSecond(null);

    generationStartRef.current = performance.now();
    firstTokenTimeRef.current = null;
    tokenCountRef.current = 0;

    const userMsg: ChatMessage = { role: "user", content: prompt };
    historyRef.current = [...historyRef.current, userMsg];

    const messages: ChatMessage[] = [SYSTEM_MESSAGE, ...historyRef.current];

    setStatus("generating");

    void engineRef.current
      .generate(messages, {
        maxTokens: 512,
        temperature: 0.7,
        onToken: (token) => {
          const now = performance.now();
          if (firstTokenTimeRef.current === null) {
            firstTokenTimeRef.current = now;
          }
          tokenCountRef.current += 1;

          // Measure tok/s from first token, not from request start
          const measureFrom = firstTokenTimeRef.current;
          const elapsed = (now - measureFrom) / 1000;
          if (elapsed > 0) setTokensPerSecond(tokenCountRef.current / elapsed);

          setStreamedText((prev) => prev + token);
        },
      })
      .then((full) => {
        if (generationStartRef.current !== null) {
          const totalMs = performance.now() - generationStartRef.current;
          setLastTotalMs(totalMs);
          if (firstTokenTimeRef.current !== null) {
            setLastTtftMs(firstTokenTimeRef.current - generationStartRef.current);
          }
        }

        // Final tok/s from first token
        const measureFrom = firstTokenTimeRef.current ?? generationStartRef.current;
        if (measureFrom !== null && tokenCountRef.current > 0) {
          const finalTps = tokenCountRef.current / ((performance.now() - measureFrom) / 1000);
          setTokensPerSecond(finalTps);
        }

        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: full },
        ];

        setStatus("ready");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("ready");
      });
  }, [status]);

  const abort = useCallback(() => {
    engineRef.current?.abort?.();
  }, []);

  const switchEngine = useCallback((id: EngineId | "auto") => {
    clearEngineCache();
    setEngine(id);
    void engineRef.current?.unload?.();
    engineRef.current = null;
    setResolvedEngineId(null);
    setStatus("idle");
    setProgress(0);
    setStreamedText("");
    setTokensPerSecond(null);
    historyRef.current = [];
  }, [setEngine]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      void engineRef.current?.unload?.();
    };
  }, []);

  return {
    resolvedEngineId,
    status,
    capabilities,
    progress,
    streamedText,
    tokensPerSecond,
    lastTtftMs,
    lastTotalMs,
    error,
    load: triggerLoad,
    generate,
    abort,
    switchEngine,
  };
}
