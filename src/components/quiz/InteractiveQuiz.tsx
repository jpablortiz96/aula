"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";
import { useProgressStore } from "@/store/progressStore";
import { cloudGenerate } from "@/lib/cloudNoStream";
import { extractJson } from "@/lib/jsonExtract";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question:      string;
  options:       string[];
  correctAnswer: number;    // 0-based index
  explanation:   string;
}

type Phase = "setup" | "loading" | "quiz" | "result";
type Level = "easy" | "medium" | "hard";

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM_ES = `Eres un generador de quizzes educativos. Respondes ÚNICAMENTE con JSON válido, sin texto antes ni después, sin markdown, sin bloques de código.

Formato exacto (correctAnswer es el índice 0-3 de la opción correcta):
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":0,"explanation":"..."}]}`;

const SYSTEM_EN = `You are an educational quiz generator. Reply ONLY with valid JSON, no text before or after, no markdown, no code blocks.

Exact format (correctAnswer is the 0-3 index of the correct option):
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":0,"explanation":"..."}]}`;

function buildPrompt(topic: string, count: number, level: Level, lang: "es" | "en"): string {
  const levelLabel =
    lang === "es"
      ? { easy: "fácil", medium: "medio", hard: "difícil" }[level]
      : level;
  return lang === "es"
    ? `Genera ${count} preguntas de opción múltiple (nivel ${levelLabel}) sobre: "${topic}"\nResponde solo el JSON.`
    : `Generate ${count} multiple choice questions (${levelLabel} level) about: "${topic}"\nReply only with the JSON.`;
}

// ── Emoji score ───────────────────────────────────────────────────────────────

function scoreEmoji(pct: number): string {
  if (pct >= 0.9) return "🏆";
  if (pct >= 0.7) return "🎉";
  if (pct >= 0.5) return "👍";
  return "💪";
}

// ── Component ─────────────────────────────────────────────────────────────────

const COUNT_OPTIONS = [3, 5, 10] as const;
const LEVEL_OPTIONS: Level[] = ["easy", "medium", "hard"];

export function InteractiveQuiz() {
  const t    = useT();
  const lang = useI18nStore((s) => s.lang);
  const recordQuizCompleted = useProgressStore((s) => s.recordInteractiveQuizCompleted);

  const [phase,        setPhase]        = useState<Phase>("setup");
  const [topic,        setTopic]        = useState("");
  const [count,        setCount]        = useState<3 | 5 | 10>(5);
  const [level,        setLevel]        = useState<Level>("medium");
  const [questions,    setQuestions]    = useState<QuizQuestion[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [userAnswers,  setUserAnswers]  = useState<(number | null)[]>([]);
  const [selected,     setSelected]     = useState<number | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const hasKey =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("aula:google-ai-api-key"));

  const generateQuiz = useCallback(async () => {
    const apiKey = localStorage.getItem("aula:google-ai-api-key") ?? "";
    setPhase("loading");
    setError(null);

    const system = lang === "es" ? SYSTEM_ES : SYSTEM_EN;
    const prompt = buildPrompt(topic.trim(), count, level, lang);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await cloudGenerate({
          apiKey,
          systemInstruction: system,
          prompt: attempt === 0 ? prompt : `${prompt}\n\n${lang === "es" ? "RESPONDE SOLO EL JSON." : "REPLY ONLY WITH JSON."}`,
          temperature: attempt === 0 ? 0.7 : 0.2,
          maxOutputTokens: count * 300,
        });

        const parsed = extractJson(raw) as { questions?: unknown[] };
        if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) continue;

        const qs = (parsed.questions as QuizQuestion[]).filter(
          (q) => q.question && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correctAnswer === "number"
        );

        if (qs.length === 0) continue;

        setQuestions(qs);
        setUserAnswers(new Array(qs.length).fill(null) as null[]);
        setCurrentIdx(0);
        setSelected(null);
        setPhase("quiz");
        return;
      } catch (err) {
        if (attempt === 1) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg.includes("401")
            ? (lang === "es" ? "API key inválida. Verifica en Configuración." : "Invalid API key. Check Settings.")
            : (lang === "es" ? "No se pudo generar el quiz. Intenta de nuevo." : "Could not generate quiz. Try again."));
          setPhase("setup");
          return;
        }
      }
    }

    setError(lang === "es" ? "No se pudo generar el quiz. Intenta de nuevo." : "Could not generate quiz. Try again.");
    setPhase("setup");
  }, [topic, count, level, lang]);

  function handleOptionClick(idx: number) {
    if (selected !== null) return; // already answered
    setSelected(idx);
  }

  function handleNext() {
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = selected;
    setUserAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
    } else {
      // Compute score from all answers including current
      const score = newAnswers.filter((a, i) => a === questions[i]!.correctAnswer).length;
      recordQuizCompleted(score, questions.length);
      setUserAnswers(newAnswers);
      setPhase("result");
    }
  }

  function resetToSetup() {
    setPhase("setup");
    setQuestions([]);
    setUserAnswers([]);
    setCurrentIdx(0);
    setSelected(null);
    setError(null);
  }

  // ── No API key ──────────────────────────────────────────────────────────────
  if (!hasKey) {
    return (
      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 flex flex-col items-center gap-4 text-center">
        <span className="text-3xl" aria-hidden="true">🎯</span>
        <p className="text-sm text-aula-ink leading-relaxed max-w-xs">{t("quiz.cloudRequired")}</p>
        <Link
          href="/settings"
          className="rounded-2xl bg-aula-blue text-white text-sm font-semibold px-5 py-2.5 hover:bg-aula-blue/90 transition-all"
        >
          {t("practice.goToSettings")}
        </Link>
      </div>
    );
  }

  // ── Setup ───────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <span className="text-[10px] text-aula-ink-soft bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
            {t("practice.cloudBadge")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-aula-ink" htmlFor="quiz-topic">
            {t("quiz.topic")}
          </label>
          <input
            id="quiz-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("quiz.topicPlaceholder")}
            className="rounded-xl border border-aula-border bg-white px-3 py-2 text-sm text-aula-ink placeholder:text-aula-ink-soft focus:outline-none focus:ring-2 focus:ring-aula-blue"
            onKeyDown={(e) => { if (e.key === "Enter" && topic.trim()) void generateQuiz(); }}
          />
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-aula-ink-soft">{t("quiz.count")}</label>
            <div className="flex gap-1">
              {COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition-all ${
                    count === n
                      ? "bg-aula-blue text-white border-aula-blue"
                      : "bg-white text-aula-ink-soft border-gray-200 hover:border-aula-blue"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-aula-ink-soft">{t("quiz.level")}</label>
            <div className="flex gap-1">
              {LEVEL_OPTIONS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition-all ${
                    level === lv
                      ? "bg-aula-blue text-white border-aula-blue"
                      : "bg-white text-aula-ink-soft border-gray-200 hover:border-aula-blue"
                  }`}
                >
                  {t(`practice.difficulty.${lv}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-aula-red/10 border border-aula-red/20 px-3 py-2">
            <p className="text-xs text-aula-red">{error}</p>
          </div>
        )}

        <button
          onClick={() => { void generateQuiz(); }}
          disabled={!topic.trim()}
          className="rounded-2xl bg-aula-blue text-white font-semibold py-3 hover:bg-aula-blue/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("quiz.start")}
        </button>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="w-8 h-8 rounded-full border-2 border-aula-blue border-t-transparent animate-spin" />
        <p className="text-sm text-aula-ink-soft">{t("quiz.generating")}</p>
      </div>
    );
  }

  // ── Quiz in-progress ────────────────────────────────────────────────────────
  if (phase === "quiz" && questions.length > 0) {
    const q = questions[currentIdx]!;
    const isAnswered = selected !== null;

    return (
      <div className="flex flex-col gap-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-aula-blue rounded-full transition-all"
              style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-aula-ink-soft shrink-0">
            {t("quiz.progress").replace("{n}", String(currentIdx + 1)).replace("{total}", String(questions.length))}
          </span>
        </div>

        {/* Question */}
        <div className="rounded-2xl bg-white border border-aula-border p-4">
          <p className="text-sm font-medium text-aula-ink leading-relaxed">{q.question}</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            let cls = "rounded-xl border px-4 py-3 text-sm text-left font-medium transition-all ";
            if (!isAnswered) {
              cls += "bg-white border-gray-200 text-aula-ink hover:border-aula-blue hover:bg-blue-50 active:scale-[0.98]";
            } else if (i === q.correctAnswer) {
              cls += "bg-aula-green/10 border-aula-green text-aula-green";
            } else if (i === selected) {
              cls += "bg-aula-red/10 border-aula-red text-aula-red";
            } else {
              cls += "bg-gray-50 border-gray-200 text-aula-ink-soft";
            }
            return (
              <button
                key={i}
                onClick={() => handleOptionClick(i)}
                disabled={isAnswered}
                className={cls}
                aria-pressed={selected === i}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Explanation after answering */}
        {isAnswered && q.explanation && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs text-aula-ink leading-relaxed">
              <span className="font-semibold text-aula-blue">💡 </span>
              {q.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {isAnswered && (
          <button
            onClick={handleNext}
            className="rounded-2xl bg-aula-blue text-white font-semibold py-3 hover:bg-aula-blue/90 active:scale-[0.98] transition-all"
          >
            {currentIdx < questions.length - 1 ? t("quiz.next") : t("quiz.finish")}
          </button>
        )}

        <button onClick={resetToSetup} className="text-xs text-aula-ink-soft hover:text-aula-ink text-center transition-colors">
          {t("common.cancel")}
        </button>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (phase === "result") {
    const score = userAnswers.filter((a, i) => a === questions[i]!.correctAnswer).length;
    const pct   = questions.length > 0 ? score / questions.length : 0;

    return (
      <div className="flex flex-col gap-5">
        {/* Score card */}
        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 text-center">
          <div className="text-5xl mb-2">{scoreEmoji(pct)}</div>
          <p className="text-3xl font-bold text-aula-ink">{score}<span className="text-xl text-aula-ink-soft">/{questions.length}</span></p>
          <p className="text-sm text-aula-ink-soft mt-1">{Math.round(pct * 100)}%</p>
          <p className="text-sm font-medium text-aula-ink mt-3">
            {pct >= 0.9
              ? t("quiz.result.excellent")
              : pct >= 0.7
                ? t("quiz.result.good")
                : pct >= 0.5
                  ? t("quiz.result.ok")
                  : t("quiz.result.keep")}
          </p>
        </div>

        {/* Review of wrong answers */}
        {questions.some((q, i) => userAnswers[i] !== q.correctAnswer) && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-aula-ink">{t("quiz.result.review")}</p>
            {questions.map((q, i) => {
              if (userAnswers[i] === q.correctAnswer) return null;
              return (
                <div key={i} className="rounded-2xl bg-aula-red/5 border border-aula-red/20 p-4 flex flex-col gap-2">
                  <p className="text-sm font-medium text-aula-ink">{q.question}</p>
                  <p className="text-xs text-aula-red">
                    {t("quiz.result.yourAnswer")}: {userAnswers[i] !== null ? q.options[userAnswers[i]!] : "—"}
                  </p>
                  <p className="text-xs text-aula-green font-semibold">
                    {t("quiz.result.correct")}: {q.options[q.correctAnswer]}
                  </p>
                  {q.explanation && (
                    <p className="text-xs text-aula-ink-soft leading-relaxed">💡 {q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={resetToSetup}
          className="rounded-2xl bg-aula-blue text-white font-semibold py-3 hover:bg-aula-blue/90 active:scale-[0.98] transition-all"
        >
          {t("quiz.result.retry")}
        </button>
      </div>
    );
  }

  return null;
}
