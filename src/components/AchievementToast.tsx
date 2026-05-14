"use client";

import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS_BY_ID } from "@/lib/achievements";
import { useProgressStore } from "@/store/progressStore";
import { useT } from "@/hooks/useT";

export function AchievementToast() {
  const t                    = useT();
  const pendingId            = useProgressStore((s) => s.pendingAchievement);
  const consume              = useProgressStore((s) => s.consumePendingAchievement);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const timerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pendingId) return;
    consume();
    setCurrent(pendingId);
    setExiting(false);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setExiting(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setCurrent(null);
      }, 280);
    }, 3500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  if (!visible || !current) return null;

  const achievement = ACHIEVEMENTS_BY_ID[current];
  if (!achievement) return null;

  const titleKey = `achievement.${achievement.id}.title`;
  const descKey  = `achievement.${achievement.id}.desc`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-xl px-4 py-3 max-w-xs ${
        exiting ? "aula-toast-exit" : "aula-toast-enter"
      }`}
    >
      <span className="text-2xl shrink-0" aria-hidden="true">{achievement.icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-aula-ink">{t("toast.achievementUnlocked")}</p>
        <p className="text-sm font-bold text-aula-blue truncate">{t(titleKey) || achievement.title}</p>
        <p className="text-xs text-aula-ink-soft truncate">{t(descKey) || achievement.description}</p>
      </div>
      <span className="shrink-0 text-xs font-bold text-aula-green">+{achievement.xpReward} XP</span>
    </div>
  );
}
