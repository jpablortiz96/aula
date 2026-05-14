"use client";

import { Header } from "@/components/Header";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useProgressStore, getCurrentLevel, getNextLevel, getLevelProgress, LEVELS } from "@/store/progressStore";
import { useT } from "@/hooks/useT";

const LEVEL_KEYS = ["apprentice", "explorer", "scholar", "sage"] as const;

export default function LogrosPage() {
  const t                    = useT();
  const xp                   = useProgressStore((s) => s.xp);
  const streak               = useProgressStore((s) => s.streak);
  const totalQuestions       = useProgressStore((s) => s.totalQuestions);
  const totalSessions        = useProgressStore((s) => s.totalSessions);
  const unlockedAchievements = useProgressStore((s) => s.unlockedAchievements);

  const level    = getCurrentLevel(xp);
  const nextLvl  = getNextLevel(xp);
  const progress = getLevelProgress(xp);

  const levelKey = LEVEL_KEYS[LEVELS.findIndex((l) => l.name === level.name)] ?? "apprentice";

  return (
    <div className="flex flex-col min-h-screen bg-aula-bg">
      <Header />

      <main className="max-w-xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-aula-ink">{t("logros.title")}</h1>
          <p className="text-sm text-aula-ink-soft mt-1">{t("logros.subtitle")}</p>
        </div>

        {/* XP card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-aula-ink-soft uppercase tracking-widest">{t("logros.level")}</p>
              <p className="text-2xl font-heading font-extrabold mt-0.5" style={{ color: level.color }}>
                {t(`level.${levelKey}`)}
              </p>
            </div>
            <p className="text-3xl font-heading font-extrabold text-aula-ink">
              {xp} <span className="text-lg text-aula-ink-soft font-semibold">{t("logros.xp")}</span>
            </p>
          </div>

          {nextLvl ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-aula-ink-soft">
                <span>{t("logros.progress", { next: nextLvl.name })}</span>
                <span>{t("logros.xpToNext", { xp: nextLvl.minXp - xp })}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="xp-bar-fill h-full"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-aula-yellow font-semibold">{t("logros.maxLevel")}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("logros.streak"),    value: streak,         unit: streak === 1 ? t("logros.day") : t("logros.days"), emoji: "🔥" },
            { label: t("logros.questions"), value: totalQuestions, unit: "", emoji: "💬" },
            { label: t("logros.sessions"),  value: totalSessions,  unit: "", emoji: "📚" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl">{s.emoji}</p>
              <p className="text-xl font-heading font-extrabold text-aula-ink mt-1">{s.value}</p>
              <p className="text-xs text-aula-ink-soft">{s.label}{s.unit ? ` (${s.unit})` : ""}</p>
            </div>
          ))}
        </div>

        {/* Levels reference */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <p className="text-xs font-bold text-aula-ink-soft uppercase tracking-widest">{t("logros.levels")}</p>
          <div className="space-y-2">
            {LEVELS.map((l, idx) => (
              <div key={l.name} className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${xp >= l.minXp ? "opacity-100" : "opacity-30"}`}
                  style={{ backgroundColor: l.color }}
                />
                <span
                  className={`text-sm font-semibold ${xp >= l.minXp ? "" : "text-gray-300"}`}
                  style={xp >= l.minXp ? { color: l.color } : {}}
                >
                  {t(`level.${LEVEL_KEYS[idx]}`)}
                </span>
                <span className="text-xs text-aula-ink-soft ml-auto">{l.minXp} {t("logros.xp")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-aula-ink-soft uppercase tracking-widest">
            {t("logros.achievementsCount", { n: unlockedAchievements.length, total: ACHIEVEMENTS.length })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const unlocked  = unlockedAchievements.includes(a.id);
              const titleKey  = `achievement.${a.id}.title`;
              const descKey   = `achievement.${a.id}.desc`;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                    unlocked ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-gray-100 opacity-50"
                  }`}
                >
                  <span className={`text-3xl ${unlocked ? "" : "grayscale"}`} aria-hidden="true">{a.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${unlocked ? "text-aula-ink" : "text-gray-400"}`}>
                      {t(titleKey, { }) || a.title}
                    </p>
                    <p className="text-xs text-aula-ink-soft truncate">{t(descKey, { }) || a.description}</p>
                    <p className={`text-xs font-bold mt-0.5 ${unlocked ? "text-aula-green" : "text-gray-300"}`}>
                      +{a.xpReward} {t("logros.xp")}
                    </p>
                  </div>
                  {unlocked && (
                    <span className="ml-auto shrink-0 text-aula-green text-lg" aria-label={t("logros.unlocked")}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
