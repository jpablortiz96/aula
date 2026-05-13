"use client";

import { useChatEngine } from "@/hooks/useChatEngine";
import { ChatInterface } from "@/components/ChatInterface";
import { GpuDiagnostics } from "@/components/GpuDiagnostics";
import { BenchmarkPanel } from "@/components/BenchmarkPanel";
import { ENGINE_DISPLAY } from "@/engines/EngineRegistry";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ChatPage() {
  const {
    resolvedEngineId,
    status,
    capabilities,
    progress,
    streamedText,
    tokensPerSecond,
    lastTtftMs,
    lastTotalMs,
    error,
    load,
    generate,
  } = useChatEngine();

  const isLocal = capabilities?.runsLocally ?? true;
  const isLoading = status === "loading";
  const isReady = status === "ready" || status === "generating";
  const engineLabel = resolvedEngineId ? ENGINE_DISPLAY[resolvedEngineId] : "Auto";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">AULA</h1>
            <div className="flex items-center gap-3">
              {resolvedEngineId && (
                <span className="text-xs font-mono bg-gray-100 border px-2 py-0.5 rounded">
                  Engine: {engineLabel}
                </span>
              )}
              <Link href="/settings" className="text-xs text-muted-foreground hover:underline">
                Settings →
              </Link>
              <Link href="/" className="text-xs text-muted-foreground hover:underline">
                ← Home
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            AI tutor powered by Gemma 4 — works offline after first load.
          </p>
        </div>

        {/* Privacy banner */}
        {isReady && (
          isLocal ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-800">
                100% local — works offline after first load.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-blue-800">
                Using cloud — switch to local for full privacy in{" "}
                <Link href="/settings" className="underline">Settings</Link>.
              </span>
            </div>
          )
        )}

        {/* Load card */}
        {!isReady && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Load Model</span>
                {status === "error" && (
                  <span className="text-xs text-red-600 font-normal">Error — check Settings</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Initializing {engineLabel}…</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              <Button
                onClick={load}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {isLoading ? "Loading…" : "Load AULA"}
              </Button>
              {!resolvedEngineId && !isLoading && (
                <p className="text-xs text-muted-foreground">
                  Auto-selects the best engine for your hardware.{" "}
                  <Link href="/settings" className="underline">Change in Settings</Link>.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* GPU diagnostics (always visible) */}
        <GpuDiagnostics />

        {/* Benchmark (only for local engines) */}
        {isLocal && (
          <BenchmarkPanel
            modelStatus={status}
            tokensPerSecond={tokensPerSecond}
            lastTtftMs={lastTtftMs}
            lastTotalMs={lastTotalMs}
            onRun={generate}
          />
        )}

        {/* Chat */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Chat{resolvedEngineId ? ` — ${engineLabel}` : ""}
            </CardTitle>
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

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          First load downloads ≈1.5 GB (local) or zero (cloud). After that: works offline.
          Cached in your browser.
        </p>
      </div>
    </div>
  );
}
