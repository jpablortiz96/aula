"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractJson } from "@/lib/jsonExtract";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL    = "gemma-4-26b-a4b-it";

const GRADE_OPTIONS = ["6°", "7°", "8°", "9°", "10°", "11°"];
const COUNT_OPTIONS = [3, 5, 7, 10];
const TYPE_OPTIONS = [
  { value: "multiple_choice", label: "Selección múltiple" },
  { value: "open",            label: "Pregunta abierta"   },
  { value: "mixed",           label: "Mixto"              },
] as const;

type QuizType = typeof TYPE_OPTIONS[number]["value"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question:     string;
  options?:     string[];
  answer:       string;
  explanation?: string;
}
interface Quiz {
  topic:     string;
  grade:     string;
  questions: QuizQuestion[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION =
  "Eres un generador de quizzes educativos. " +
  "Respondes EXCLUSIVAMENTE con un objeto JSON válido. " +
  "NUNCA incluyas texto antes o después del JSON. " +
  "NUNCA uses markdown ni backticks. " +
  "Usa SIEMPRE comillas dobles para claves y valores. " +
  "Escapa las comillas internas con \\\\\" (backslash-quote). " +
  "Estructura exacta:\n" +
  '{"topic":"string","grade":"string","questions":[{"question":"string","options":["A) string","B) string","C) string","D) string"],"answer":"A","explanation":"string"}]}\n' +
  "Para preguntas abiertas omite el campo \"options\" y pon la respuesta completa en \"answer\".";

function buildUserPrompt(topic: string, grade: string, count: number, type: QuizType): string {
  const typeDesc =
    type === "multiple_choice" ? "selección múltiple (4 opciones A-D)"
    : type === "open"          ? "preguntas abiertas"
    :                            "mixto (mitad selección múltiple, mitad abiertas)";

  return (
    `Crea ${count} preguntas de ${typeDesc} sobre "${topic}" ` +
    `para estudiantes de ${grade} de secundaria en Latinoamérica. ` +
    `Responde solo el JSON, comenzando con { y terminando con }.`
  );
}

function buildRetryPrompt(topic: string, grade: string, count: number, type: QuizType): string {
  return (
    `Tu respuesta anterior no fue JSON válido. ` +
    buildUserPrompt(topic, grade, count, type) +
    ` No escribas nada antes de { ni después de }.`
  );
}

function validateQuiz(parsed: unknown): Quiz {
  const obj = parsed as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("Respuesta no es un objeto JSON.");
  if (!Array.isArray(obj["questions"]) || (obj["questions"] as unknown[]).length === 0) {
    throw new Error("El quiz no tiene preguntas.");
  }
  const questions = obj["questions"] as Record<string, unknown>[];
  for (const q of questions) {
    if (typeof q["question"] !== "string" || !q["question"]) {
      throw new Error("Una pregunta no tiene texto.");
    }
    if (typeof q["answer"] !== "string" || !q["answer"]) {
      throw new Error("Una pregunta no tiene respuesta.");
    }
  }
  return {
    topic:     typeof obj["topic"] === "string" ? obj["topic"] : "",
    grade:     typeof obj["grade"] === "string" ? obj["grade"] : "",
    questions: questions as unknown as QuizQuestion[],
  };
}

type GeminiPart = { text?: string; thought?: boolean };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string; code?: number };
};

async function callGemini(
  apiKey: string,
  userPrompt: string,
  count: number,
  suppressThinking = true,
): Promise<string> {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: Math.max(1024, count * 350),
    temperature: 0.3,
  };
  if (suppressThinking) {
    generationConfig["thinkingConfig"] = { thinkingBudget: 0 };
  }

  const res = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig,
    }),
  });

  // thinkingConfig may not be supported — retry without it
  if (res.status === 400 && suppressThinking) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    const msg = body.error?.message ?? "";
    if (msg.toLowerCase().includes("thinking")) {
      return callGemini(apiKey, userPrompt, count, false);
    }
    throw new Error(msg || "HTTP 400");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeminiResponse;
  // Filter out thinking tokens (thought: true) before joining text
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => p.thought !== true)
    .map((p) => p.text ?? "")
    .join("");
}

function toMarkdown(quiz: Quiz): string {
  const lines: string[] = [`# Quiz: ${quiz.topic}`, `**Grado:** ${quiz.grade}`, ""];
  quiz.questions.forEach((q, i) => {
    lines.push(`## ${i + 1}. ${q.question}`);
    if (q.options) q.options.forEach((o) => lines.push(`- ${o}`));
    lines.push("", `**Respuesta:** ${q.answer}`);
    if (q.explanation) lines.push("", `*${q.explanation}*`);
    lines.push("");
  });
  return lines.join("\n");
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function TeacherPage() {
  const [topic,   setTopic]   = useState("");
  const [grade,   setGrade]   = useState("8°");
  const [count,   setCount]   = useState(5);
  const [type,    setType]    = useState<QuizType>("multiple_choice");
  const [loading, setLoading] = useState(false);
  const [quiz,    setQuiz]    = useState<Quiz | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function generate() {
    const apiKey = localStorage.getItem("aula:google-ai-api-key");
    if (!apiKey) {
      setError("Configura tu API key de Google AI Studio en Config.");
      return;
    }
    if (!topic.trim()) { setError("Ingresa un tema."); return; }

    setLoading(true);
    setError(null);
    setQuiz(null);

    const topicTrimmed = topic.trim();

    try {
      // First attempt
      let raw = await callGemini(apiKey, buildUserPrompt(topicTrimmed, grade, count, type), count);

      let quiz: Quiz | null = null;
      try {
        quiz = validateQuiz(extractJson(raw));
      } catch {
        // First parse failed — retry with more explicit prompt
        raw = await callGemini(apiKey, buildRetryPrompt(topicTrimmed, grade, count, type), count);
        quiz = validateQuiz(extractJson(raw));
      }

      setQuiz(quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function exportMd() {
    if (!quiz) return;
    const blob = new Blob([toMarkdown(quiz)], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `quiz-${quiz.topic.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-2xl mx-auto w-full p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Modo Profesor</h1>
          <p className="text-sm text-muted-foreground">
            Genera quizzes para tus estudiantes con IA.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuración del quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1">Tema</label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: Las Leyes de Newton, Fracciones equivalentes, La independencia de México…"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs font-medium block mb-1">Grado</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm bg-white"
                >
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Preguntas</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="border rounded px-2 py-1.5 text-sm bg-white"
                >
                  {COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as QuizType)}
                  className="border rounded px-2 py-1.5 text-sm bg-white"
                >
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <Button
              onClick={() => { void generate(); }}
              disabled={loading || !topic.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando…</>
                : "Generar Quiz"
              }
            </Button>
          </CardContent>
        </Card>

        {quiz && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{quiz.topic} — {quiz.grade}</CardTitle>
                <Button variant="outline" size="sm" onClick={exportMd} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  Exportar .md
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {quiz.questions.map((q, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 bg-white">
                  <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                  {q.options && (
                    <ul className="pl-3 space-y-0.5">
                      {q.options.map((opt, j) => (
                        <li key={j} className="text-sm text-gray-700">{opt}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs font-semibold text-green-700">
                    Respuesta: {q.answer}
                  </p>
                  {q.explanation && (
                    <p className="text-xs text-gray-500 italic">{q.explanation}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
