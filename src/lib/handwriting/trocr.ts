import {
  pipeline,
  env,
  type ImageToTextPipeline,
  type ProgressInfo,
} from "@huggingface/transformers";

// ─── Config ───────────────────────────────────────────────────────────────────
// Runs in the main thread via WASM — model is downloaded once and cached offline.

env.allowLocalModels = false;
env.useBrowserCache  = true;

const MODEL_ID = "Xenova/trocr-small-handwritten";

// ─── Singleton ────────────────────────────────────────────────────────────────

let _pipe:    ImageToTextPipeline | null  = null;
let _loading: Promise<ImageToTextPipeline> | null = null;

export async function getTrOCR(
  onProgress?: (pct: number) => void,
): Promise<ImageToTextPipeline> {
  if (_pipe) return _pipe;

  if (!_loading) {
    _loading = (pipeline("image-to-text", MODEL_ID, {
      progress_callback: (info: ProgressInfo) => {
        if (info.status === "progress" && onProgress) {
          onProgress(Math.round(info.progress ?? 0));
        }
      },
    }) as Promise<ImageToTextPipeline>)
      .then((p) => { _pipe = p; _loading = null; return p; })
      .catch((e: unknown) => { _loading = null; throw e; });
  }

  return _loading;
}

/**
 * Recognize handwritten text in a canvas dataURL using TrOCR.
 * Downloads the model (~85 MB) on first use; subsequent calls are instant and offline.
 */
export async function recognizeWithTrOCR(
  dataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const pipe = await getTrOCR(onProgress);
  const out  = (await pipe(dataUrl)) as Array<{ generated_text?: string }>;
  return out[0]?.generated_text?.trim() ?? "";
}
