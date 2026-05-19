"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const router                  = useRouter();
  const t                       = useT();
  const [tab, setTab]           = useState<Tab>("keyboard");
  const [solving, setSolving]   = useState(false);

  const recordWhiteboard        = useProgressStore((s) => s.recordWhiteboardUsed);
  const recordEquationBuilder   = useProgressStore((s) => s.recordEquationBuilderUsed);

  function handleEquationSolve(latex: string, readable: string) {
    recordEquationBuilder();
    const prompt = `Resuelve: $${latex}$ (es decir: ${readable})`;
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

  const proEnabled = tab === "handwriting";
  const apiKeyAvailable = proEnabled && hasApiKey();

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

        {/* Tab toggle */}
        <div className="flex rounded-2xl bg-aula-surface p-1 gap-1" role="tablist">
          <TabBtn
            active={tab === "keyboard"}
            onClick={() => setTab("keyboard")}
            role="tab"
            aria-selected={tab === "keyboard"}
          >
            {t("pizarra.tab.keyboard")}
          </TabBtn>
          <TabBtn
            active={tab === "handwriting"}
            onClick={() => setTab("handwriting")}
            role="tab"
            aria-selected={tab === "handwriting"}
          >
            <span>{t("pizarra.tab.handwriting")}</span>
            <span className="ml-1.5 text-[10px] font-semibold rounded-full bg-aula-yellow/20 text-aula-yellow px-1.5 py-0.5">
              PRO
            </span>
          </TabBtn>
        </div>

        {/* Panel */}
        <div className="flex-1">
          {tab === "keyboard" && (
            <div className="rounded-3xl bg-aula-surface border border-aula-border p-5">
              <h2 className="text-sm font-semibold text-aula-ink mb-4">{t("equationBuilder.title")}</h2>
              <EquationBuilder onSolve={handleEquationSolve} disabled={solving} />
            </div>
          )}

          {tab === "handwriting" && (
            <>
              {/* Pro badge */}
              <div className="flex justify-center mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-aula-yellow/30 bg-aula-yellow/10 text-aula-yellow text-xs font-medium px-3 py-1">
                  {t("pizarra.pro.badge")}
                </span>
              </div>

              {/* No API key state */}
              {!hasApiKey() ? (
                <div className="rounded-3xl bg-aula-surface border border-aula-border p-6 flex flex-col items-center gap-3 text-center">
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

// ─── TabBtn helper ────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: string;
  "aria-selected"?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-sm font-medium transition-all ${
        active
          ? "bg-white text-aula-ink shadow-sm"
          : "text-aula-ink-soft hover:text-aula-ink"
      }`}
    >
      {children}
    </button>
  );
}
