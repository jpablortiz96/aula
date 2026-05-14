import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatSettingsState {
  socraticMode:     boolean;
  setSocraticMode:  (v: boolean) => void;
  simplifyCount:    number;      // total "No entendí" uses across all sessions
  incrementSimplify:() => void;
}

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set) => ({
      socraticMode:      false,
      setSocraticMode:   (socraticMode) => set({ socraticMode }),
      simplifyCount:     0,
      incrementSimplify: () => set((s) => ({ simplifyCount: s.simplifyCount + 1 })),
    }),
    { name: "aula-chat-settings" },
  ),
);
