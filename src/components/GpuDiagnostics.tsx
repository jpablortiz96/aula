"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type ModelStatus } from "@/lib/constants";

interface AdapterInfo {
  vendor: string;
  architecture: string;
  description: string;
  maxBufferSize: number;
  maxStorageBufferBindingSize: number;
}

type DiagnosticState =
  | { phase: "loading" }
  | { phase: "ok"; info: AdapterInfo }
  | { phase: "error"; message: string };

interface BenchmarkResult {
  tps: number;
  ttftMs: number;
  totalMs: number;
}

interface GpuDiagnosticsProps {
  modelStatus: ModelStatus;
  onBenchmark: () => void;
  benchmarkResult: BenchmarkResult | null;
  benchmarkRunning: boolean;
}

function tier(vendor: string): "green" | "yellow" | "red" {
  const v = vendor.toLowerCase();
  if (v.includes("nvidia") || v.includes("apple")) return "green";
  if (v.includes("intel") || v.includes("amd")) return "yellow";
  return "red";
}

const TIER_STYLES = {
  green: {
    card: "border-green-200 bg-green-50",
    title: "text-green-800",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800",
    msg: "GPU dedicada detectada — rendimiento óptimo.",
    icon: "✅",
  },
  yellow: {
    card: "border-yellow-200 bg-yellow-50",
    title: "text-yellow-800",
    dot: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-800",
    msg: "GPU integrada detectada — rendimiento limitado. Revisa Configuración de gráficos de Windows.",
    icon: "⚠️",
  },
  red: {
    card: "border-red-200 bg-red-50",
    title: "text-red-800",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-800",
    msg: "WebGPU no disponible o sin aceleración por hardware.",
    icon: "❌",
  },
};

export function GpuDiagnostics({
  modelStatus,
  onBenchmark,
  benchmarkResult,
  benchmarkRunning,
}: GpuDiagnosticsProps) {
  const [state, setState] = useState<DiagnosticState>({ phase: "loading" });

  useEffect(() => {
    async function probe() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!nav.gpu) {
        setState({ phase: "error", message: "navigator.gpu not available — WebGPU unsupported." });
        return;
      }

      try {
        const adapter = await nav.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) {
          setState({ phase: "error", message: "No GPU adapter found." });
          return;
        }

        const info = await adapter.requestAdapterInfo();
        setState({
          phase: "ok",
          info: {
            vendor: info.vendor ?? "unknown",
            architecture: info.architecture ?? "unknown",
            description: info.description ?? "unknown",
            maxBufferSize: adapter.limits.maxBufferSize,
            maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
          },
        });
      } catch (e) {
        setState({ phase: "error", message: e instanceof Error ? e.message : String(e) });
      }
    }

    void probe();
  }, []);

  if (state.phase === "loading") {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="py-3 px-4 text-xs text-muted-foreground">
          Querying GPU adapter…
        </CardContent>
      </Card>
    );
  }

  if (state.phase === "error") {
    const s = TIER_STYLES.red;
    return (
      <Card className={`${s.card}`}>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className={`text-xs font-semibold uppercase tracking-wide ${s.title}`}>
            GPU Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-4 space-y-1">
          <p className="text-xs text-red-700">{state.message}</p>
          <p className="text-xs">{s.icon} {s.msg}</p>
        </CardContent>
      </Card>
    );
  }

  const { info } = state;
  const t = tier(info.vendor);
  const s = TIER_STYLES[t];
  const canBenchmark = modelStatus === "ready";

  return (
    <div className="space-y-2">
      <Card className={s.card}>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className={`text-xs font-semibold uppercase tracking-wide ${s.title} flex items-center gap-2`}>
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            GPU Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-4 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Vendor</span>
            <span className={`font-mono font-medium px-1 rounded ${s.badge}`}>{info.vendor || "—"}</span>

            <span className="text-muted-foreground">Architecture</span>
            <span className="font-mono">{info.architecture || "—"}</span>

            <span className="text-muted-foreground">Description</span>
            <span className="font-mono truncate" title={info.description}>{info.description || "—"}</span>

            <span className="text-muted-foreground">Max buffer</span>
            <span className="font-mono">{(info.maxBufferSize / 1024 / 1024).toFixed(0)} MB</span>

            <span className="text-muted-foreground">Max storage buffer</span>
            <span className="font-mono">{(info.maxStorageBufferBindingSize / 1024 / 1024).toFixed(0)} MB</span>
          </div>

          <p className="text-xs border-t pt-2 mt-1">
            {s.icon} {s.msg}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              disabled={!canBenchmark || benchmarkRunning}
              onClick={onBenchmark}
            >
              {benchmarkRunning ? "Running…" : "Run Benchmark"}
            </Button>
            {!canBenchmark && (
              <span className="text-xs text-muted-foreground">Load the model first</span>
            )}
          </div>
        </CardContent>
      </Card>

      {benchmarkResult && !benchmarkRunning && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              Benchmark Result
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-blue-700">{benchmarkResult.tps.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">tok/s</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-700">{(benchmarkResult.ttftMs / 1000).toFixed(2)}s</p>
                <p className="text-xs text-muted-foreground">TTFT</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-700">{(benchmarkResult.totalMs / 1000).toFixed(1)}s</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
