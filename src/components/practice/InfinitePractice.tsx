"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";
import { useProgressStore } from "@/store/progressStore";
import {
  generateExercise,
  answersMatch,
  analyzeConceptualError,
  type Exercise,
  type Difficulty,
} from "@/lib/practice/generateExercise";
import { getActiveEngine } from "@/engines/engineSingleton";

// ─── Adaptive difficulty ──────────────────────────────────────────────────────

function nextDifficulty(current: Difficulty, consecutiveCorrect: number, consecutiveWrong: number): Difficulty {
  if (consecutiveCorrect >= 3 && current !== "hard") {
    return current === "easy" ? "medium" : "hard";
  }
  if (consecutiveWrong >= 2 && current !== "easy") {
    return current === "hard" ? "medium" : "easy";
  }
  return current;
}

// ─── Phase type ───────────────────────────────────────────────────────────────

type Phase = "setup" | "loading" | "question" | "result";

// ─── Component ────────────────────────────────────────────────────────────────

export function InfinitePractice() {
  const t    = useT();
  const lang = useI18nStore((s) => s.lang);

  const recordPractice = useProgressStore((s) => s.recordPracticeExercise);

  const [topic,              setTopic]              = useState("");
  const [phase,              setPhase]              = useState<Phase>("setup");
  const [exercise,           setExercise]           = useState<Exercise | null>(null);
  const [userAnswer,         setUserAnswer]         = useState("");
  const [isCorrect,          setIsCorrect]          = useState<boolean | null>(null);
  const [error,              setError]              = useState<string | null>(null);

  const [difficulty,         setDifficulty]         = useState<Difficulty>("easy");
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong,   setConsecutiveWrong]   = useState(0);
  const [sessionStreak,      setSessionStreak]      = useState(0);
  const [exerciseNumber,     setExerciseNumber]     = useState(0);

  // B3: error detector
  const [errorAnalysis,      setErrorAnalysis]      = useState<string | null>(null);
  const [analyzingError,     setAnalyzingError]     = useState(false);
  const [showErrorDetector,  setShowErrorDetector]  = useState(false);

  const answerRef = useRef<HTMLTextAreaElement>(null);

  const handleAnalyzeError = useCallback(async () => {
    if (!exercise || !userAnswer) return;
    setAnalyzingError(true);
    try {
      const feedback = await analyzeConceptualError(
        exercise.question,
        exercise.answer,
        userAnswer,
        lang,
      );
      setErrorAnalysis(feedback);
    } catch {
      setErrorAnalysis(lang === "es" ? "No se pudo analizar el error." : "Could not analyze the error.");
    } finally {
      setAnalyzingError(false);
    }
  }, [exercise, userAnswer, lang]);

  const fetchExercise = useCallback(async (
    currentTopic: string,
    currentDifficulty: Difficulty,
  ) => {
    setPhase("loading");
    setError(null);
    setUserAnswer("");
    setIsCorrect(null);
    setErrorAnalysis(null);
    setShowErrorDetector(false);

    try {
      const ex = await generateExercise(currentTopic, currentDifficulty, lang);
      setExercise(ex);
      setPhase("question");
      setTimeout(() => answerRef.current?.focus(), 100);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      // Show friendly message — never show raw stack or technical noise
      const friendly =
        raw.includes("No AI engine") || raw.includes("API key")
          ? (lang === "es"
              ? "Necesitas el modelo cargado o una API key para practicar."
              : "You need the model loaded or an API key to practice.")
          : raw;
      setError(friendly);
      setPhase("setup");
    }
  }, [lang]);

  const handleStart = useCallback(() => {
    if (!topic.trim()) return;
    setExerciseNumber(0);
    setSessionStreak(0);
    setConsecutiveCorrect(0);
    setConsecutiveWrong(0);
    setDifficulty("easy");
    void fetchExercise(topic.trim(), "easy");
  }, [topic, fetchExercise]);

  const handleCheck = useCallback(() => {
    if (!exercise || !userAnswer.trim()) return;

    const correct = answersMatch(userAnswer, exercise.answer);
    setIsCorrect(correct);
    setPhase("result");

    recordPractice();
    setExerciseNumber((n) => n + 1);

    if (correct) {
      setSessionStreak((s) => s + 1);
      const newConsec = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsec);
      setConsecutiveWrong(0);
      const newDiff = nextDifficulty(difficulty, newConsec, 0);
      setDifficulty(newDiff);
    } else {
      setSessionStreak(0);
      setConsecutiveCorrect(0);
      const newConsec = consecutiveWrong + 1;
      setConsecutiveWrong(newConsec);
      const newDiff = nextDifficulty(difficulty, 0, newConsec);
      setDifficulty(newDiff);
      setShowErrorDetector(true);
    }
  }, [exercise, userAnswer, consecutiveCorrect, consecutiveWrong, difficulty, recordPractice]);

  const handleNext = useCallback(() => {
    void fetchExercise(topic.trim(), difficulty);
  }, [topic, difficulty, fetchExercise]);

  const canGenerate =
    typeof window !== "undefined" &&
    (getActiveEngine() !== null ||
      Boolean(localStorage.getItem("aula:google-ai-api-key")));

  if (!canGenerate) {
    return (
      <div className="rounded-3xl bg-aula-surface border border-aula-border p-6 text-center">
        <p className="text-sm text-aula-ink">{t("practice.noApiKey")}</p>
      </div>
    );
  }

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-aula-ink" htmlFor="practice-topic">
            {t("practice.topic")}
          </label>
          <input
            id="practice-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t("practice.topicPlaceholder")}
            className="rounded-xl border border-aula-border bg-white px-3 py-2 text-sm text-aula-ink placeholder:text-aula-ink-soft focus:outline-none focus:ring-2 focus:ring-aula-blue"
            onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-aula-red/10 border border-aula-red/20 px-3 py-2.5 flex items-start justify-between gap-3">
            <p className="text-xs text-aula-red leading-relaxed">{error}</p>
            {topic.trim() && (
              <button
                onClick={handleStart}
                className="text-xs font-semibold text-aula-red underline shrink-0"
              >
                {t("common.retry")}
              </button>
            )}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!topic.trim()}
          className="rounded-2xl bg-aula-blue text-white font-semibold py-3 hover:bg-aula-blue/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("practice.start")}
        </button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="w-8 h-8 rounded-full border-2 border-aula-blue border-t-transparent animate-spin" />
        <p className="text-sm text-aula-ink-soft">{t("practice.generating")}</p>
      </div>
    );
  }

  if (!exercise) return null;

  // ── Question / Result ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header row: exercise #, streak, difficulty */}
      <div className="flex items-center justify-between text-xs text-aula-ink-soft">
        <span>{t("practice.session").replace("{n}", String(exerciseNumber + 1))}</span>
        <div className="flex items-center gap-3">
          {sessionStreak > 1 && (
            <span className="text-aula-yellow font-semibold">
              {t("practice.streak").replace("{n}", String(sessionStreak))} 🔥
            </span>
          )}
          <DifficultyBadge difficulty={difficulty} t={t} />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl bg-white border border-aula-border p-4">
        <p className="text-sm font-medium text-aula-ink leading-relaxed">{exercise.question}</p>
      </div>

      {/* Answer input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-aula-ink-soft" htmlFor="practice-answer">
          {t("practice.answer")}
        </label>
        <textarea
          ref={answerRef}
          id="practice-answer"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder={t("practice.answerPlaceholder")}
          disabled={phase === "result"}
          rows={2}
          className="rounded-xl border border-aula-border bg-white px-3 py-2 text-sm text-aula-ink placeholder:text-aula-ink-soft focus:outline-none focus:ring-2 focus:ring-aula-blue resize-none disabled:opacity-70"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && phase === "question") {
              e.preventDefault();
              handleCheck();
            }
          }}
        />
      </div>

      {/* Result feedback */}
      {phase === "result" && isCorrect !== null && (
        <div
          className={`rounded-2xl p-4 flex flex-col gap-2 ${
            isCorrect ? "bg-aula-green/10 border border-aula-green/30" : "bg-aula-red/10 border border-aula-red/20"
          }`}
        >
          <p className={`text-sm font-semibold ${isCorrect ? "text-aula-green" : "text-aula-red"}`}>
            {isCorrect ? t("practice.correct") : t("practice.incorrect")}
          </p>
          {!isCorrect && (
            <p className="text-xs text-aula-ink">
              {t("practice.correctAnswer").replace("{answer}", exercise.answer)}
            </p>
          )}
          {exercise.explanation && (
            <p className="text-xs text-aula-ink-soft">
              <span className="font-medium">{t("practice.explanation")}</span>{" "}
              {exercise.explanation}
            </p>
          )}
        </div>
      )}

      {/* B3: Error detector card */}
      {phase === "result" && !isCorrect && showErrorDetector && (
        <div className="rounded-2xl bg-aula-yellow/10 border border-aula-yellow/30 p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-aula-ink">{t("errorDetector.title")}</p>
          <p className="text-xs text-aula-ink-soft">{t("errorDetector.desc")}</p>

          {!errorAnalysis && !analyzingError && (
            <div className="flex gap-2">
              <button
                onClick={() => { void handleAnalyzeError(); }}
                className="text-xs font-semibold text-aula-blue hover:underline"
              >
                {t("errorDetector.analyze")}
              </button>
              <button
                onClick={() => setShowErrorDetector(false)}
                className="text-xs text-aula-ink-soft hover:text-aula-ink"
              >
                {t("errorDetector.skip")}
              </button>
            </div>
          )}

          {analyzingError && (
            <div className="flex items-center gap-2 text-xs text-aula-ink-soft">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("practice.generating")}
            </div>
          )}

          {errorAnalysis && (
            <p className="text-xs text-aula-ink leading-relaxed">{errorAnalysis}</p>
          )}
        </div>
      )}

      {/* Action button */}
      {phase === "question" ? (
        <button
          onClick={handleCheck}
          disabled={!userAnswer.trim()}
          className="rounded-2xl bg-aula-blue text-white font-semibold py-3 hover:bg-aula-blue/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("practice.check")}
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="rounded-2xl bg-aula-green text-white font-semibold py-3 hover:bg-aula-green/90 active:scale-[0.98] transition-all"
        >
          {t("practice.next")}
        </button>
      )}

      {/* Back to setup */}
      <button
        onClick={() => { setPhase("setup"); setExercise(null); }}
        className="text-xs text-aula-ink-soft hover:text-aula-ink text-center transition-colors"
      >
        {t("common.cancel")}
      </button>
    </div>
  );
}

// ─── DifficultyBadge ──────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty, t }: { difficulty: Difficulty; t: (k: string) => string }) {
  const colors: Record<Difficulty, string> = {
    easy:   "bg-aula-green/10 text-aula-green",
    medium: "bg-aula-yellow/10 text-aula-yellow",
    hard:   "bg-aula-red/10 text-aula-red",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[difficulty]}`}>
      {t(`practice.difficulty.${difficulty}`)}
    </span>
  );
}
