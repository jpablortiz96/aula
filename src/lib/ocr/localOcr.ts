import { createWorker, PSM } from "tesseract.js";

/** Grayscale + contrast boost — for camera/printed-text images. */
function preprocessImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray     = d[i]! * 0.299 + d[i + 1]! * 0.587 + d[i + 2]! * 0.114;
        const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.8 + 128));
        d[i] = d[i + 1] = d[i + 2] = contrast;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Preprocessing optimized for handwriting on a light canvas:
 * - Scale up 3× (Tesseract needs larger images for thin strokes)
 * - Pad 80 px on each side (layout analysis needs margin)
 * - Hard-threshold binarize: luminance < 140 → black, else → white
 */
function preprocessHandwriting(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const SCALE = 3;
      const PAD   = 80;
      const w = img.width  * SCALE;
      const h = img.height * SCALE;

      const canvas = document.createElement("canvas");
      canvas.width  = w + PAD * 2;
      canvas.height = h + PAD * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, PAD, PAD, w, h);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = d[i]! * 0.299 + d[i + 1]! * 0.587 + d[i + 2]! * 0.114;
        const v    = gray < 140 ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Extract text from a base64 dataURL using Tesseract.js.
 * Intended for camera / printed-text images.
 */
export async function extractTextFromImage(
  dataUrl: string,
  lang: "spa" | "eng" = "spa",
  onProgress?: (pct: number) => void,
): Promise<string> {
  const preprocessed = await preprocessImage(dataUrl);

  const worker = await createWorker(lang, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const result = await worker.recognize(preprocessed);
  await worker.terminate();

  return result.data.text.trim();
}

/**
 * OCR specialized for handwritten canvas content.
 * Applies 3× upscaling + hard binarization + single-block PSM.
 * Returns text and Tesseract's confidence (0–100).
 * Callers should treat confidence < 40 as unreliable.
 */
export async function extractHandwritingFromCanvas(
  dataUrl: string,
  lang: "spa" | "eng" = "spa",
  onProgress?: (pct: number) => void,
): Promise<{ text: string; confidence: number }> {
  const preprocessed = await preprocessHandwriting(dataUrl);

  const worker = await createWorker(lang, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  const result = await worker.recognize(preprocessed);
  await worker.terminate();

  return {
    text:       result.data.text.trim(),
    confidence: result.data.confidence,
  };
}
