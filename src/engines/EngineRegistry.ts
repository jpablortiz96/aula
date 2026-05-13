import type { EngineId } from "./types";

const SESSION_KEY = "aula:resolved-engine";
const API_KEY_STORAGE_KEY = "aula:google-ai-api-key";

function hasApiKey(): boolean {
  try {
    return !!localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return false;
  }
}

async function hasWebGpu(): Promise<boolean> {
  if (!navigator.gpu) return false;
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  return adapter !== null;
}

/**
 * Auto-detect the best available engine based on hardware + stored preferences.
 *
 * Priority:
 *   1. User explicitly prefers cloud AND has API key → cloud-boost
 *   2. WebGPU available → mediapipe (local-first)
 *   3. API key exists → cloud-boost (fallback)
 *   4. ONNX Web worker → legacy-onnx (last resort)
 */
export async function detectBestEngine(preferCloud: boolean): Promise<EngineId> {
  try {
    const cached = sessionStorage.getItem(SESSION_KEY) as EngineId | null;
    if (cached) return cached;
  } catch {
    // sessionStorage unavailable (private mode, etc.)
  }

  let resolved: EngineId;

  if (preferCloud && hasApiKey()) {
    resolved = "cloud-boost";
  } else if (await hasWebGpu()) {
    resolved = "mediapipe";
  } else if (hasApiKey()) {
    resolved = "cloud-boost";
  } else {
    resolved = "legacy-onnx";
  }

  try {
    sessionStorage.setItem(SESSION_KEY, resolved);
  } catch {
    // ignore
  }

  return resolved;
}

/** Clear cached engine decision (call after settings change). */
export function clearEngineCache(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export const ENGINE_DISPLAY: Record<EngineId, string> = {
  "mediapipe": "MediaPipe (local)",
  "cloud-boost": "Cloud Boost (Gemma 4 31B)",
  "legacy-onnx": "ONNX Web (legacy)",
};
