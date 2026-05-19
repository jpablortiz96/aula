import type { ChatEngine, ChatMessage } from "./types";

let _active: ChatEngine | null = null;

export function setActiveEngine(engine: ChatEngine | null): void {
  _active = engine;
}

export function getActiveEngine(): ChatEngine | null {
  return _active;
}

/**
 * Generate text using the best available engine.
 * Priority: loaded active engine (MediaPipe or Cloud Boost) → Cloud Boost on demand.
 * Throws if neither is available.
 */
export async function generateText(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  if (_active) {
    const msg: ChatMessage = { role: "user", content: prompt };
    return _active.generate([msg], {
      maxTokens:   opts.maxTokens   ?? 512,
      temperature: opts.temperature ?? 0.7,
    });
  }

  // Fallback: instantiate Cloud Boost on demand (reads API key from localStorage)
  const { CloudBoostEngine } = await import("./cloud-boost/CloudBoostEngine");
  const cloud = new CloudBoostEngine();
  if (await cloud.isReady()) {
    const msg: ChatMessage = { role: "user", content: prompt };
    return cloud.generate([msg], {
      maxTokens:   opts.maxTokens   ?? 512,
      temperature: opts.temperature ?? 0.4,
    });
  }

  throw new Error(
    "No AI engine available — load the model from Chat or add an API key in Settings.",
  );
}
