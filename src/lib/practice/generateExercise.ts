import { extractJson } from "@/lib/jsonExtract";
import { cloudGenerate } from "@/lib/cloudNoStream";

export type Difficulty = "easy" | "medium" | "hard";

export interface Exercise {
  question:    string;
  answer:      string;
  explanation: string;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildSystemPrompt(lang: "es" | "en"): string {
  return lang === "es"
    ? `Eres un generador de ejercicios educativos. Cada vez que te pidan un ejercicio, generas UNO nuevo y completamente distinto al anterior. Varías: números, contexto, sub-tema, tipo de razonamiento (resolver / comparar / definir / aplicar / analizar).

Respondes ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin bloques de código:
{"question":"...","answer":"...","hint":"..."}`
    : `You are an educational exercise generator. Every time you are asked for an exercise, you generate ONE new one completely different from the previous. You vary: numbers, context, sub-topic, type of reasoning (solve / compare / define / apply / analyze).

Reply ONLY with a valid JSON object, no surrounding text, no markdown, no code blocks:
{"question":"...","answer":"...","hint":"..."}`;
}

function buildUserPrompt(
  topic: string,
  diffLabel: string,
  lang: "es" | "en",
  previousQuestions: string[],
  isRetry: boolean,
): string {
  const prevBlock =
    previousQuestions.length > 0
      ? lang === "es"
        ? `\nNO repitas ni hagas variaciones triviales de estas preguntas previas:\n${previousQuestions.slice(-5).map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\n`
        : `\nDo NOT repeat or make trivial variations of these previous questions:\n${previousQuestions.slice(-5).map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\n`
      : "";

  const base =
    lang === "es"
      ? `${prevBlock}Genera UN ejercicio nuevo de: ${topic}\nNivel: ${diffLabel}\nVariá: números, contexto, sub-tema, tipo de razonamiento.\nResponde solo el JSON.`
      : `${prevBlock}Generate ONE new exercise about: ${topic}\nLevel: ${diffLabel}\nVary: numbers, context, sub-topic, type of reasoning.\nReply only with the JSON.`;

  if (!isRetry) return base;

  return lang === "es"
    ? `${base}\n\nIMPORTANTE: Responde ÚNICAMENTE con el JSON. Sin texto antes ni después. Sin bloques de código.`
    : `${base}\n\nIMPORTANT: Reply ONLY with the JSON. No text before or after. No code blocks.`;
}

// ── Main functions ────────────────────────────────────────────────────────────

export async function generateExercise({
  apiKey,
  topic,
  difficulty,
  lang,
  previousQuestions = [],
}: {
  apiKey:             string;
  topic:              string;
  difficulty:         Difficulty;
  lang:               "es" | "en";
  previousQuestions?: string[];
}): Promise<Exercise> {
  const diffLabel =
    lang === "es"
      ? { easy: "fácil", medium: "medio", hard: "difícil" }[difficulty]
      : difficulty;

  const systemContent = buildSystemPrompt(lang);

  for (let attempt = 0; attempt < 2; attempt++) {
    const userContent = buildUserPrompt(topic, diffLabel, lang, previousQuestions, attempt > 0);

    let raw: string;
    try {
      raw = await cloudGenerate({
        apiKey,
        systemInstruction: systemContent,
        prompt: userContent,
        temperature: attempt === 0 ? 0.85 : 0.2,
        maxOutputTokens: 512,
      });
    } catch (err) {
      throw err;
    }

    if (!raw?.trim()) continue;

    try {
      const parsed = extractJson(raw) as Partial<{ question: string; answer: string; hint: string }>;
      if (parsed.question && parsed.answer) {
        return {
          question:    parsed.question,
          answer:      parsed.answer,
          explanation: parsed.hint ?? "",
        };
      }
    } catch {
      // JSON extraction failed — retry with stricter prompt
    }
  }

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
  const apiKey =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("aula:google-ai-api-key")
      : null;

  if (!apiKey) {
    return lang === "es" ? "No se pudo analizar el error." : "Could not analyze the error.";
  }

  const prompt =
    lang === "es"
      ? `Un estudiante respondió incorrectamente a este ejercicio.

Pregunta: ${question}
Respuesta correcta: ${correctAnswer}
Respuesta del estudiante: ${studentAnswer}

Identifica el error conceptual en 2-3 frases. Sé amable y constructivo. No des la respuesta directamente; ayúdale a entender qué salió mal.`
      : `A student answered this exercise incorrectly.

Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${studentAnswer}

Identify the conceptual error in 2-3 sentences. Be kind and constructive. Don't give the answer directly; help them understand what went wrong.`;

  const text = await cloudGenerate({ apiKey, prompt, maxOutputTokens: 200, temperature: 0.3 });
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
