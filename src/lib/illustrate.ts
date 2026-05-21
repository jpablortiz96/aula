import { sanitizeSvg, isValidSvg } from "@/lib/svgSanitize";

const CLOUD_ONLY_ERROR_ES =
  "Las ilustraciones requieren Cloud Boost (API key de Google AI Studio). Agrégala en Configuración.";
const CLOUD_ONLY_ERROR_EN =
  "Illustrations require Cloud Boost (Google AI Studio API key). Add it in Settings.";

function buildSvgPrompt(conceptText: string, lang: "es" | "en"): string {
  const snippet = conceptText.slice(0, 600);
  return lang === "es"
    ? `Genera un diagrama SVG educativo claro que ilustre el siguiente concepto:

"${snippet}"

REGLAS ESTRICTAS — sigue cada punto o el resultado será inválido:
1. Responde ÚNICAMENTE con código SVG válido, comenzando exactamente con <svg y terminando con </svg>.
2. Atributo obligatorio: viewBox="0 0 400 300". No uses width/height absolutos.
3. Usa solo formas básicas: rect, circle, ellipse, line, polyline, polygon, path, text.
4. Incluye etiquetas <text> legibles que expliquen los elementos visuales.
5. Usa al menos 3 formas o grupos de elementos visuales distintos.
6. Paleta máxima de 5 colores sólidos. Sin degradados, filtros, patrones ni animaciones.
7. Sin imágenes externas, sin <script>, sin event handlers, sin <use> con hrefs externos.
8. Sin markdown, sin explicaciones — SOLO el SVG.`
    : `Generate a clear educational SVG diagram illustrating this concept:

"${snippet}"

STRICT RULES — follow every point or the result will be invalid:
1. Reply ONLY with valid SVG code, starting exactly with <svg and ending with </svg>.
2. Required attribute: viewBox="0 0 400 300". No absolute width/height.
3. Use only basic shapes: rect, circle, ellipse, line, polyline, polygon, path, text.
4. Include readable <text> labels explaining the visual elements.
5. Use at least 3 distinct shapes or visual element groups.
6. Maximum 5 solid colors. No gradients, filters, patterns, or animations.
7. No external images, no <script>, no event handlers, no <use> with external hrefs.
8. No markdown, no explanations — ONLY the SVG.`;
}

function hasMinimumVisualContent(svg: string): boolean {
  const shapeMatches = svg.match(/<(rect|circle|ellipse|line|polyline|polygon|path|text)\b/g) ?? [];
  return shapeMatches.length >= 3 && svg.includes('viewBox');
}

export async function generateIllustration(
  conceptText: string,
  lang: "es" | "en",
): Promise<string> {
  // Illustrations always use Cloud Boost — local Gemma 4 E2B is too small for reliable SVG
  const apiKey =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("aula:google-ai-api-key")
      : null;

  if (!apiKey) {
    throw new Error(lang === "es" ? CLOUD_ONLY_ERROR_ES : CLOUD_ONLY_ERROR_EN);
  }

  const { CloudBoostEngine } = await import("@/engines/cloud-boost/CloudBoostEngine");
  const cloud = new CloudBoostEngine();

  const instruction = buildSvgPrompt(conceptText, lang);
  const raw = await cloud.generate(
    [{ role: "user", content: instruction }],
    { maxTokens: 1500, temperature: 0.2 },
  );

  if (!raw) throw new Error(lang === "es" ? "Sin respuesta del modelo." : "Empty response from model.");

  const sanitized = sanitizeSvg(raw);

  if (!isValidSvg(sanitized)) {
    throw new Error(
      lang === "es"
        ? "No pude ilustrar este concepto bien. Intenta con otro mensaje."
        : "Could not illustrate this concept well. Try a different message.",
    );
  }

  if (!hasMinimumVisualContent(sanitized)) {
    throw new Error(
      lang === "es"
        ? "La ilustración generada es demasiado simple. Intenta con otro concepto."
        : "The generated illustration is too simple. Try a different concept.",
    );
  }

  return sanitized;
}
