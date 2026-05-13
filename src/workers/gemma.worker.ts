/// <reference lib="webworker" />
export {};

import {
  pipeline,
  TextStreamer,
  env,
  type TextGenerationPipeline,
  type ProgressInfo,
} from "@huggingface/transformers";

import {
  MODEL_ID,
  MODEL_DTYPE,
  MODEL_DEVICE,
  type WorkerOutMessage,
  type WorkerInMessage,
  type ChatMessage,
} from "@/lib/constants";

// Running inside the worker — no WASM proxy needed
(env.backends.onnx as Record<string, unknown>).wasm = {
  ...(env.backends.onnx as Record<string, unknown>).wasm as object,
  proxy: false,
};
env.allowLocalModels = false;
env.useBrowserCache = true;

let generator: TextGenerationPipeline | null = null;

function post(msg: WorkerOutMessage): void {
  self.postMessage(msg);
}

function onProgress(info: ProgressInfo): void {
  if (info.status === "progress") {
    post({
      type: "progress",
      progress: info.progress ?? 0,
      file: (info as { file?: string }).file ?? "",
      loaded: (info as { loaded?: number }).loaded ?? 0,
      total: (info as { total?: number }).total ?? 0,
    });
  }
}

async function loadModel(): Promise<void> {
  post({ type: "status", status: "loading", message: "Initializing pipeline…" });

  try {
    generator = (await pipeline("text-generation", MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: MODEL_DEVICE,
      progress_callback: onProgress,
    })) as TextGenerationPipeline;

    post({ type: "status", status: "ready", message: "Model ready" });
  } catch (err) {
    post({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function generate(
  prompt: string,
  conversationHistory: ChatMessage[]
): Promise<void> {
  if (!generator) {
    post({ type: "error", error: "Model not loaded. Call load first." });
    return;
  }

  post({ type: "status", status: "generating" });

  const systemPrompt =
    "Eres AULA, un tutor educativo para estudiantes latinoamericanos. " +
    "Responde en español neutro de LATAM, claro y didáctico. " +
    "Reglas de formato:\n" +
    "- Usa markdown para estructura: **negritas** para conceptos clave, " +
    "listas con guiones, encabezados ## solo si la respuesta es larga.\n" +
    "- Para matemáticas usa LaTeX entre $...$ (inline) o $$...$$ (bloque).\n" +
    "- Máximo 1-2 emojis por respuesta, solo si aportan claridad.\n" +
    "- Sé conciso: explica primero la idea, luego ejemplo, luego conclusión.\n" +
    "- Si el estudiante muestra una operación, resuélvela paso a paso.";

  const messages: ChatMessage[] = [
    {
      role: "user" as const,
      content: `[SYSTEM] ${systemPrompt} [/SYSTEM]`,
    },
    ...conversationHistory,
    { role: "user" as const, content: prompt },
  ];

  let tokenCount = 0;
  const startTime = performance.now();

  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      tokenCount++;
      post({ type: "token", token: text });
    },
  });

  try {
    await generator(messages, {
      max_new_tokens: 512,
      do_sample: true,
      temperature: 0.7,
      top_p: 0.95,
      repetition_penalty: 1.1,
      streamer,
    });

    const elapsed = (performance.now() - startTime) / 1000;
    post({ type: "done", tokensPerSecond: tokenCount / elapsed });
    post({ type: "status", status: "ready" });
  } catch (err) {
    post({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    post({ type: "status", status: "ready" });
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "load":
      void loadModel();
      break;
    case "generate":
      void generate(msg.prompt, msg.conversationHistory);
      break;
    default: {
      const _exhaustive: never = msg;
      post({
        type: "error",
        error: `Unknown message type: ${(_exhaustive as WorkerInMessage).type}`,
      });
    }
  }
});
