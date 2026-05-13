"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdapterInfo {
  vendor: string;
  architecture: string;
  description: string;
  maxBufferSizeGB: number;
  maxStorageBufferBindingSizeMB: number;
  subgroupMaxSize: number | null;
}

type DiagnosticState =
  | { phase: "loading" }
  | { phase: "ok"; info: AdapterInfo }
  | { phase: "error"; message: string };

function tier(vendor: string): "green" | "yellow" | "red" {
  const v = vendor.toLowerCase();
  if (v.includes("nvidia") || v.includes("apple") || v.includes("amd")) return "green";
  if (v.includes("intel")) return "yellow";
  return "red";
}

const TIER_STYLES = {
  green: {
    card: "border-green-200 bg-green-50",
    title: "text-green-800",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800",
    msg: "GPU dedicada en uso — rendimiento óptimo.",
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

export function GpuDiagnostics() {
  const [state, setState] = useState<DiagnosticState>({ phase: "loading" });

  useEffect(() => {
    async function probe() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (!nav.gpu) {
        setState({ phase: "error", message: "navigator.gpu not available — WebGPU unsupported in this browser." });
        return;
      }

      try {
        const adapter = await nav.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) {
          setState({ phase: "error", message: "No GPU adapter found — hardware acceleration may be disabled." });
          return;
        }

        // Chrome 121+: adapter.info is a sync property.
        // Older browsers: adapter.requestAdapterInfo() is an async method.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let raw: Record<string, unknown> = {};
        if ("info" in adapter && adapter.info) {
          raw = adapter.info as Record<string, unknown>;
        } else if (typeof adapter.requestAdapterInfo === "function") {
          try {
            raw = await adapter.requestAdapterInfo() as Record<string, unknown>;
          } catch {
            // ignore — fall through with empty raw
          }
        }

        const limits = adapter.limits as Record<string, number | undefined>;
        setState({
          phase: "ok",
          info: {
            vendor: String(raw.vendor ?? "unknown"),
            architecture: String(raw.architecture ?? "unknown"),
            description: String(raw.description ?? "unknown"),
            maxBufferSizeGB: ((limits.maxBufferSize ?? 0) / 1024 / 1024 / 1024),
            maxStorageBufferBindingSizeMB: ((limits.maxStorageBufferBindingSize ?? 0) / 1024 / 1024),
            subgroupMaxSize: limits.subgroupMaxSize ?? null,
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
      <Card className={s.card}>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className={`text-xs font-semibold uppercase tracking-wide ${s.title} flex items-center gap-2`}>
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
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

  return (
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
          <span className={`font-mono font-medium px-1 rounded ${s.badge}`}>{info.vendor}</span>

          <span className="text-muted-foreground">Architecture</span>
          <span className="font-mono">{info.architecture}</span>

          <span className="text-muted-foreground">Description</span>
          <span className="font-mono truncate" title={info.description}>{info.description}</span>

          <span className="text-muted-foreground">Max buffer size</span>
          <span className="font-mono">
            {info.maxBufferSizeGB >= 1
              ? `${info.maxBufferSizeGB.toFixed(1)} GB`
              : `${(info.maxBufferSizeGB * 1024).toFixed(0)} MB`}
          </span>

          <span className="text-muted-foreground">Max storage binding</span>
          <span className="font-mono">{info.maxStorageBufferBindingSizeMB.toFixed(0)} MB</span>

          {info.subgroupMaxSize !== null && (
            <>
              <span className="text-muted-foreground">Subgroup max size</span>
              <span className="font-mono">{info.subgroupMaxSize}</span>
            </>
          )}
        </div>

        <p className="text-xs border-t pt-2 mt-1">
          {s.icon} {s.msg}
        </p>
      </CardContent>
    </Card>
  );
}
