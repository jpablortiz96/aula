"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ModelStatus, MODEL_ID, MODEL_DISPLAY_NAME, MODEL_SIZE_GB } from "@/lib/constants";

interface ModelLoaderProps {
  status: ModelStatus;
  overallProgress: number;
  onLoad: () => void;
}

const STATUS_LABEL: Record<ModelStatus, string> = {
  idle: "Not loaded",
  loading: "Downloading & initializing…",
  ready: "Ready",
  generating: "Generating…",
  error: "Error",
};

const TOOLTIP =
  `${MODEL_DISPLAY_NAME} is Google's smallest multimodal model — runs on edge devices ` +
  "from an $80 Raspberry Pi 5 to high-end laptops. Quantized to q4f16 for WebGPU.";

export function ModelLoader({ status, overallProgress, onLoad }: ModelLoaderProps) {
  const isLoading = status === "loading";
  const isReady = status === "ready" || status === "generating";

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Model Status</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isReady
                ? "bg-green-100 text-green-700"
                : isLoading
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground font-mono truncate" title={MODEL_ID}>
          {MODEL_ID}
        </div>

        {isLoading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Downloading weights (≈{MODEL_SIZE_GB} GB)…</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}

        {!isReady && (
          <div className="space-y-1.5">
            <Button
              onClick={onLoad}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="sm"
              title={TOOLTIP}
            >
              {isLoading
                ? "Loading…"
                : `Load ${MODEL_DISPLAY_NAME} (≈${MODEL_SIZE_GB} GB) — runs on a Raspberry Pi`}
            </Button>
            <p className="text-xs text-muted-foreground leading-snug">{TOOLTIP}</p>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          100% LOCAL — Zero server
        </div>
      </CardContent>
    </Card>
  );
}
