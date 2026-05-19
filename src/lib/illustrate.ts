import { sanitizeSvg, isValidSvg } from "@/lib/svgSanitize";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL    = "gemini-2.0-flash";

interface GeminiPart     { text?: string; thought?: boolean }
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

/**
 * Ask Gemini to produce an educational SVG for the given concept text.
 * Returns sanitized SVG string, or throws on error.
 */
export async function generateIllustration(
  conceptText: string,
  lang: "es" | "en",
  apiKey: string,
): Promise<string> {
  const instruction =
    lang === "es"
      ? `Genera un diagrama SVG educativo simple que ilustre el siguiente concepto:

"${conceptText.slice(0, 600)}"

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con código SVG válido, comenzando con <svg...> y terminando con </svg>.
- Ancho máximo: viewBox="0 0 400 300", sin atributos width/height absolutos.
- Usa formas simples (rect, circle, line, text, path). Sin imágenes externas.
- Texto en español si el concepto está en español.
- NO incluyas <script>, event handlers, ni nada externo.
- Sin markdown, sin explicaciones — SOLO el SVG.`
      : `Generate a simple educational SVG diagram illustrating this concept:

"${conceptText.slice(0, 600)}"

STRICT RULES:
- Reply ONLY with valid SVG code, starting with <svg...> and ending with </svg>.
- Max size: viewBox="0 0 400 300", no absolute width/height attributes.
- Use simple shapes (rect, circle, line, text, path). No external images.
- NO <script> tags, event handlers, or external references.
- No markdown, no explanations — ONLY the SVG.`;

  const body = {
    contents: [{ parts: [{ text: instruction }] }],
    generationConfig: {
      maxOutputTokens: 1200,
      temperature: 0.4,
    },
  };

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as GeminiResponse;
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const raw = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => p.thought !== true)
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!raw) throw new Error("Empty response from model");

  const sanitized = sanitizeSvg(raw);
  if (!isValidSvg(sanitized)) throw new Error("Model did not return valid SVG");

  return sanitized;
}
