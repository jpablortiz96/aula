import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Levels ──────────────────────────────────────────────────────────────────

export interface Level {
  name:  string;
  minXp: number;
  color: string;
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
  const range  = next.minXp - current.minXp;
  const earned = xp - current.minXp;
  return Math.min(1, earned / range);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const XP_PER_QUESTION = 10;
const XP_PER_SESSION  = 5;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  hasUsedCamera:           boolean;
  hasUsedVoice:            boolean;
  hasGeneratedQuiz:        boolean;
  hasUsedWhiteboard:       boolean;
  hasUsedSocratic:         boolean;
  hasUsedEquationBuilder:  boolean;
  hasUsedIllustrator:      boolean;
  practiceExerciseCount:   number;
  hasCompletedQuiz:        boolean;
  hasPerfectQuiz:          boolean;
  hasUsedMindMap:          boolean;

  pendingAchievement:         string | null;
  consumePendingAchievement:  () => void;

  startSession:                () => void;
  addQuestion:                 () => void;
  addXP:                       (amount: number) => void;
  unlockAchievement:           (id: string) => void;
  recordCameraUsed:            () => void;
  recordVoiceUsed:             () => void;
  recordQuizGenerated:         () => void;
  recordWhiteboardUsed:        () => void;
  recordSocraticUsed:          () => void;
  checkSimplifyCount:          (count: number) => void;
  recordEquationBuilderUsed:   () => void;
  recordPracticeExercise:      () => void;
  recordIllustratorUsed:       () => void;
  recordInteractiveQuizCompleted: (score: number, total: number) => void;
  recordMindMapUsed:           () => void;
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
      hasUsedCamera:           false,
      hasUsedVoice:            false,
      hasGeneratedQuiz:        false,
      hasUsedWhiteboard:       false,
      hasUsedSocratic:         false,
      hasUsedEquationBuilder:  false,
      hasUsedIllustrator:      false,
      practiceExerciseCount:   0,
      hasCompletedQuiz:        false,
      hasPerfectQuiz:          false,
      hasUsedMindMap:          false,
      pendingAchievement:      null,

      consumePendingAchievement: () => set({ pendingAchievement: null }),

      unlockAchievement: (id: string) => {
        const { unlockedAchievements } = get();
        if (unlockedAchievements.includes(id)) return;
        set((s) => ({
          unlockedAchievements: [...s.unlockedAchievements, id],
          pendingAchievement:   id,
        }));
      },

      addXP: (amount: number) => set((s) => ({ xp: s.xp + amount })),

      startSession: () => {
        const { lastUsedDate, streak, unlockAchievement, addXP } = get();
        const today = todayStr();

        let newStreak = streak;
        if (lastUsedDate === null || lastUsedDate < yesterdayStr()) {
          newStreak = 1;
        } else if (lastUsedDate === yesterdayStr()) {
          newStreak = streak + 1;
        }

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
        unlockAchievement("eye-reader");
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

      recordWhiteboardUsed: () => {
        const { hasUsedWhiteboard, unlockAchievement } = get();
        if (hasUsedWhiteboard) return;
        set({ hasUsedWhiteboard: true });
        unlockAchievement("whiteboard");
      },

      recordSocraticUsed: () => {
        const { hasUsedSocratic, unlockAchievement } = get();
        if (hasUsedSocratic) return;
        set({ hasUsedSocratic: true });
        unlockAchievement("thinker");
      },

      checkSimplifyCount: (count: number) => {
        const { unlockAchievement } = get();
        if (count >= 5) unlockAchievement("curious-mind");
      },

      recordEquationBuilderUsed: () => {
        const { hasUsedEquationBuilder, unlockAchievement } = get();
        if (hasUsedEquationBuilder) return;
        set({ hasUsedEquationBuilder: true });
        unlockAchievement("equation-builder");
      },

      recordPracticeExercise: () => {
        const { practiceExerciseCount, unlockAchievement, addXP } = get();
        const newCount = practiceExerciseCount + 1;
        set({ practiceExerciseCount: newCount });
        addXP(8);
        if (newCount === 10) unlockAchievement("marathon");
      },

      recordIllustratorUsed: () => {
        const { hasUsedIllustrator, unlockAchievement } = get();
        if (hasUsedIllustrator) return;
        set({ hasUsedIllustrator: true });
        unlockAchievement("artist");
      },

      recordInteractiveQuizCompleted: (score: number, total: number) => {
        const { hasCompletedQuiz, hasPerfectQuiz, unlockAchievement, addXP } = get();
        if (!hasCompletedQuiz) {
          set({ hasCompletedQuiz: true });
          unlockAchievement("quiz-taken");
        }
        const xpEarned = score * 5;
        addXP(xpEarned);
        if (score === total && total > 0 && !hasPerfectQuiz) {
          set({ hasPerfectQuiz: true });
          unlockAchievement("quiz-perfect");
        }
      },

      recordMindMapUsed: () => {
        const { hasUsedMindMap, unlockAchievement } = get();
        if (hasUsedMindMap) return;
        set({ hasUsedMindMap: true });
        unlockAchievement("cartographer");
      },
    }),
    { name: "aula-progress" },
  ),
);
