// ─── Native Handwriting Recognition API (Chrome experimental) ─────────────────
// Not in standard lib.dom.d.ts — declared here.

interface HWPoint     { x: number; y: number; t?: number }
interface HWStroke    { addPoint(p: HWPoint): void }
interface HWPrediction{ text: string }
interface HWDrawing   {
  createStroke():  HWStroke;
  addStroke(s: HWStroke): void;
  getPrediction(): Promise<HWPrediction[]>;
  delete():        void;
}
interface HWRecognizer {
  startDrawing(hints?: {
    recognitionType?: string;
    inputType?: string;
    alternatives?: number;
    textContext?: string;
  }): HWDrawing;
  finish(): void;
}
type HWNav = typeof navigator & {
  createHandwritingRecognizer(c: { languages: string[] }): Promise<HWRecognizer>;
};

function hasNativeAPI(): boolean {
  return typeof navigator !== "undefined" &&
    "createHandwritingRecognizer" in navigator;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface HandwritingResult {
  text:   string;
  method: "native" | "gemini" | "failed";
}

export interface StrokePoint { x: number; y: number; t: number }

/**
 * Recognize handwritten strokes.
 *
 * Cascade:
 *   1. Chrome Native Handwriting API — requires experimental Chrome flag
 *   2. Gemini (Google AI Studio) — same API key used for Cloud Boost; reads any handwriting
 *   3. "failed" — caller shows a manual-input textarea
 *
 * @param strokes       Stroke sequences for the native API
 * @param canvasDataUrl Canvas image for Gemini
 * @param lang          "es" | "en"
 * @param apiKey        Google AI Studio key (from localStorage); if absent, skips Gemini
 */
export async function recognizeHandwriting(
  strokes: StrokePoint[][],
  canvasDataUrl: string,
  lang: "es" | "en" = "es",
  apiKey?: string,
): Promise<HandwritingResult> {

  // ── Step 1: Chrome Native Handwriting API ──────────────────────────────────
  if (hasNativeAPI() && strokes.length > 0) {
    try {
      const nav        = navigator as HWNav;
      const recognizer = await nav.createHandwritingRecognizer({
        languages: [lang === "es" ? "es" : "en"],
      });
      const drawing = recognizer.startDrawing({ recognitionType: "text", alternatives: 3 });

      for (const strokePoints of strokes) {
        const stroke = drawing.createStroke();
        for (const pt of strokePoints) stroke.addPoint(pt);
        drawing.addStroke(stroke);
      }

      const predictions = await drawing.getPrediction();
      drawing.delete();
      recognizer.finish();

      const text = predictions[0]?.text?.trim() ?? "";
      if (text.length > 0) return { text, method: "native" };
    } catch {
      // Native API failed — fall through
    }
  }

  // ── Step 2: Gemini — reads any handwriting, uses same key as Cloud Boost ───
  if (apiKey) {
    try {
      const { transcribeHandwriting } = await import("@/lib/handwriting/geminiTranscribe");
      const text = await transcribeHandwriting(canvasDataUrl, apiKey);
      if (text.length > 0) return { text, method: "gemini" };
    } catch {
      // Network error or quota — fall through to manual input
    }
  }

  // ── Step 3: All engines failed → show manual textarea ─────────────────────
  return { text: "", method: "failed" };
}
