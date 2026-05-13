"use client";

import { useEffect, useRef, useState } from "react";
import { useGemmaWorker } from "@/hooks/useGemmaWorker";
import { ModelLoader } from "@/components/ModelLoader";
import { ChatInterface } from "@/components/ChatInterface";
import { GpuDiagnostics } from "@/components/GpuDiagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const BENCHMARK_PROMPT = "Cuenta del 1 al 50.";

interface BenchmarkResult {
  tps: number;
  ttftMs: number;
  totalMs: number;
}

export default function SpikePage() {
  const {
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
  } = useGemmaWorker();

  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const benchmarkPendingRef = useRef(false);

  // Capture benchmark result when generation finishes
  useEffect(() => {
    if (benchmarkPendingRef.current && status === "ready" && tokensPerSecond !== null) {
      benchmarkPendingRef.current = false;
      setBenchmarkRunning(false);
      setBenchmarkResult({
        tps: tokensPerSecond,
        ttftMs: lastTtftMs ?? 0,
        totalMs: lastTotalMs ?? 0,
      });
    }
  }, [status, tokensPerSecond, lastTtftMs, lastTotalMs]);

  function handleBenchmark() {
    setBenchmarkRunning(true);
    benchmarkPendingRef.current = true;
    generate(BENCHMARK_PROMPT);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">
              AULA — Validation Spike
            </h1>
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Home
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Technical spike: Gemma 4 E4B running 100% in-browser via WebGPU.
            Verify in DevTools → Network: zero requests during inference.
          </p>
        </div>

        {/* Local indicator */}
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-800">
            100% LOCAL — Zero server. All computation happens in your browser.
          </span>
        </div>

        {/* Model loader */}
        <ModelLoader
          status={status}
          overallProgress={overallProgress}
          onLoad={loadModel}
        />

        {/* GPU Diagnostics */}
        <GpuDiagnostics
          modelStatus={status}
          onBenchmark={handleBenchmark}
          benchmarkResult={benchmarkResult}
          benchmarkRunning={benchmarkRunning}
        />

        {/* Per-file progress (shown while loading) */}
        {fileProgresses.length > 0 && status === "loading" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Download progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {fileProgresses.map((fp) => (
                <div key={fp.file} className="text-xs">
                  <div className="flex justify-between text-muted-foreground mb-0.5">
                    <span className="truncate max-w-[70%]">{fp.file}</span>
                    <span>
                      {(fp.loaded / 1024 / 1024).toFixed(0)} /{" "}
                      {(fp.total / 1024 / 1024).toFixed(0)} MB
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-150"
                      style={{ width: `${fp.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Chat interface */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chat with Gemma 4 E4B</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatInterface
              status={status}
              streamedText={streamedText}
              tokensPerSecond={tokensPerSecond}
              lastTotalMs={lastTotalMs}
              error={error}
              onGenerate={generate}
            />
          </CardContent>
        </Card>

        {/* DevTools hint */}
        <p className="text-xs text-center text-muted-foreground">
          Open DevTools → Network tab and verify: after the initial model
          download, there are zero network requests during inference.
        </p>
      </div>
    </div>
  );
}
