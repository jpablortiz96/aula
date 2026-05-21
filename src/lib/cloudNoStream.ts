/**
 * Non-streaming call to Gemma 4 via Gemini API (:generateContent).
 * Used for structured outputs (JSON, SVG) where response size is small
 * and streaming is not needed — and where :streamGenerateContent is not
 * supported by the model.
 */

const MODEL = "gemma-4-26b-a4b-it";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface CloudNoStreamOptions {
  apiKey: string;
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: { code: number; message: string; status: string };
}

export async function cloudGenerate(opts: CloudNoStreamOptions): Promise<string> {
  const { apiKey, systemInstruction, prompt, temperature = 0.85, maxOutputTokens = 1024 } = opts;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud API error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as GeminiResponse;

  if (data.error) {
    throw new Error(`Cloud API error: ${data.error.message}`);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");

  if (!text) {
    throw new Error("Empty response from Cloud");
  }

  return text;
}
