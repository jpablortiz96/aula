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
  const [error, setError] = useState<string | null>(null);

  // Track per-file progress for the overall aggregation
  const fileProgressMapRef = useRef<Map<string, { loaded: number; total: number }>>(
    new Map()
  );

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
          if (msg.status !== "generating") {
            // Reset streamed text when done/ready
          }
          break;

        case "progress": {
          const { file, loaded, total } = msg;
          const map = fileProgressMapRef.current;

          if (total > 0) {
            map.set(file, { loaded, total });
          }

          // Compute overall progress across all known files
          let totalLoaded = 0;
          let totalSize = 0;
          map.forEach((v) => {
            totalLoaded += v.loaded;
            totalSize += v.total;
          });

          if (totalSize > 0) {
            setOverallProgress(Math.round((totalLoaded / totalSize) * 100));
          }

          // Build sorted list for display
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

        case "token":
          setStreamedText((prev) => prev + msg.token);
          break;

        case "done":
          setTokensPerSecond(msg.tokensPerSecond);
          // Commit streamed text to history
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

    // Push user message to history before sending
    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: prompt },
    ];

    const msg: WorkerInMessage = {
      type: "generate",
      prompt,
      conversationHistory: historyRef.current.slice(0, -1), // exclude the message we just added
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
    error,
  };
}
