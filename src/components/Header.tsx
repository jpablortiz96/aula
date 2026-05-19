"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, Trophy } from "lucide-react";
import { ENGINE_DISPLAY } from "@/engines/EngineRegistry";
import type { EngineId } from "@/engines/types";
import { AulaLogo } from "@/components/AulaLogo";
import { useProgressStore, getCurrentLevel, getNextLevel, getLevelProgress } from "@/store/progressStore";
import { useI18nStore } from "@/store/i18nStore";
import { useT } from "@/hooks/useT";

interface HeaderProps {
  resolvedEngineId?: EngineId | null;
  cloudForImage?: boolean;
  onMenuClick?: () => void;
}

export function Header({ resolvedEngineId, cloudForImage, onMenuClick }: HeaderProps) {
  const t        = useT();
  const pathname = usePathname();
  const xp       = useProgressStore((s) => s.xp);
  const streak   = useProgressStore((s) => s.streak);
  const { lang, setLang } = useI18nStore();
  const level    = getCurrentLevel(xp);
  const nextLvl  = getNextLevel(xp);
  const progress = getLevelProgress(xp);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navLink = (href: string, labelKey: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors px-1 py-0.5 rounded focus-visible:outline-2 focus-visible:outline-aula-blue ${
        isActive(href) ? "text-aula-blue" : "text-aula-ink-soft hover:text-aula-ink"
      }`}
      aria-current={isActive(href) ? "page" : undefined}
    >
      {t(labelKey)}
    </Link>
  );

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 rounded-lg text-aula-ink-soft hover:bg-gray-100 transition-colors"
          aria-label={t("header.menuLabel")}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <Link href="/" aria-label={t("header.logoLabel")}>
        <AulaLogo size="md" />
      </Link>

      {resolvedEngineId && (
        <span className="hidden sm:inline-flex text-[11px] font-mono bg-gray-100 border px-1.5 py-0.5 rounded text-gray-500">
          {cloudForImage ? "Cloud Boost · imagen" : ENGINE_DISPLAY[resolvedEngineId]}
        </span>
      )}

      <div className="flex-1" />

      {/* XP bar (md+) */}
      <div className="hidden md:flex flex-col items-end gap-0.5 min-w-[120px]">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold" style={{ color: level.color }}>
            {t(`level.${level.name === "Aprendiz" ? "apprentice" : level.name === "Explorador" ? "explorer" : level.name === "Erudito" ? "scholar" : "sage"}`)}
          </span>
          <span className="text-[11px] text-aula-ink-soft">{xp} {t("logros.xp")}</span>
        </div>
        {nextLvl && (
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="xp-bar-fill h-full"
              style={{ width: `${Math.round(progress * 100)}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div
          className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-2 py-1 rounded-full"
          aria-label={`${streak} ${streak === 1 ? t("logros.day") : t("logros.days")}`}
        >
          <Flame className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{streak}</span>
        </div>
      )}

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === "es" ? "en" : "es")}
        className="text-xs font-bold px-1.5 py-0.5 rounded-md border border-gray-200 text-aula-ink-soft hover:bg-gray-50 transition-colors hidden sm:block"
        aria-label="Switch language"
      >
        {lang === "es" ? "EN" : "ES"}
      </button>

      {/* Nav */}
      <nav className="flex items-center gap-2" aria-label="Navegación principal">
        {navLink("/chat",     "nav.chat")}
        {navLink("/practice", "nav.practice")}
        {navLink("/teacher",  "nav.teacher")}
        <Link
          href="/logros"
          className={`transition-colors p-1 rounded focus-visible:outline-2 focus-visible:outline-aula-blue ${
            isActive("/logros") ? "text-aula-blue" : "text-aula-ink-soft hover:text-aula-ink"
          }`}
          aria-label={t("nav.logros")}
          title={t("nav.logros")}
        >
          <Trophy className="w-4 h-4" aria-hidden="true" />
        </Link>
        {navLink("/settings", "nav.settings")}
      </nav>
    </header>
  );
}
