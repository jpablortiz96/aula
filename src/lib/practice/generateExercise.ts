import { extractJson } from "@/lib/jsonExtract";
import { generateText } from "@/engines/engineSingleton";

export type Difficulty = "easy" | "medium" | "hard";

export interface Exercise {
  question:    string;
  answer:      string;
  explanation: string;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildPreviousBlock(previousQuestions: string[], lang: "es" | "en"): string {
  if (previousQuestions.length === 0) return "";
  const numbered = previousQuestions.map((q, i) => `  ${i + 1}. ${q}`).join("\n");
  return lang === "es"
    ? `\nYa generaste estas preguntas en esta sesión (NO repitas ninguna):\n${numbered}\nGenera una pregunta COMPLETAMENTE DIFERENTE, con otro enfoque, números distintos o sub-tema relacionado.\n`
    : `\nYou already generated these questions this session (do NOT repeat any):\n${numbered}\nGenerate a COMPLETELY DIFFERENT question with another angle, different numbers, or related sub-topic.\n`;
}

function buildExercisePrompt(
  topic: string,
  diffLabel: string,
  lang: "es" | "en",
  isRetry: boolean,
  previousQuestions: string[],
): string {
  const prevBlock = buildPreviousBlock(previousQuestions, lang);

  if (isRetry) {
    return lang === "es"
      ? `Tu respuesta anterior no fue JSON válido. Intenta de nuevo.
RESPONDE ÚNICAMENTE con un objeto JSON. Nada antes. Nada después. Sin markdown.

{"question":"[pregunta de nivel ${diffLabel} sobre ${topic}]","answer":"[respuesta correcta]","explanation":"[explicación breve]"}`
      : `Your previous response was not valid JSON. Try again.
REPLY ONLY with a JSON object. Nothing before. Nothing after. No markdown.

{"question":"[${diffLabel} question about ${topic}]","answer":"[correct answer]","explanation":"[brief explanation]"}`;
  }

  return lang === "es"
    ? `Eres un generador de ejercicios educativos. Tu única tarea es producir UN objeto JSON válido.

REGLAS ABSOLUTAS:
- Responde ÚNICAMENTE con el JSON. Nada antes ni después. Sin texto extra. Sin markdown.
- Estructura exacta: {"question":"...","answer":"...","explanation":"..."}
- No uses bloques de código. No pongas comentarios. No expliques nada fuera del JSON.
${prevBlock}
Tema: "${topic}". Nivel: ${diffLabel}.`
    : `You are an educational exercise generator. Your only job is to produce ONE valid JSON object.

ABSOLUTE RULES:
- Reply ONLY with the JSON. Nothing before or after. No extra text. No markdown.
- Exact structure: {"question":"...","answer":"...","explanation":"..."}
- No code blocks. No comments. No explanations outside the JSON.
${prevBlock}
Topic: "${topic}". Level: ${diffLabel}.`;
}

// ── Main functions ────────────────────────────────────────────────────────────

export async function generateExercise(
  topic: string,
  difficulty: Difficulty,
  lang: "es" | "en",
  previousQuestions: string[] = [],
): Promise<Exercise> {
  const diffLabel =
    lang === "es"
      ? { easy: "fácil", medium: "medio", hard: "difícil" }[difficulty]
      : difficulty;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildExercisePrompt(topic, diffLabel, lang, attempt > 0, previousQuestions);
    // First attempt: higher temperature for diversity; retry: low temperature for strict JSON
    const temperature = attempt === 0 ? 0.7 : 0.3;

    let raw: string;
    try {
      raw = await generateText(prompt, { maxTokens: 300, temperature });
    } catch (err) {
      // Engine errors (no engine loaded, network, etc.) — not retried, bubble up
      throw err;
    }

    if (!raw?.trim()) continue;

    try {
      const parsed = extractJson(raw) as Partial<Exercise>;
      if (parsed.question && parsed.answer) {
        return {
          question:    parsed.question,
          answer:      parsed.answer,
          explanation: parsed.explanation ?? "",
        };
      }
    } catch {
      // JSON extraction failed — retry once with stricter prompt
    }
  }

  // Both attempts failed — throw a user-friendly message
  throw new Error(
    lang === "es"
      ? "No pude generar el ejercicio. Intenta con otro tema."
      : "Could not generate an exercise. Try a different topic.",
  );
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
