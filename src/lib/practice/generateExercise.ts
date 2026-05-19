import { extractJson } from "@/lib/jsonExtract";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL    = "gemini-2.0-flash";

export type Difficulty = "easy" | "medium" | "hard";

export interface Exercise {
  question:    string;
  answer:      string;
  explanation: string;
}

interface GeminiPart    { text?: string; thought?: boolean }
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

export async function generateExercise(
  topic: string,
  difficulty: Difficulty,
  lang: "es" | "en",
  apiKey: string,
): Promise<Exercise> {
  const diffLabel =
    lang === "es"
      ? { easy: "fácil", medium: "medio", hard: "difícil" }[difficulty]
      : difficulty;

  const prompt =
    lang === "es"
      ? `Genera un ejercicio de práctica de nivel ${diffLabel} sobre: "${topic}".
Responde ÚNICAMENTE con JSON válido (sin texto extra ni markdown):
{"question":"...","answer":"...","explanation":"..."}`
      : `Generate a ${diffLabel} practice exercise about: "${topic}".
Reply ONLY with valid JSON (no extra text or markdown):
{"question":"...","answer":"...","explanation":"..."}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 400,
      temperature: 0.8,
      responseMimeType: "application/json",
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

  if (!raw) throw new Error("Model returned empty response");

  const parsed = extractJson(raw) as Partial<Exercise>;
  if (!parsed.question || !parsed.answer) {
    throw new Error("Model response missing required fields");
  }

  return {
    question:    parsed.question,
    answer:      parsed.answer,
    explanation: parsed.explanation ?? "",
  };
}

interface ErrorAnalysis { feedback: string }

/**
 * Ask the model to identify the conceptual error in the student's wrong answer.
 * Returns a short explanation string.
 */
export async function analyzeConceptualError(
  question:    string,
  correctAnswer: string,
  studentAnswer: string,
  lang: "es" | "en",
  apiKey: string,
): Promise<string> {
  const prompt =
    lang === "es"
      ? `Un estudiante respondió incorrectamente a este ejercicio.

Pregunta: ${question}
Respuesta correcta: ${correctAnswer}
Respuesta del estudiante: ${studentAnswer}

Identifica el error conceptual en la respuesta del estudiante en 2-3 frases. Sé amable y constructivo. No des la respuesta directamente; ayúdale a entender qué salió mal.`
      : `A student answered this exercise incorrectly.

Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${studentAnswer}

Identify the conceptual error in the student's answer in 2-3 sentences. Be kind and constructive. Don't give the answer directly; help them understand what went wrong.`;

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
      }),
    },
  );

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  return text || "No se pudo analizar el error.";
}

/** Loose answer comparison: case-insensitive, trim, normalize spaces + accents. */
export function answersMatch(userAnswer: string, correctAnswer: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")  // strip accents
      .replace(/\s+/g, " ");

  const u = normalize(userAnswer);
  const c = normalize(correctAnswer);
  if (u === c) return true;

  // numeric comparison: "4" == "4.0" == "4,0"
  const uNum = parseFloat(u.replace(",", "."));
  const cNum = parseFloat(c.replace(",", "."));
  if (!isNaN(uNum) && !isNaN(cNum) && Math.abs(uNum - cNum) < 1e-9) return true;

  return false;
}
