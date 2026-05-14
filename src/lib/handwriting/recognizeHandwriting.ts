import { extractTextFromImage } from "@/lib/ocr/localOcr";

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
  createHandwritingRecognizer(
    c: { languages: string[] }
  ): Promise<HWRecognizer>;
};

function hasNativeAPI(): boolean {
  return typeof navigator !== "undefined" &&
    "createHandwritingRecognizer" in navigator;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface HandwritingResult {
  text:   string;
  method: "native" | "tesseract" | "failed";
}

export interface StrokePoint { x: number; y: number; t: number }

/**
 * Recognize handwritten strokes using the native API → Tesseract fallback.
 *
 * @param strokes - Array of stroke point sequences (for native API)
 * @param canvasDataUrl - Rasterized canvas image (for Tesseract fallback)
 * @param lang - "es" | "en"
 */
export async function recognizeHandwriting(
  strokes: StrokePoint[][],
  canvasDataUrl: string,
  lang: "es" | "en" = "es",
): Promise<HandwritingResult> {
  // Step 1 — Native Handwriting Recognition API
  if (hasNativeAPI() && strokes.length > 0) {
    try {
      const nav = navigator as HWNav;
      const recognizer = await nav.createHandwritingRecognizer({
        languages: [lang === "es" ? "es" : "en"],
      });

      const drawing = recognizer.startDrawing({
        recognitionType: "text",
        alternatives:    3,
      });

      for (const strokePoints of strokes) {
        const stroke = drawing.createStroke();
        for (const pt of strokePoints) stroke.addPoint(pt);
        drawing.addStroke(stroke);
      }

      const predictions = await drawing.getPrediction();
      drawing.delete();
      recognizer.finish();

      const text = predictions[0]?.text?.trim() ?? "";
      if (text.length > 0) {
        return { text, method: "native" };
      }
    } catch {
      // Native API failed — fall through to Tesseract
    }
  }

  // Step 2 — Tesseract.js fallback
  try {
    const tesseractLang = lang === "es" ? "spa" : "eng";
    const text = await extractTextFromImage(canvasDataUrl, tesseractLang);
    if (text.length > 0) {
      return { text, method: "tesseract" };
    }
  } catch {
    // Tesseract failed — fall through
  }

  // Step 3 — Both failed
  return { text: "", method: "failed" };
}
