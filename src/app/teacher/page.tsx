"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractJson } from "@/lib/jsonExtract";
import { useProgressStore } from "@/store/progressStore";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";
import type { Lang } from "@/store/i18nStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL    = "gemma-4-26b-a4b-it";

const GRADE_OPTIONS = ["6°", "7°", "8°", "9°", "10°", "11°"];
const COUNT_OPTIONS = [3, 5, 7, 10];

type QuizType = "multiple_choice" | "open" | "mixed";

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

function getSystemInstruction(lang: Lang): string {
  if (lang === "en") {
    return (
      "You are an educational quiz generator. " +
      "Respond EXCLUSIVELY with a valid JSON object. " +
      "NEVER include text before or after the JSON. " +
      "NEVER use markdown or backticks. " +
      "Always use double quotes for keys and values. " +
      'Exact structure: {"topic":"string","grade":"string","questions":[{"question":"string","options":["A) string","B) string","C) string","D) string"],"answer":"A","explanation":"string"}]}\n' +
      'For open questions omit "options" and put the full answer in "answer".'
    );
  }
  return (
    "Eres un generador de quizzes educativos. " +
    "Respondes EXCLUSIVAMENTE con un objeto JSON válido. " +
    "NUNCA incluyas texto antes o después del JSON. " +
    "NUNCA uses markdown ni backticks. " +
    "Usa SIEMPRE comillas dobles para claves y valores. " +
    'Estructura exacta:\n{"topic":"string","grade":"string","questions":[{"question":"string","options":["A) string","B) string","C) string","D) string"],"answer":"A","explanation":"string"}]}\n' +
    'Para preguntas abiertas omite el campo "options" y pon la respuesta completa en "answer".'
  );
}

function buildUserPrompt(topic: string, grade: string, count: number, type: QuizType, lang: Lang): string {
  if (lang === "en") {
    const typeDesc =
      type === "multiple_choice" ? "multiple choice (4 options A-D)"
      : type === "open"          ? "open-ended questions"
      :                            "mixed (half multiple choice, half open)";
    return (
      `Create ${count} ${typeDesc} questions about "${topic}" ` +
      `for ${grade} secondary school students. ` +
      `Respond only with the JSON, starting with { and ending with }.`
    );
  }
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

function buildRetryPrompt(topic: string, grade: string, count: number, type: QuizType, lang: Lang): string {
  return (
    (lang === "en" ? "Your previous response was not valid JSON. " : "Tu respuesta anterior no fue JSON válido. ") +
    buildUserPrompt(topic, grade, count, type, lang) +
    (lang === "en" ? " Write nothing before { or after }." : " No escribas nada antes de { ni después de }.")
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
    if (typeof q["question"] !== "string" || !q["question"]) throw new Error("Una pregunta no tiene texto.");
    if (typeof q["answer"]   !== "string" || !q["answer"])   throw new Error("Una pregunta no tiene respuesta.");
  }
  return {
    topic:     typeof obj["topic"] === "string" ? obj["topic"] : "",
    grade:     typeof obj["grade"] === "string" ? obj["grade"] : "",
    questions: questions as unknown as QuizQuestion[],
  };
}

type GeminiPart     = { text?: string; thought?: boolean };
type GeminiResponse = { candidates?: Array<{ content?: { parts?: GeminiPart[] } }>; error?: { message?: string; code?: number } };

async function callGemini(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  count: number,
  suppressThinking = true,
): Promise<string> {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: Math.max(1024, count * 350),
    temperature: 0.3,
  };
  if (suppressThinking) generationConfig["thinkingConfig"] = { thinkingBudget: 0 };

  const res = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig,
    }),
  });

  if (res.status === 400 && suppressThinking) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    const msg  = body.error?.message ?? "";
    if (msg.toLowerCase().includes("thinking")) return callGemini(apiKey, systemInstruction, userPrompt, count, false);
    throw new Error(msg || "HTTP 400");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }

  const data  = (await res.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p) => p.thought !== true).map((p) => p.text ?? "").join("");
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherPage() {
  const t    = useT();
  const lang = useI18nStore((s) => s.lang);

  const [topic,   setTopic]   = useState("");
  const [grade,   setGrade]   = useState("8°");
  const [count,   setCount]   = useState(5);
  const [type,    setType]    = useState<QuizType>("multiple_choice");
  const [loading, setLoading] = useState(false);
  const [quiz,    setQuiz]    = useState<Quiz | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const recordQuizGenerated = useProgressStore((s) => s.recordQuizGenerated);

  const TYPE_OPTIONS: { value: QuizType; labelKey: string }[] = [
    { value: "multiple_choice", labelKey: "teacher.type.multiple" },
    { value: "open",            labelKey: "teacher.type.open"     },
    { value: "mixed",           labelKey: "teacher.type.mixed"    },
  ];

  async function generate() {
    const apiKey = localStorage.getItem("aula:google-ai-api-key");
    if (!apiKey) { setError(t("teacher.noApiKey")); return; }
    if (!topic.trim()) { setError(t("teacher.noTopic")); return; }

    setLoading(true);
    setError(null);
    setQuiz(null);

    const topicTrimmed      = topic.trim();
    const systemInstruction = getSystemInstruction(lang);

    try {
      let raw = await callGemini(apiKey, systemInstruction, buildUserPrompt(topicTrimmed, grade, count, type, lang), count);

      let result: Quiz | null = null;
      try {
        result = validateQuiz(extractJson(raw));
      } catch {
        raw    = await callGemini(apiKey, systemInstruction, buildRetryPrompt(topicTrimmed, grade, count, type, lang), count);
        result = validateQuiz(extractJson(raw));
      }

      setQuiz(result);
      recordQuizGenerated();
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
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <Header />
      <div className="max-w-2xl mx-auto w-full p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-heading font-bold text-aula-ink">{t("teacher.title")}</h1>
          <p className="text-sm text-aula-ink-soft">{t("teacher.subtitle")}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading">{t("teacher.config")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1">{t("teacher.topic")}</label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("teacher.topicPlaceholder")}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs font-medium block mb-1">{t("teacher.grade")}</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm bg-white"
                >
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t("teacher.questions")}</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="border rounded px-2 py-1.5 text-sm bg-white"
                >
                  {COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t("teacher.type")}</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as QuizType)}
                  className="border rounded px-2 py-1.5 text-sm bg-white"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}

            <Button
              onClick={() => { void generate(); }}
              disabled={loading || !topic.trim()}
              className="w-full bg-aula-blue hover:bg-aula-blue-dark text-white"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("teacher.generating")}</>
                : t("teacher.generate")
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
                  {t("teacher.export")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {quiz.questions.map((q, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 bg-white">
                  <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                  {q.options && (
                    <ul className="pl-3 space-y-0.5">
                      {q.options.map((opt, j) => <li key={j} className="text-sm text-gray-700">{opt}</li>)}
                    </ul>
                  )}
                  <p className="text-xs font-semibold text-aula-green">
                    {t("teacher.answer")} {q.answer}
                  </p>
                  {q.explanation && <p className="text-xs text-gray-500 italic">{q.explanation}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
