"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AchievementToast } from "@/components/AchievementToast";
import { DigitalWhiteboard } from "@/components/pizarra/DigitalWhiteboard";
import { useProgressStore } from "@/store/progressStore";
import { useT } from "@/hooks/useT";

export default function PizarraPage() {
  const router             = useRouter();
  const t                  = useT();
  const recordWhiteboard   = useProgressStore((s) => s.recordWhiteboardUsed);

  function handleSolve(text: string) {
    recordWhiteboard();
    const encoded = encodeURIComponent(text);
    router.push(`/chat?wb=${encoded}`);
  }

  function handleCloudBoost(dataUrl: string) {
    // Store image in sessionStorage, navigate to chat where it'll be picked up
    sessionStorage.setItem("aula:wb-image", dataUrl);
    router.push("/chat?wb-cloud=1");
  }

  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <Header />

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="text-xs text-aula-ink-soft hover:text-aula-ink transition-colors"
          >
            {t("pizarra.back")}
          </Link>
          <div className="flex-1" />
          <div>
            <h1 className="text-lg font-heading font-bold text-aula-ink">{t("pizarra.title")}</h1>
            <p className="text-xs text-aula-ink-soft">{t("pizarra.subtitle")}</p>
          </div>
        </div>

        <div className="flex-1 min-h-[500px]">
          <DigitalWhiteboard
            onSolve={handleSolve}
            onCloudBoost={handleCloudBoost}
          />
        </div>
      </main>

      <AchievementToast />
    </div>
  );
}
