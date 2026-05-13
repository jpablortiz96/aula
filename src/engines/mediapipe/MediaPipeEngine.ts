import type { LlmInference } from "@mediapipe/tasks-genai";
import type { ChatEngine, ChatMessage, EngineCapabilities, EngineId, GenerateOptions } from "../types";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm";

// Primary: Gemma 4 E2B — litert-lm repo (web-optimized, ~2 GB)
// Fallback: Gemma 3 270M — much smaller (249 MB), loads fast, good for demo
const MODEL_URLS = [
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task",
  "https://huggingface.co/litert-community/gemma-3-270m-it/resolve/main/gemma3-270m-it-q4_0-web.task",
];

const SYSTEM_PROMPT =
  "Eres AULA, un tutor educativo para estudiantes latinoamericanos de secundaria.\n\n" +
  "FORMATO de respuesta:\n" +
  "1. Una frase de introducción cálida (1 línea, máximo 1 emoji).\n" +
  "2. Explicación principal en 2-4 pasos numerados.\n" +
  "3. Para matemáticas: LaTeX con $...$ (inline) o $$...$$ (display).\n" +
  "4. Cierre con la respuesta final en **negrita**.\n\n" +
  "REGLAS: Español neutro latinoamericano. Máximo 200 palabras. ≤2 emojis.";

/** Format messages as a Gemma instruction-tuned prompt string. */
function formatPrompt(messages: ChatMessage[]): string {
  const lines: string[] = [`<start_of_turn>user\n[SYSTEM] ${SYSTEM_PROMPT} [/SYSTEM]<end_of_turn>`];

  for (const msg of messages) {
    if (msg.role === "system") continue;
    const tag = msg.role === "user" ? "user" : "model";
    lines.push(`<start_of_turn>${tag}\n${msg.content}<end_of_turn>`);
  }

  lines.push("<start_of_turn>model\n");
  return lines.join("\n");
}

export class MediaPipeEngine implements ChatEngine {
  readonly id: EngineId = "mediapipe";
  readonly displayName = "MediaPipe (Local — Gemma 4 E2B)";
  readonly capabilities: EngineCapabilities = {
    supportsMultimodal: true,
    supportsStreaming: true,
    requiresApiKey: false,
    runsLocally: true,
  };

  private llm: LlmInference | null = null;

  async isReady(): Promise<boolean> {
    if (this.llm) return true;
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  }

  async load(onProgress?: (p: number) => void): Promise<void> {
    if (this.llm) return;

    if (!navigator.gpu) {
      throw new Error("WebGPU not available — MediaPipe requires GPU acceleration.");
    }

    // Dynamic import keeps MediaPipe out of the SSR bundle
    const { FilesetResolver, LlmInference } = await import("@mediapipe/tasks-genai");

    onProgress?.(5);

    const fileset = await FilesetResolver.forGenAiTasks(WASM_BASE);
    onProgress?.(15);

    // Try each model URL in order; fall through on failure
    let lastError: unknown;
    for (const modelAssetPath of MODEL_URLS) {
      try {
        const device = await LlmInference.createWebGpuDevice();
        onProgress?.(25);

        this.llm = await LlmInference.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath,
            delegate: "GPU",
            gpuOptions: { device },
          },
          maxTokens: 1024,
          topK: 40,
          temperature: 0.7,
          randomSeed: 42,
        });

        onProgress?.(100);
        return;
      } catch (err) {
        lastError = err;
        this.llm = null;
        onProgress?.(20); // reset progress for next attempt
      }
    }

    throw new Error(
      `MediaPipe failed to load any model: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
    if (!this.llm) throw new Error("Engine not loaded — call load() first.");

    const prompt = formatPrompt(messages);
    let accumulated = "";

    await this.llm.generateResponse(prompt, (partial: string, _done: boolean) => {
      accumulated += partial;
      opts.onToken?.(partial);
    });

    return accumulated;
  }

  async unload(): Promise<void> {
    this.llm?.close();
    this.llm = null;
  }
}
