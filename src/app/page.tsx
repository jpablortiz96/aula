"use client";

import Link from "next/link";
import { AulaLogo } from "@/components/AulaLogo";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";

export default function Home() {
  const t    = useT();
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);

  const FEATURES = [
    { icon: "📸", titleKey: "landing.feature.photos.title",   descKey: "landing.feature.photos.desc" },
    { icon: "🎤", titleKey: "landing.feature.voice.title",    descKey: "landing.feature.voice.desc" },
    { icon: "📚", titleKey: "landing.feature.sessions.title", descKey: "landing.feature.sessions.desc" },
    { icon: "👩‍🏫", titleKey: "landing.feature.teacher.title", descKey: "landing.feature.teacher.desc" },
  ];

  const PILLARS = [
    { emoji: "🌐", labelKey: "landing.pillar.noInternet",   subKey: "landing.pillar.noInternet.sub" },
    { emoji: "🔒", labelKey: "landing.pillar.noAccount",    subKey: "landing.pillar.noAccount.sub" },
    { emoji: "⚡", labelKey: "landing.pillar.noServer",     subKey: "landing.pillar.noServer.sub" },
  ];

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

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-aula-blue px-8 py-3.5 text-white font-semibold text-base hover:bg-aula-blue-dark transition-colors shadow-md shadow-blue-200 focus-visible:outline-2 focus-visible:outline-aula-blue"
          >
            {t("landing.cta")}
          </Link>

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

        <section className="w-full max-w-2xl px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.titleKey}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-3xl">{f.icon}</span>
              <p className="font-heading font-bold text-aula-ink">{t(f.titleKey)}</p>
              <p className="text-sm text-aula-ink-soft leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="text-center text-xs text-aula-ink-soft py-4 border-t bg-white">
        {t("landing.footer")}
      </footer>
    </div>
  );
}
