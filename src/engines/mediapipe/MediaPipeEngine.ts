import type { LlmInference } from "@mediapipe/tasks-genai";
import type { ChatEngine, ChatMessage, EngineCapabilities, EngineId, GenerateOptions } from "../types";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm";

const MODEL_URLS = [
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task",
  "https://huggingface.co/litert-community/gemma-3-270m-it/resolve/main/gemma3-270m-it-q4_0-web.task",
];

const MODEL_CACHE_NAME = "aula-models-v1";

const SYSTEM_PROMPT =
  "Eres AULA, un tutor educativo para estudiantes latinoamericanos de secundaria.\n\n" +
  "FORMATO de respuesta:\n" +
  "1. Una frase de introducción cálida (1 línea, máximo 1 emoji).\n" +
  "2. Explicación principal en 2-4 pasos numerados.\n" +
  "3. Para matemáticas: LaTeX con $...$ (inline) o $$...$$ (display).\n" +
  "4. Cierre con la respuesta final en **negrita**.\n\n" +
  "REGLAS: Español neutro latinoamericano. Máximo 200 palabras. ≤2 emojis.";

function formatPrompt(messages: ChatMessage[]): string {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs  = messages.filter((m) => m.role !== "system");
  const firstUserIdx = chatMsgs.findIndex((m) => m.role === "user");

  let prompt = "";
  chatMsgs.forEach((m, i) => {
    if (m.role === "user") {
      const content =
        i === firstUserIdx && systemMsg
          ? `${systemMsg.content}\n\n${m.content}`
          : m.content;
      prompt += `<start_of_turn>user\n${content}<end_of_turn>\n`;
    } else if (m.role === "assistant") {
      prompt += `<start_of_turn>model\n${m.content}<end_of_turn>\n`;
    }
  });

  prompt += "<start_of_turn>model\n";
  return prompt;
}

function stripControlTokens(text: string): string {
  return text
    .replace(/<end_of_turn>/g, "")
    .replace(/<start_of_turn>(model|user)\n?/g, "")
    .trim();
}

/**
 * Download a model file, streaming progress events.
 * On subsequent calls, serves bytes from Cache Storage (no network request).
 */
async function fetchModelWithProgress(
  url: string,
  onProgress: (fraction: number) => void,
): Promise<Uint8Array> {
  // Check Cache Storage for previously downloaded model
  if ("caches" in globalThis) {
    try {
      const cache  = await caches.open(MODEL_CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        onProgress(0.1);
        const buf = await cached.arrayBuffer();
        onProgress(1);
        return new Uint8Array(buf);
      }
    } catch {
      // Cache API unavailable — fall through to network download
    }
  }

  // Fresh download with streaming progress
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Model download failed: HTTP ${res.status}`);

  const total    = Number(res.headers.get("content-length") ?? 0);
  const chunks: Uint8Array[] = [];
  let received = 0;

  if (res.body) {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total > 0) onProgress(received / total);
    }
  } else {
    const arr = new Uint8Array(await res.arrayBuffer());
    onProgress(1);
    return arr;
  }

  // Assemble contiguous buffer
  const assembled = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { assembled.set(chunk, offset); offset += chunk.byteLength; }

  // Persist to Cache Storage for next load (fire-and-forget)
  if ("caches" in globalThis) {
    caches
      .open(MODEL_CACHE_NAME)
      .then((cache) =>
        cache.put(
          url,
          new Response(assembled.buffer.slice(0), {
            status:  200,
            headers: { "content-type": "application/octet-stream" },
          }),
        ),
      )
      .catch(() => {}); // Ignore quota errors gracefully
  }

  return assembled;
}

export class MediaPipeEngine implements ChatEngine {
  readonly id: EngineId = "mediapipe";
  readonly displayName = "MediaPipe (Local — Gemma 4 E2B)";
  readonly capabilities: EngineCapabilities = {
    supportsMultimodal: false,
    supportsStreaming: true,
    requiresApiKey: false,
    runsLocally: true,
  };

  private llm: LlmInference | null = null;

  private aborted = false;
  private abortResolve: ((text: string) => void) | null = null;
  private currentAccumulated = "";

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

    const { FilesetResolver, LlmInference } = await import("@mediapipe/tasks-genai");
    onProgress?.(5); // WASM loading

    const fileset = await FilesetResolver.forGenAiTasks(WASM_BASE);
    onProgress?.(15); // WASM ready

    let lastError: unknown;
    for (const modelUrl of MODEL_URLS) {
      try {
        const device = await LlmInference.createWebGpuDevice();
        onProgress?.(20); // GPU device ready

        // Download model bytes (real per-byte progress: 20% → 90%)
        const modelBytes = await fetchModelWithProgress(modelUrl, (fraction) => {
          onProgress?.(20 + Math.round(fraction * 70));
        });
        onProgress?.(90); // bytes assembled, initializing model

        this.llm = await LlmInference.createFromOptions(fileset, {
          baseOptions: {
            modelAssetBuffer: modelBytes,
            delegate: "GPU",
            gpuOptions: { device },
          } as Parameters<typeof LlmInference.createFromOptions>[1]["baseOptions"],
          maxTokens: 2048,
          topK: 40,
          temperature: 0.7,
          randomSeed: 42,
        });

        onProgress?.(100);
        return;
      } catch (err) {
        lastError = err;
        this.llm = null;
        onProgress?.(15); // reset for next URL attempt
      }
    }

    throw new Error(
      `MediaPipe failed to load any model: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }

  abort(): void {
    this.aborted = true;
    this.abortResolve?.(this.currentAccumulated);
    this.abortResolve = null;
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
    if (!this.llm) throw new Error("Engine not loaded — call load() first.");

    this.aborted = false;
    this.currentAccumulated = "";

    const prompt = formatPrompt(messages);

    const abortPromise = new Promise<string>((resolve) => {
      this.abortResolve = resolve;
    });

    const generatePromise = this.llm
      .generateResponse(prompt, (partial: string, _done: boolean) => {
        if (this.aborted) return;
        this.currentAccumulated += partial;
        opts.onToken?.(partial);
      })
      .then(() => {
        this.abortResolve = null;
        return stripControlTokens(this.currentAccumulated);
      });

    return Promise.race([generatePromise, abortPromise]);
  }

  async unload(): Promise<void> {
    this.llm?.close();
    this.llm = null;
  }
}
