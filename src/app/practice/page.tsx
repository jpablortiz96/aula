"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { AchievementToast } from "@/components/AchievementToast";
import { InfinitePractice } from "@/components/practice/InfinitePractice";
import { useT } from "@/hooks/useT";

export default function PracticePage() {
  const t = useT();

  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <Header />

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="text-xs text-aula-ink-soft hover:text-aula-ink transition-colors"
          >
            ← {t("nav.chat")}
          </Link>
          <div className="flex-1" />
          <div className="text-right">
            <h1 className="text-lg font-heading font-bold text-aula-ink">{t("practice.title")}</h1>
            <p className="text-xs text-aula-ink-soft">{t("practice.subtitle")}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-aula-surface border border-aula-border p-5">
          <InfinitePractice />
        </div>
      </main>

      <AchievementToast />
    </div>
  );
}
