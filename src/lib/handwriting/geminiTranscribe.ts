const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
// gemini-2.0-flash: fast, multimodal, avoids thinkingConfig 400 errors from Gemma models
const MODEL = "gemini-2.0-flash";

interface GeminiPart { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } }
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

/**
 * Send a canvas JPEG to Gemini 2.0 Flash and get back only the transcribed text.
 * Uses the same Google AI Studio API key already configured for Cloud Boost.
 */
export async function transcribeHandwriting(
  dataUrl: string,
  apiKey: string,
): Promise<string> {
  const [header, b64] = dataUrl.split(",");
  const mimeType = (header ?? "").replace("data:", "").replace(";base64", "") || "image/jpeg";

  const body = {
    contents: [{
      parts: [
        {
          text:
            "Look at this handwritten image. Transcribe ONLY what is written — " +
            "output the exact expression or text with NO explanation and NO extra words. " +
            "Examples of correct output: '2 + 2 × 5', 'x² + 3x - 10 = 0', 'El sol es una estrella'. " +
            "Output nothing else.",
        },
        { inlineData: { mimeType, data: b64 ?? "" } },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 120,
      temperature: 0,
    },
  };

  const res = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as GeminiResponse;
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => p.thought !== true)
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemini returned empty transcription");
  return text;
}
