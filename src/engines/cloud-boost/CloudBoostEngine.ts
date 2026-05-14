import type { ChatEngine, ChatMessage, EngineCapabilities, EngineId, GenerateOptions } from "../types";

const API_KEY_STORAGE_KEY = "aula:google-ai-api-key";
const MODEL = "gemma-4-26b-a4b-it";
// Premium alternative: "gemma-4-31b-it"
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// --- Google AI response types (subset we actually use) ---

interface GeminiPart {
  text?: string;
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

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    // alt=sse MUST come before key so the param is always present regardless of key format
    const url = `${BASE_URL}/models/${MODEL}:streamGenerateContent?alt=sse&key=${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (res.status === 401) throw new Error("API key inválida — verifica tu clave de Google AI Studio.");
    if (res.status === 429) throw new Error("Rate limit alcanzado — espera un momento antes de reintentar.");
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as GeminiStreamChunk;
      throw new Error(errBody.error?.message ?? `HTTP ${res.status}`);
    }

    if (!res.body) throw new Error("Response has no body — streaming not supported.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = ""; // holds incomplete SSE lines across chunk boundaries

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on newlines but keep the last (potentially incomplete) segment in buffer
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
            // Partial JSON across chunk boundary — will be in buffer next iteration
            continue;
          }

          if (parsed.error) throw new Error(parsed.error.message);

          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) {
            accumulated += text;
            opts.onToken?.(text);
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

    return accumulated;
  }
}
