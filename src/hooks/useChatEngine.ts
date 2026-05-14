"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEngineStore } from "@/store/engineStore";
import { useChatStore, type MessageMeta } from "@/store/chatStore";
import { detectBestEngine, clearEngineCache, ENGINE_DISPLAY } from "@/engines/EngineRegistry";
import { MediaPipeEngine } from "@/engines/mediapipe/MediaPipeEngine";
import { CloudBoostEngine } from "@/engines/cloud-boost/CloudBoostEngine";
import { LegacyOnnxEngine } from "@/engines/legacy/LegacyOnnxEngine";
import type { ChatEngine, ChatMessage, EngineCapabilities, EngineId } from "@/engines/types";
import type { ModelStatus } from "@/lib/constants";
import { useI18nStore } from "@/store/i18nStore";
import { useChatSettingsStore } from "@/store/chatSettingsStore";

function createEngine(id: EngineId): ChatEngine {
  switch (id) {
    case "mediapipe":    return new MediaPipeEngine();
    case "cloud-boost":  return new CloudBoostEngine();
    case "legacy-onnx":  return new LegacyOnnxEngine();
  }
}

// ─── System prompts ───────────────────────────────────────────────────────────

function buildSystemPrompt(lang: "es" | "en", socratic: boolean): string {
  if (lang === "en") {
    return socratic
      ? "You are AULA in Socratic mode. NEVER give the final answer directly. Ask ONE guiding question at a time to help the student reason by themselves. If they are close, encourage them. If they go off track, redirect with another question. Only confirm when the student states the correct answer. Be warm and patient. Keep messages short. Respond in English."
      : "You are AULA, an AI tutor for secondary school students. Respond in clear, simple English. Use markdown and LaTeX ($...$ inline, $$...$$ display). Maximum 200 words. Maximum 2 emojis.";
  }
  return socratic
    ? "Eres AULA en modo socrático. NUNCA des la respuesta final directamente. Haz UNA pregunta guía a la vez que ayude al estudiante a razonar por sí mismo. Si se acerca, anímalo. Si se desvía, redirige con otra pregunta. Solo confirma la respuesta cuando el estudiante la diga correctamente. Sé cálido y paciente. Mensajes cortos. Responde en español."
    : "Eres AULA, un tutor para estudiantes de secundaria en Latinoamérica. Responde en español neutro latinoamericano. Usa markdown y LaTeX ($...$ inline, $$...$$ display). Máximo 200 palabras. Máximo 2 emojis.";
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseChatEngineReturn {
  resolvedEngineId: EngineId | null;
  status: ModelStatus;
  capabilities: EngineCapabilities | null;
  progress: number;
  streamedText: string;
  pendingUserMsg: string | null;
  tokensPerSecond: number | null;
  lastTtftMs: number | null;
  lastTotalMs: number | null;
  error: string | null;
  usingCloudForImage: boolean;
  load: () => void;
  generate: (prompt: string, images?: string[], meta?: MessageMeta) => void;
  abort: () => void;
  switchEngine: (id: EngineId | "auto") => void;
}

export function useChatEngine(): UseChatEngineReturn {
  const { selectedEngineId, preferCloud, setEngine } = useEngineStore();

  const engineRef = useRef<ChatEngine | null>(null);

  const [resolvedEngineId, setResolvedEngineId] = useState<EngineId | null>(null);
  const [status,           setStatus]           = useState<ModelStatus>("idle");
  const [capabilities,     setCapabilities]     = useState<EngineCapabilities | null>(null);
  const [progress,         setProgress]         = useState(0);
  const [streamedText,     setStreamedText]     = useState("");
  const [pendingUserMsg,   setPendingUserMsg]   = useState<string | null>(null);
  const [tokensPerSecond,  setTokensPerSecond]  = useState<number | null>(null);
  const [lastTtftMs,       setLastTtftMs]       = useState<number | null>(null);
  const [lastTotalMs,      setLastTotalMs]      = useState<number | null>(null);
  const [error,            setError]            = useState<string | null>(null);
  const [usingCloudForImage, setUsingCloudForImage] = useState(false);

  const generationStartRef = useRef<number | null>(null);
  const firstTokenTimeRef  = useRef<number | null>(null);
  const tokenCountRef      = useRef(0);
  const activeGenRef       = useRef<ChatEngine | null>(null);

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

      if (engineRef.current?.id !== id) {
        engineRef.current?.abort();
        await engineRef.current?.unload?.();
        engineRef.current = createEngine(id);
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

  const loadRef = useRef(load);
  loadRef.current = load;
  const triggerLoad = useCallback(() => { void loadRef.current(); }, []);

  const generate = useCallback((prompt: string, images?: string[], meta?: MessageMeta) => {
    if (!engineRef.current || status !== "ready") return;

    // Read current language + mode from stores (works outside React render cycle)
    const lang     = useI18nStore.getState().lang;
    const socratic = useChatSettingsStore.getState().socraticMode;

    const hasImages = (images?.length ?? 0) > 0;
    const needsCloudFallback = hasImages && !engineRef.current.capabilities.supportsMultimodal;

    if (needsCloudFallback) {
      const apiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("aula:google-ai-api-key")
          : null;
      if (!apiKey) {
        useChatStore.getState().addMessage(
          "system-notice",
          lang === "en"
            ? "📷 To analyze images, AULA uses Cloud Boost (requires API key in Settings)."
            : "📷 Para analizar imágenes, AULA usa Gemma 4 en la nube. Agrega tu API key gratuita en Ajustes."
        );
        return;
      }
    }

    setError(null);
    setStreamedText("");
    setTokensPerSecond(null);
    setPendingUserMsg(prompt);

    generationStartRef.current = performance.now();
    firstTokenTimeRef.current  = null;
    tokenCountRef.current      = 0;

    const genEngine: ChatEngine = needsCloudFallback ? new CloudBoostEngine() : engineRef.current;
    activeGenRef.current = genEngine;

    if (needsCloudFallback) setUsingCloudForImage(true);

    const systemMsg: ChatMessage = {
      role: "system",
      content: buildSystemPrompt(lang, socratic),
    };

    const history: ChatMessage[] = useChatStore.getState().messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const messages: ChatMessage[] = [
      systemMsg,
      ...history,
      { role: "user", content: prompt, images: images?.length ? images : undefined },
    ];

    setStatus("generating");

    void genEngine
      .generate(messages, {
        maxTokens: 2048,
        temperature: 0.7,
        onToken: (token) => {
          const now = performance.now();
          if (firstTokenTimeRef.current === null) firstTokenTimeRef.current = now;
          tokenCountRef.current += 1;
          const elapsed = (now - firstTokenTimeRef.current) / 1000;
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

        const measureFrom = firstTokenTimeRef.current ?? generationStartRef.current;
        if (measureFrom !== null && tokenCountRef.current > 0) {
          setTokensPerSecond(
            tokenCountRef.current / ((performance.now() - measureFrom) / 1000)
          );
        }

        const store = useChatStore.getState();
        store.addMessage("user", prompt);
        if (full) store.addMessage("assistant", full, meta);

        activeGenRef.current = null;
        setUsingCloudForImage(false);
        setPendingUserMsg(null);
        setStreamedText("");
        setStatus("ready");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        activeGenRef.current = null;
        setUsingCloudForImage(false);
        setError(msg);
        setPendingUserMsg(null);
        setStreamedText("");
        setStatus("ready");
      });
  }, [status]);

  const abort = useCallback(() => {
    activeGenRef.current?.abort();
  }, []);

  const switchEngine = useCallback((id: EngineId | "auto") => {
    if (resolvedEngineId) {
      const label = id === "auto" ? "Auto" : (ENGINE_DISPLAY[id as EngineId] ?? id);
      useChatStore.getState().addMessage("system-notice", `cambiado a ${label}`);
    }

    clearEngineCache();
    setEngine(id);
    engineRef.current?.abort();
    void engineRef.current?.unload?.();
    engineRef.current = null;
    setResolvedEngineId(null);
    setStatus("idle");
    setProgress(0);
    setStreamedText("");
    setPendingUserMsg(null);
    setTokensPerSecond(null);
  }, [resolvedEngineId, setEngine]);

  useEffect(() => {
    return () => {
      engineRef.current?.abort();
      void engineRef.current?.unload?.();
    };
  }, []);

  return {
    resolvedEngineId,
    status,
    capabilities,
    progress,
    streamedText,
    pendingUserMsg,
    tokensPerSecond,
    lastTtftMs,
    lastTotalMs,
    error,
    usingCloudForImage,
    load: triggerLoad,
    generate,
    abort,
    switchEngine,
  };
}
