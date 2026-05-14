"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GRADE_OPTIONS = ["6°", "7°", "8°", "9°", "10°", "11°"];
const COUNT_OPTIONS = [3, 5, 7, 10];
const TYPE_OPTIONS = [
  { value: "multiple_choice", label: "Selección múltiple" },
  { value: "open",            label: "Pregunta abierta"   },
  { value: "mixed",           label: "Mixto"              },
] as const;

type QuizType = typeof TYPE_OPTIONS[number]["value"];

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

function buildPrompt(topic: string, grade: string, count: number, type: QuizType): string {
  const typeDesc =
    type === "multiple_choice" ? "selección múltiple (4 opciones A-D)"
    : type === "open"          ? "preguntas abiertas con respuesta esperada"
    :                            "mixto (mitad selección múltiple, mitad abiertas)";

  return (
    `Crea un quiz de ${count} preguntas sobre "${topic}" para estudiantes de ${grade} de secundaria en Latinoamérica.\n` +
    `Tipo: ${typeDesc}.\n` +
    `Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra) usando este esquema:\n` +
    `{"topic":"...","grade":"...","questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"..."}]}\n` +
    `Para preguntas abiertas omite el campo "options". El campo "answer" en preguntas abiertas es la respuesta completa esperada.`
  );
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function toMarkdown(quiz: Quiz): string {
  const lines: string[] = [
    `# Quiz: ${quiz.topic}`,
    `**Grado:** ${quiz.grade}`,
    "",
  ];
  quiz.questions.forEach((q, i) => {
    lines.push(`## ${i + 1}. ${q.question}`);
    if (q.options) q.options.forEach((o) => lines.push(`- ${o}`));
    lines.push("", `**Respuesta:** ${q.answer}`);
    if (q.explanation) lines.push("", `*${q.explanation}*`);
    lines.push("");
  });
  return lines.join("\n");
}

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL    = "gemma-4-26b-a4b-it";

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

    try {
      const prompt = buildPrompt(topic.trim(), grade, count, type);
      const res = await fetch(
        `${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
          }),
        }
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const raw     = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = stripFences(raw);
      const parsed  = JSON.parse(cleaned) as Quiz;
      setQuiz(parsed);
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

            {error && <p className="text-xs text-red-600">{error}</p>}

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
                  <p className="text-xs font-semibold text-green-700">Respuesta: {q.answer}</p>
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
