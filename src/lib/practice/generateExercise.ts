import { extractJson } from "@/lib/jsonExtract";
import { generateText } from "@/engines/engineSingleton";

export type Difficulty = "easy" | "medium" | "hard";

export interface Exercise {
  question:    string;
  answer:      string;
  explanation: string;
}

export async function generateExercise(
  topic: string,
  difficulty: Difficulty,
  lang: "es" | "en",
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

  const raw = await generateText(prompt, { maxTokens: 400, temperature: 0.8 });
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

export async function analyzeConceptualError(
  question:      string,
  correctAnswer: string,
  studentAnswer: string,
  lang: "es" | "en",
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

  const text = await generateText(prompt, { maxTokens: 200, temperature: 0.3 });
  return text || (lang === "es" ? "No se pudo analizar el error." : "Could not analyze the error.");
}

/** Loose answer comparison: case-insensitive, trim, normalize spaces + accents. */
export function answersMatch(userAnswer: string, correctAnswer: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ");

  const u = normalize(userAnswer);
  const c = normalize(correctAnswer);
  if (u === c) return true;

  const uNum = parseFloat(u.replace(",", "."));
  const cNum = parseFloat(c.replace(",", "."));
  if (!isNaN(uNum) && !isNaN(cNum) && Math.abs(uNum - cNum) < 1e-9) return true;

  return false;
}
