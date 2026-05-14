"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, Trophy } from "lucide-react";
import { ENGINE_DISPLAY } from "@/engines/EngineRegistry";
import type { EngineId } from "@/engines/types";
import { AulaLogo } from "@/components/AulaLogo";
import { useProgressStore, getCurrentLevel, getNextLevel, getLevelProgress } from "@/store/progressStore";

interface HeaderProps {
  resolvedEngineId?: EngineId | null;
  cloudForImage?: boolean;
  onMenuClick?: () => void;
}

export function Header({ resolvedEngineId, cloudForImage, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const xp       = useProgressStore((s) => s.xp);
  const streak   = useProgressStore((s) => s.streak);
  const level    = getCurrentLevel(xp);
  const nextLvl  = getNextLevel(xp);
  const progress = getLevelProgress(xp);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors px-1 py-0.5 rounded focus-visible:outline-2 focus-visible:outline-aula-blue ${
        isActive(href)
          ? "text-aula-blue"
          : "text-aula-ink-soft hover:text-aula-ink"
      }`}
      aria-current={isActive(href) ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0">
      {/* Mobile menu button */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 rounded-lg text-aula-ink-soft hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú de sesiones"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Logo */}
      <Link href="/" aria-label="AULA — inicio">
        <AulaLogo size="md" />
      </Link>

      {/* Engine badge */}
      {resolvedEngineId && (
        <span className="hidden sm:inline-flex text-[11px] font-mono bg-gray-100 border px-1.5 py-0.5 rounded text-gray-500">
          {cloudForImage ? "Cloud Boost · imagen" : ENGINE_DISPLAY[resolvedEngineId]}
        </span>
      )}

      <div className="flex-1" />

      {/* XP + level (md+) */}
      <div className="hidden md:flex flex-col items-end gap-0.5 min-w-[120px]">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold" style={{ color: level.color }}>
            {level.name}
          </span>
          <span className="text-[11px] text-aula-ink-soft">{xp} XP</span>
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
              aria-label={`Progreso al nivel ${nextLvl.name}`}
            />
          </div>
        )}
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div
          className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-2 py-1 rounded-full"
          title={`Racha de ${streak} día${streak !== 1 ? "s" : ""}`}
          aria-label={`Racha: ${streak} día${streak !== 1 ? "s" : ""}`}
        >
          <Flame className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{streak}</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex items-center gap-3" aria-label="Navegación principal">
        {navLink("/chat", "Chat")}
        {navLink("/teacher", "Profesor")}
        <Link
          href="/logros"
          className={`transition-colors p-1 rounded focus-visible:outline-2 focus-visible:outline-aula-blue ${
            isActive("/logros") ? "text-aula-blue" : "text-aula-ink-soft hover:text-aula-ink"
          }`}
          aria-label="Logros"
          title="Logros"
        >
          <Trophy className="w-4 h-4" aria-hidden="true" />
        </Link>
        {navLink("/settings", "Config")}
      </nav>
    </header>
  );
}
