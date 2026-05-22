"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, PenLine } from "lucide-react";
import { Header } from "@/components/Header";
import { AchievementToast } from "@/components/AchievementToast";
import { DigitalWhiteboard } from "@/components/pizarra/DigitalWhiteboard";
import { ScientificCalculator } from "@/components/pizarra/ScientificCalculator";
import { useProgressStore } from "@/store/progressStore";
import { useT } from "@/hooks/useT";
import { useRouter } from "next/navigation";

type Tab = "calculator" | "handwriting";


export default function PizarraPage() {
  const router = useRouter();
  const t      = useT();
  const [tab, setTab] = useState<Tab>("calculator");

  const recordWhiteboard = useProgressStore((s) => s.recordWhiteboardUsed);

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
            active={tab === "calculator"}
            onClick={() => setTab("calculator")}
            aria-selected={tab === "calculator"}
          >
            <Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t("pizarra.tab.calculator")}</span>
          </TabBtn>

          <TabBtn
            active={tab === "handwriting"}
            onClick={() => setTab("handwriting")}
            aria-selected={tab === "handwriting"}
          >
            <PenLine className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t("pizarra.tab.handwriting")}</span>
            <span className="ml-1 text-[9px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 shrink-0 whitespace-nowrap">
              🌐 {t("pizarra.tab.internet")}
            </span>
          </TabBtn>
        </div>

        {/* Panel */}
        <div className="flex-1">
          {tab === "calculator" && (
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-aula-ink mb-4">{t("calculator.title")}</h2>
              <ScientificCalculator />
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

              <DigitalWhiteboard
                onSolve={handleWhiteboardSolve}
                onCloudBoost={handleCloudBoost}
              />
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
