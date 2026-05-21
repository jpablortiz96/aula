import { sanitizeSvg, isValidSvg } from "@/lib/svgSanitize";
import { cloudGenerate } from "@/lib/cloudNoStream";

const CLOUD_ONLY_ERROR_ES =
  "Las ilustraciones requieren Cloud Boost (API key de Google AI Studio). Agrégala en Configuración.";
const CLOUD_ONLY_ERROR_EN =
  "Illustrations require Cloud Boost (Google AI Studio API key). Add it in Settings.";

const SYSTEM_SVG_ES =
  `Generas SVG educativo simple y claro.
Reglas estrictas:
- viewBox="0 0 400 300"
- Solo elementos básicos: rect, circle, ellipse, line, path, text
- Etiquetas <text> con font-size="14"
- Máximo 5 colores sólidos
- SIN gradientes, filtros ni animaciones
- Responde SOLO el código SVG, empezando con <svg y terminando con </svg>, sin texto antes ni después.`;

const SYSTEM_SVG_EN =
  `You generate simple, clear educational SVG diagrams.
Strict rules:
- viewBox="0 0 400 300"
- Only basic elements: rect, circle, ellipse, line, path, text
- <text> labels with font-size="14"
- Maximum 5 solid colors
- NO gradients, filters, or animations
- Reply ONLY with SVG code, starting with <svg and ending with </svg>, no text before or after.`;

function hasMinimumVisualContent(svg: string): boolean {
  const shapeMatches = svg.match(/<(rect|circle|ellipse|line|polyline|polygon|path|text)\b/g) ?? [];
  return shapeMatches.length >= 3 && svg.includes("viewBox");
}

export async function generateIllustration(
  conceptText: string,
  lang: "es" | "en",
): Promise<string> {
  const apiKey =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("aula:google-ai-api-key")
      : null;

  if (!apiKey) {
    throw new Error(lang === "es" ? CLOUD_ONLY_ERROR_ES : CLOUD_ONLY_ERROR_EN);
  }

  const prompt =
    lang === "es"
      ? `Ilustra de forma educativa: ${conceptText.slice(0, 600)}`
      : `Illustrate educationally: ${conceptText.slice(0, 600)}`;

  const raw = await cloudGenerate({
    apiKey,
    systemInstruction: lang === "es" ? SYSTEM_SVG_ES : SYSTEM_SVG_EN,
    prompt,
    temperature: 0.6,
    maxOutputTokens: 1500,
  });

  // Extract the <svg>...</svg> block from the response
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) {
    throw new Error(
      lang === "es"
        ? "No pude ilustrar este concepto bien. Intenta con otro mensaje."
        : "Could not illustrate this concept. Try a different message.",
    );
  }

  const sanitized = sanitizeSvg(match[0]);

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
