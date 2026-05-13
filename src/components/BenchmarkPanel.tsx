"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type ModelStatus } from "@/lib/constants";

const BENCHMARK_PROMPT = "Cuenta del 1 al 30, separando cada número con coma.";
const MAX_RUNS = 5;

interface BenchmarkRun {
  id: number;
  tps: number;
  ttftMs: number;
  totalMs: number;
  timestamp: Date;
}

interface BenchmarkPanelProps {
  modelStatus: ModelStatus;
  tokensPerSecond: number | null;
  lastTtftMs: number | null;
  lastTotalMs: number | null;
  onRun: (prompt: string) => void;
}

function tpsColor(tps: number): string {
  if (tps > 10) return "text-green-600";
  if (tps >= 5) return "text-yellow-600";
  return "text-red-600";
}

function tpsBg(tps: number): string {
  if (tps > 10) return "bg-green-50 border-green-200";
  if (tps >= 5) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function runsToMarkdown(runs: BenchmarkRun[]): string {
  const header = "| Run | TTFT (ms) | Total (s) | Tok/s |";
  const divider = "|-----|-----------|-----------|-------|";
  const rows = runs.map(
    (r, i) =>
      `| ${i + 1} | ${r.ttftMs.toFixed(0)} | ${(r.totalMs / 1000).toFixed(2)} | ${r.tps.toFixed(1)} |`
  );
  const avg = runs.reduce((a, r) => a + r.tps, 0) / runs.length;
  const footer = `\n**Average: ${avg.toFixed(1)} tok/s** — Model: Gemma 4 E2B (q4f16, WebGPU)`;
  return [header, divider, ...rows, footer].join("\n");
}

export function BenchmarkPanel({
  modelStatus,
  tokensPerSecond,
  lastTtftMs,
  lastTotalMs,
  onRun,
}: BenchmarkPanelProps) {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const runIdRef = useRef(0);
  const isRunningRef = useRef(false);
  const prevStatusRef = useRef<ModelStatus>(modelStatus);

  // Detect generation completion to capture result
  useEffect(() => {
    const wasGenerating = prevStatusRef.current === "generating";
    const nowReady = modelStatus === "ready";

    if (wasGenerating && nowReady && isRunningRef.current) {
      isRunningRef.current = false;
      setIsRunning(false);

      if (tokensPerSecond !== null && lastTotalMs !== null) {
        const run: BenchmarkRun = {
          id: runIdRef.current,
          tps: tokensPerSecond,
          ttftMs: lastTtftMs ?? 0,
          totalMs: lastTotalMs,
          timestamp: new Date(),
        };
        setRuns((prev) => [run, ...prev].slice(0, MAX_RUNS));
      }
    }

    prevStatusRef.current = modelStatus;
  }, [modelStatus, tokensPerSecond, lastTtftMs, lastTotalMs]);

  function handleRun() {
    if (modelStatus !== "ready") return;
    runIdRef.current += 1;
    isRunningRef.current = true;
    setIsRunning(true);
    onRun(BENCHMARK_PROMPT);
  }

  async function handleCopy() {
    if (runs.length === 0) return;
    try {
      await navigator.clipboard.writeText(runsToMarkdown(runs));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  const canRun = modelStatus === "ready" && !isRunning;
  const latestRun = runs[0] ?? null;

  return (
    <Card className="border-blue-100 bg-blue-50/40">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-blue-900 flex items-center justify-between">
          <span>Benchmark Panel</span>
          {runs.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-blue-700 hover:text-blue-900 px-2"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy results"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 px-4 space-y-3">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-blue-300 hover:bg-blue-100"
            disabled={!canRun}
            onClick={handleRun}
          >
            {isRunning ? "Running…" : "Run benchmark (100 tokens)"}
          </Button>
          {modelStatus === "idle" || modelStatus === "loading" ? (
            <span className="text-xs text-muted-foreground">Load the model first</span>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground font-mono truncate">
          Prompt: &ldquo;{BENCHMARK_PROMPT}&rdquo;
        </p>

        {isRunning && (
          <div className="text-xs text-blue-700 animate-pulse">
            Generating… {tokensPerSecond !== null ? `${tokensPerSecond.toFixed(1)} tok/s live` : ""}
          </div>
        )}

        {latestRun && !isRunning && (
          <div className={`rounded-lg border px-3 py-2 ${tpsBg(latestRun.tps)}`}>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className={`text-xl font-bold ${tpsColor(latestRun.tps)}`}>
                  {latestRun.tps.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">tok/s</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-700">
                  {latestRun.ttftMs.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">TTFT ms</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-700">
                  {(latestRun.totalMs / 1000).toFixed(2)}s
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-700">
                  {runs.length}
                </p>
                <p className="text-xs text-muted-foreground">Runs</p>
              </div>
            </div>
          </div>
        )}

        {runs.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              History (last {runs.length})
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal py-0.5">Run</th>
                  <th className="text-right font-normal">TTFT</th>
                  <th className="text-right font-normal">Total</th>
                  <th className="text-right font-normal">Tok/s</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={r.id} className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                    <td className="py-0.5">#{runs.length - i}</td>
                    <td className="text-right">{r.ttftMs.toFixed(0)} ms</td>
                    <td className="text-right">{(r.totalMs / 1000).toFixed(2)}s</td>
                    <td className={`text-right font-mono ${tpsColor(r.tps)}`}>
                      {r.tps.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
