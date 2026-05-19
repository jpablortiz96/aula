"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Keyboard, PenLine } from "lucide-react";
import { Header } from "@/components/Header";
import { AchievementToast } from "@/components/AchievementToast";
import { DigitalWhiteboard } from "@/components/pizarra/DigitalWhiteboard";
import { EquationBuilder } from "@/components/pizarra/EquationBuilder";
import { useProgressStore } from "@/store/progressStore";
import { useT } from "@/hooks/useT";

type Tab = "keyboard" | "handwriting";

const API_KEY_KEY = "aula:google-ai-api-key";

function hasApiKey(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(API_KEY_KEY));
}

export default function PizarraPage() {
  const router = useRouter();
  const t      = useT();
  const [tab, setTab] = useState<Tab>("keyboard");

  const recordWhiteboard      = useProgressStore((s) => s.recordWhiteboardUsed);
  const recordEquationBuilder = useProgressStore((s) => s.recordEquationBuilderUsed);

  function handleEquationSolve(latex: string, readable: string) {
    recordEquationBuilder();
    const prompt  = `Resuelve: $${latex}$ (es decir: ${readable})`;
    const encoded = encodeURIComponent(prompt);
    router.push(`/chat?wb=${encoded}`);
  }

  function handleWhiteboardSolve(text: string) {
    recordWhiteboard();
    const encoded = encodeURIComponent(text);
    router.push(`/chat?wb=${encoded}`);
  }

  function handleCloudBoost(dataUrl: string) {
    sessionStorage.setItem("aula:wb-image", dataUrl);
    router.push("/chat?wb-cloud=1");
  }

  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <Header />

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-3xl mx-auto w-full">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="text-xs text-aula-ink-soft hover:text-aula-ink transition-colors"
          >
            {t("pizarra.back")}
          </Link>
          <div className="flex-1" />
          <div className="text-right">
            <h1 className="text-lg font-heading font-bold text-aula-ink">{t("pizarra.title")}</h1>
            <p className="text-xs text-aula-ink-soft">{t("pizarra.subtitle")}</p>
          </div>
        </div>

        {/* Tab toggle — visible pill selector */}
        <div
          className="flex rounded-2xl bg-gray-100 border border-gray-200 p-1 gap-1"
          role="tablist"
          aria-label={t("pizarra.title")}
        >
          <TabBtn
            active={tab === "keyboard"}
            onClick={() => setTab("keyboard")}
            aria-selected={tab === "keyboard"}
          >
            <Keyboard className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t("pizarra.tab.keyboard")}</span>
          </TabBtn>

          <TabBtn
            active={tab === "handwriting"}
            onClick={() => setTab("handwriting")}
            aria-selected={tab === "handwriting"}
          >
            <PenLine className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t("pizarra.tab.handwriting")}</span>
            <span className="ml-1 text-[10px] font-bold rounded-full bg-aula-yellow px-1.5 py-0.5 text-white shrink-0">
              PRO
            </span>
          </TabBtn>
        </div>

        {/* Panel */}
        <div className="flex-1">
          {tab === "keyboard" && (
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-aula-ink mb-4">{t("equationBuilder.title")}</h2>
              <EquationBuilder onSolve={handleEquationSolve} />
            </div>
          )}

          {tab === "handwriting" && (
            <>
              {/* Pro badge */}
              <div className="flex justify-center mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-aula-yellow/40 bg-aula-yellow/10 text-aula-yellow text-xs font-semibold px-3 py-1">
                  {t("pizarra.pro.badge")}
                </span>
              </div>

              {!hasApiKey() ? (
                <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-aula-ink">{t("pizarra.pro.noKey")}</p>
                  <Link
                    href="/settings"
                    className="text-sm font-semibold text-aula-blue hover:underline"
                  >
                    {t("pizarra.pro.noKeyLink")}
                  </Link>
                  <p className="text-xs text-aula-ink-soft mt-1">{t("pizarra.pro.useKeyboard")}</p>
                  <button
                    onClick={() => setTab("keyboard")}
                    className="mt-2 rounded-xl bg-aula-blue text-white text-sm font-semibold px-4 py-2 hover:bg-aula-blue/90 active:scale-95 transition-all"
                  >
                    {t("pizarra.tab.keyboard")}
                  </button>
                </div>
              ) : (
                <div className="min-h-[500px]">
                  <DigitalWhiteboard
                    onSolve={handleWhiteboardSolve}
                    onCloudBoost={handleCloudBoost}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <AchievementToast />
    </div>
  );
}

// ─── TabBtn ───────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
  "aria-selected": ariaSelected,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  "aria-selected"?: boolean;
}) {
  return (
    <button
      role="tab"
      aria-selected={ariaSelected}
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-sm font-medium transition-all ${
        active
          ? "bg-white text-aula-blue shadow-sm border border-blue-100"
          : "text-gray-500 hover:text-gray-800 hover:bg-white/50"
      }`}
    >
      {children}
    </button>
  );
}
