import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Levels ──────────────────────────────────────────────────────────────────

export interface Level {
  name:    string;
  minXp:   number;
  color:   string;
}

export const LEVELS: Level[] = [
  { name: "Aprendiz",   minXp: 0,   color: "#5F6368" },
  { name: "Explorador", minXp: 100, color: "#4285F4" },
  { name: "Erudito",    minXp: 300, color: "#34A853" },
  { name: "Sabio",      minXp: 600, color: "#FBBC04" },
];

export function getCurrentLevel(xp: number): Level {
  let level = LEVELS[0]!;
  for (const l of LEVELS) {
    if (xp >= l.minXp) level = l;
  }
  return level;
}

export function getNextLevel(xp: number): Level | null {
  for (const l of LEVELS) {
    if (xp < l.minXp) return l;
  }
  return null;
}

export function getLevelProgress(xp: number): number {
  const current = getCurrentLevel(xp);
  const next    = getNextLevel(xp);
  if (!next) return 1;
  const range = next.minXp - current.minXp;
  const earned = xp - current.minXp;
  return Math.min(1, earned / range);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const XP_PER_QUESTION = 10;
const XP_PER_SESSION  = 5;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── State ───────────────────────────────────────────────────────────────────

interface ProgressState {
  streak:               number;
  lastUsedDate:         string | null;
  totalSessions:        number;
  totalQuestions:       number;
  xp:                   number;
  unlockedAchievements: string[];
  hasUsedCamera:        boolean;
  hasUsedVoice:         boolean;
  hasGeneratedQuiz:     boolean;

  // Pending achievement to show as toast (consumed by AchievementToast)
  pendingAchievement: string | null;
  consumePendingAchievement: () => void;

  // Actions
  startSession:       () => void;
  addQuestion:        () => void;
  addXP:              (amount: number) => void;
  unlockAchievement:  (id: string) => void;
  recordCameraUsed:   () => void;
  recordVoiceUsed:    () => void;
  recordQuizGenerated:() => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      streak:               0,
      lastUsedDate:         null,
      totalSessions:        0,
      totalQuestions:       0,
      xp:                   0,
      unlockedAchievements: [],
      hasUsedCamera:        false,
      hasUsedVoice:         false,
      hasGeneratedQuiz:     false,
      pendingAchievement:   null,

      consumePendingAchievement: () => set({ pendingAchievement: null }),

      unlockAchievement: (id: string) => {
        const { unlockedAchievements } = get();
        if (unlockedAchievements.includes(id)) return;
        set((s) => ({
          unlockedAchievements: [...s.unlockedAchievements, id],
          pendingAchievement:   id,
        }));
      },

      addXP: (amount: number) => {
        set((s) => ({ xp: s.xp + amount }));
      },

      startSession: () => {
        const { lastUsedDate, streak, unlockAchievement, addXP } = get();
        const today = todayStr();

        let newStreak = streak;
        if (lastUsedDate === null || lastUsedDate < yesterdayStr()) {
          newStreak = 1; // reset or first day
        } else if (lastUsedDate === yesterdayStr()) {
          newStreak = streak + 1;
        }
        // If lastUsedDate === today → already counted, no change to streak

        set((s) => ({
          streak:        newStreak,
          lastUsedDate:  today,
          totalSessions: s.totalSessions + 1,
        }));

        addXP(XP_PER_SESSION);

        if (newStreak >= 3) unlockAchievement("dedicated");
      },

      addQuestion: () => {
        const { totalQuestions, unlockAchievement, addXP } = get();
        const newTotal = totalQuestions + 1;
        set({ totalQuestions: newTotal });
        addXP(XP_PER_QUESTION);

        if (newTotal === 1)  unlockAchievement("first-question");
        if (newTotal === 10) unlockAchievement("curious");
      },

      recordCameraUsed: () => {
        const { hasUsedCamera, unlockAchievement } = get();
        if (hasUsedCamera) return;
        set({ hasUsedCamera: true });
        unlockAchievement("multimodal");
      },

      recordVoiceUsed: () => {
        const { hasUsedVoice, unlockAchievement } = get();
        if (hasUsedVoice) return;
        set({ hasUsedVoice: true });
        unlockAchievement("hands-free");
      },

      recordQuizGenerated: () => {
        const { hasGeneratedQuiz, unlockAchievement } = get();
        if (hasGeneratedQuiz) return;
        set({ hasGeneratedQuiz: true });
        unlockAchievement("teacher");
      },
    }),
    { name: "aula-progress" },
  ),
);
