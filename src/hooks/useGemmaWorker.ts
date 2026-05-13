"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ModelStatus,
  type WorkerOutMessage,
  type WorkerInMessage,
  type ChatMessage,
} from "@/lib/constants";

interface FileProgress {
  file: string;
  loaded: number;
  total: number;
  percent: number;
}

interface UseGemmaWorkerReturn {
  loadModel: () => void;
  generate: (prompt: string) => void;
  status: ModelStatus;
  /** 0–100 overall download progress */
  overallProgress: number;
  fileProgresses: FileProgress[];
  streamedText: string;
  tokensPerSecond: number | null;
  /** Time-to-first-token in ms for the last generation */
  lastTtftMs: number | null;
  /** Total generation wall-clock time in ms for the last generation */
  lastTotalMs: number | null;
  error: string | null;
}

export function useGemmaWorker(): UseGemmaWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  const [status, setStatus] = useState<ModelStatus>("idle");
  const [overallProgress, setOverallProgress] = useState(0);
  const [fileProgresses, setFileProgresses] = useState<FileProgress[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [tokensPerSecond, setTokensPerSecond] = useState<number | null>(null);
  const [lastTtftMs, setLastTtftMs] = useState<number | null>(null);
  const [lastTotalMs, setLastTotalMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileProgressMapRef = useRef<Map<string, { loaded: number; total: number }>>(
    new Map()
  );
  const generationStartRef = useRef<number | null>(null);
  const firstTokenTimeRef = useRef<number | null>(null);
  const tokenCountRef = useRef<number>(0);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/gemma.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.addEventListener("message", (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case "status":
          setStatus(msg.status);
          break;

        case "progress": {
          const { file, loaded, total } = msg;
          const map = fileProgressMapRef.current;

          if (total > 0) {
            map.set(file, { loaded, total });
          }

          let totalLoaded = 0;
          let totalSize = 0;
          map.forEach((v) => {
            totalLoaded += v.loaded;
            totalSize += v.total;
          });

          if (totalSize > 0) {
            setOverallProgress(Math.round((totalLoaded / totalSize) * 100));
          }

          setFileProgresses(
            Array.from(map.entries()).map(([f, v]) => ({
              file: f,
              loaded: v.loaded,
              total: v.total,
              percent: v.total > 0 ? Math.round((v.loaded / v.total) * 100) : 0,
            }))
          );
          break;
        }

        case "token": {
          const now = performance.now();
          if (firstTokenTimeRef.current === null && generationStartRef.current !== null) {
            firstTokenTimeRef.current = now;
          }
          tokenCountRef.current += 1;

          // Update live tok/s every token
          if (generationStartRef.current !== null) {
            const elapsed = (now - generationStartRef.current) / 1000;
            if (elapsed > 0) {
              setTokensPerSecond(tokenCountRef.current / elapsed);
            }
          }

          setStreamedText((prev) => prev + msg.token);
          break;
        }

        case "done":
          setTokensPerSecond(msg.tokensPerSecond);

          if (generationStartRef.current !== null) {
            const totalMs = performance.now() - generationStartRef.current;
            setLastTotalMs(totalMs);

            if (firstTokenTimeRef.current !== null) {
              setLastTtftMs(firstTokenTimeRef.current - generationStartRef.current);
            }
          }

          setStreamedText((prev) => {
            if (prev) {
              historyRef.current = [
                ...historyRef.current,
                { role: "assistant", content: prev },
              ];
            }
            return prev;
          });
          break;

        case "error":
          setError(msg.error);
          console.error("[GemmaWorker]", msg.error);
          break;
      }
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const loadModel = useCallback(() => {
    if (!workerRef.current) return;
    setError(null);
    fileProgressMapRef.current.clear();
    setOverallProgress(0);
    setFileProgresses([]);
    const msg: WorkerInMessage = { type: "load" };
    workerRef.current.postMessage(msg);
  }, []);

  const generate = useCallback((prompt: string) => {
    if (!workerRef.current || !prompt.trim()) return;
    setError(null);
    setStreamedText("");
    setTokensPerSecond(null);

    generationStartRef.current = performance.now();
    firstTokenTimeRef.current = null;
    tokenCountRef.current = 0;

    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: prompt },
    ];

    const msg: WorkerInMessage = {
      type: "generate",
      prompt,
      conversationHistory: historyRef.current.slice(0, -1),
    };
    workerRef.current.postMessage(msg);
  }, []);

  return {
    loadModel,
    generate,
    status,
    overallProgress,
    fileProgresses,
    streamedText,
    tokensPerSecond,
    lastTtftMs,
    lastTotalMs,
    error,
  };
}
