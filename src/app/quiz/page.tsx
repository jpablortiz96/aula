"use client";

import { Header } from "@/components/Header";
import { InteractiveQuiz } from "@/components/quiz/InteractiveQuiz";
import { useT } from "@/hooks/useT";

export default function QuizPage() {
  const t = useT();
  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <Header />
      <div className="max-w-xl mx-auto w-full p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-heading font-bold text-aula-ink">{t("quiz.title")}</h1>
          <p className="text-sm text-aula-ink-soft">{t("quiz.subtitle")}</p>
        </div>
        <InteractiveQuiz />
      </div>
    </div>
  );
}
