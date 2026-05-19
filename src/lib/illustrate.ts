import { sanitizeSvg, isValidSvg } from "@/lib/svgSanitize";
import { generateText } from "@/engines/engineSingleton";

export async function generateIllustration(
  conceptText: string,
  lang: "es" | "en",
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

  const raw = await generateText(instruction, { maxTokens: 1200, temperature: 0.4 });
  if (!raw) throw new Error("Empty response from model");

  const sanitized = sanitizeSvg(raw);
  if (!isValidSvg(sanitized)) throw new Error("Model did not return valid SVG");

  return sanitized;
}
