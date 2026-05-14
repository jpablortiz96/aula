import type { ChatEngine, ChatMessage, EngineCapabilities, EngineId, GenerateOptions } from "../types";

const API_KEY_STORAGE_KEY = "aula:google-ai-api-key";
const MODEL = "gemma-4-26b-a4b-it";
// Premium alternative: "gemma-4-31b-it"
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// --- Google AI response types (subset we actually use) ---

interface GeminiPart {
  text?: string;
  /** true when this part is internal reasoning (thinking mode) — must be ignored */
  thought?: boolean;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content: GeminiContent;
  finishReason?: string;
}

interface GeminiStreamChunk {
  candidates?: GeminiCandidate[];
  error?: { code: number; message: string; status: string };
}

// ---------------------------------------------------------

/**
 * Layer 2B — heuristic fallback to strip Gemma 4 thinking preamble.
 * Only used when the `thought` flag is absent from all parts (older API versions).
 * Conservative: stops filtering at the first line that looks like real prose.
 */
const THINKING_META_RE =
  /^[\s*-]*(?:Topic|Persona|Language|Format|Constraints?|Intro|Word\s*count|Emojis?|Markdown|LaTeX|Step\s+\d+|Response\s+strategy|Planning|Analysis|Approach|Goal)\s*:/i;

function stripThinkingPreamble(text: string): string {
  const lines = text.split("\n");
  let firstRealIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;                    // blank — could be in preamble
    if (THINKING_META_RE.test(line)) continue; // metadata line — skip
    firstRealIdx = i;
    break;
  }

  if (firstRealIdx <= 0) return text;       // no preamble detected, return as-is
  return lines.slice(firstRealIdx).join("\n").trimStart();
}

// ---------------------------------------------------------

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  const result: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === "system") continue;

    const parts: GeminiPart[] = [{ text: msg.content }];

    if (msg.images) {
      for (const dataUrl of msg.images) {
        const [header, data] = dataUrl.split(",");
        const mimeType = header.replace("data:", "").replace(";base64", "");
        parts.push({ inlineData: { mimeType, data: data ?? "" } });
      }
    }

    result.push({ role: msg.role === "user" ? "user" : "model", parts });
  }

  return result;
}

function getSystemInstruction(messages: ChatMessage[]): string | undefined {
  return messages.find((m) => m.role === "system")?.content;
}

export class CloudBoostEngine implements ChatEngine {
  readonly id: EngineId = "cloud-boost";
  readonly displayName = "Cloud Boost (Gemma 4 26B via AI Studio)";
  readonly capabilities: EngineCapabilities = {
    supportsMultimodal: true,
    supportsStreaming: true,
    requiresApiKey: true,
    runsLocally: false,
  };

  private apiKey: string | null = null;
  private abortController: AbortController | null = null;

  private loadKey(): string {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!stored) throw new Error("No API key found. Set one in Settings.");
    this.apiKey = stored;
    return stored;
  }

  async isReady(): Promise<boolean> {
    try {
      this.loadKey();
      return true;
    } catch {
      return false;
    }
  }

  /** For Cloud Boost, "loading" just validates the key with a quick ping. */
  async load(): Promise<void> {
    const key = this.loadKey();

    const res = await fetch(`${BASE_URL}/models/${MODEL}?key=${key}`);

    if (res.status === 401) throw new Error("API key inválida — verifica tu clave de Google AI Studio.");
    if (res.status === 404) return; // model in preview; treat as ready
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(body.error?.message ?? `HTTP ${res.status}`);
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string> {
    const key = this.apiKey ?? this.loadKey();

    const systemInstruction = getSystemInstruction(messages);
    const contents = toGeminiContents(messages);

    // Layer 1: ask the API to suppress thinking output.
    // thinkingBudget: 0 disables thinking tokens entirely (most reliable).
    // If the API returns 400 on thinkingConfig, try in order:
    //   a) thinkingConfig: { thinkingLevel: "low" }
    //   b) thinkingConfig: { includeThoughts: false }
    //   c) remove thinkingConfig — rely solely on Layer 2 (part.thought filter)
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    // alt=sse forces Server-Sent Events (true streaming chunks, not a JSON array)
    const url = `${BASE_URL}/models/${MODEL}:streamGenerateContent?alt=sse&key=${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (res.status === 400) {
      // thinkingConfig may not be supported — retry without it
      const errBody = (await res.json().catch(() => ({}))) as GeminiStreamChunk;
      const errMsg = errBody.error?.message ?? "";
      if (errMsg.toLowerCase().includes("thinking")) {
        return this.generateWithoutThinkingConfig(messages, opts, key, signal);
      }
      throw new Error(errMsg || `HTTP 400`);
    }
    if (res.status === 401) throw new Error("API key inválida — verifica tu clave de Google AI Studio.");
    if (res.status === 429) throw new Error("Rate limit alcanzado — espera un momento antes de reintentar.");
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as GeminiStreamChunk;
      throw new Error(errBody.error?.message ?? `HTTP ${res.status}`);
    }

    return this.readStream(res, opts);
  }

  /** Fallback: same request without thinkingConfig when the API rejects it (Layer 1c). */
  private async generateWithoutThinkingConfig(
    messages: ChatMessage[],
    opts: GenerateOptions,
    key: string,
    signal: AbortSignal,
  ): Promise<string> {
    const systemInstruction = getSystemInstruction(messages);
    const contents = toGeminiContents(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
        // thinkingConfig omitted — not supported by this model/version
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const url = `${BASE_URL}/models/${MODEL}:streamGenerateContent?alt=sse&key=${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as GeminiStreamChunk;
      throw new Error(errBody.error?.message ?? `HTTP ${res.status}`);
    }

    return this.readStream(res, opts);
  }

  /** Parse an SSE stream from the Gemini API, filtering out thought parts. */
  private async readStream(res: Response, opts: GenerateOptions): Promise<string> {
    if (!res.body) throw new Error("Response has no body — streaming not supported.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = "";
    let sawThoughtFlag = false; // tracks whether ANY part had thought: true

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on newlines; keep last (possibly incomplete) line in buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          if (!jsonStr || jsonStr === "[DONE]") continue;

          let parsed: GeminiStreamChunk;
          try {
            parsed = JSON.parse(jsonStr) as GeminiStreamChunk;
          } catch {
            continue; // incomplete JSON at chunk boundary
          }

          if (parsed.error) throw new Error(parsed.error.message);

          // Layer 2: iterate ALL parts; skip those marked as internal reasoning
          const parts = parsed.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.thought === true) {
              sawThoughtFlag = true;
              continue; // skip thinking tokens
            }
            const text = part.text ?? "";
            if (text) {
              accumulated += text;
              opts.onToken?.(text);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return accumulated; // graceful stop — return partial text
      }
      throw err;
    } finally {
      this.abortController = null;
    }

    // Layer 2B: if the thought flag was never seen, apply conservative heuristic
    // to strip any thinking preamble that leaked as plain text
    if (!sawThoughtFlag && accumulated) {
      accumulated = stripThinkingPreamble(accumulated);
    }

    return accumulated;
  }
}
