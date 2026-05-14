import { createWorker } from "tesseract.js";

/** Preprocess image for better OCR: grayscale + contrast boost. */
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
 * Extract text from a base64 dataURL using Tesseract.js.
 * Lang: "spa" for Spanish, "eng" for English (downloaded on first use).
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
