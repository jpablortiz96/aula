"use client";

import Link from "next/link";
import { AulaLogo } from "@/components/AulaLogo";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";

export default function Home() {
  const t    = useT();
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);

  const PILLARS = [
    { emoji: "🌐", labelKey: "landing.pillar.noInternet",   subKey: "landing.pillar.noInternet.sub" },
    { emoji: "🔒", labelKey: "landing.pillar.noAccount",    subKey: "landing.pillar.noAccount.sub" },
    { emoji: "⚡", labelKey: "landing.pillar.noServer",     subKey: "landing.pillar.noServer.sub" },
  ];

  const OFFLINE_ITEMS = [
    "landing.offline.item1",
    "landing.offline.item2",
    "landing.offline.item3",
    "landing.offline.item4",
    "landing.offline.item5",
    "landing.offline.item6",
  ] as const;

  const CLOUD_ITEMS = [
    "landing.cloud.item1",
    "landing.cloud.item2",
    "landing.cloud.item3",
    "landing.cloud.item4",
    "landing.cloud.item5",
    "landing.cloud.item6",
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b">
        <AulaLogo size="md" />
        <nav className="flex items-center gap-4 text-sm font-medium text-aula-ink-soft">
          <Link href="/teacher" className="hover:text-aula-ink transition-colors">{t("nav.teacher")}</Link>
          <Link href="/logros"  className="hover:text-aula-ink transition-colors">{t("nav.logros")}</Link>
          <Link href="/settings" className="hover:text-aula-ink transition-colors">{t("nav.settings")}</Link>
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Switch language"
          >
            {lang === "es" ? "EN" : "ES"}
          </button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero */}
        <section className="w-full max-w-2xl px-6 pt-16 pb-10 text-center space-y-6">
          <div className="space-y-3">
            <AulaLogo size="lg" />
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-aula-ink leading-snug">
              {t("landing.tagline")}
            </h2>
            <p className="text-aula-ink-soft text-base max-w-md mx-auto">
              {t("landing.subtitle")}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-aula-blue px-8 py-3.5 text-white font-semibold text-base hover:bg-aula-blue-dark transition-colors shadow-md shadow-blue-200 focus-visible:outline-2 focus-visible:outline-aula-blue"
            >
              {t("landing.cta")}
            </Link>
            <Link
              href="/teacher"
              className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-7 py-3.5 text-aula-ink font-semibold text-base hover:bg-gray-50 transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-aula-blue"
            >
              {t("landing.ctaTeacher")}
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 flex-wrap pt-2">
            {PILLARS.map((p) => (
              <div key={p.labelKey} className="flex items-center gap-1.5 text-sm text-aula-ink-soft">
                <span>{p.emoji}</span>
                <span className="font-semibold text-aula-ink">{t(p.labelKey)}</span>
                <span className="hidden sm:inline">— {t(p.subKey)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How AULA works — two columns */}
        <section className="w-full max-w-4xl px-6 pb-12">
          <h3 className="text-xl font-heading font-bold text-aula-ink text-center mb-6">
            {t("landing.how.title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Offline column */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3">
              <p className="font-heading font-bold text-aula-ink">{t("landing.offline.title")}</p>
              <p className="text-sm text-aula-ink-soft leading-relaxed">{t("landing.offline.desc")}</p>
              <ul className="space-y-1.5">
                {OFFLINE_ITEMS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-aula-ink">
                    <span className="mt-0.5 text-green-500 shrink-0">✓</span>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cloud column */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3">
              <p className="font-heading font-bold text-aula-ink">{t("landing.cloud.title")}</p>
              <p className="text-sm text-aula-ink-soft leading-relaxed">{t("landing.cloud.desc")}</p>
              <ul className="space-y-1.5">
                {CLOUD_ITEMS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-aula-ink">
                    <span className="mt-0.5 text-blue-400 shrink-0">+</span>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Privacy note */}
          <p className="mt-5 text-center text-xs text-aula-ink-soft max-w-xl mx-auto leading-relaxed">
            {t("landing.privacy")}
          </p>
        </section>
      </main>

      <footer className="text-center text-xs text-aula-ink-soft py-4 border-t bg-white">
        {t("landing.footer")}
      </footer>
    </div>
  );
}
