import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DisplayRole = "user" | "assistant" | "system-notice";

export interface DisplayMessage {
  id: string;
  role: DisplayRole;
  content: string;
}

interface ChatStore {
  messages: DisplayMessage[];
  addMessage: (role: DisplayRole, content: string) => void;
  clearHistory: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (role, content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { id: crypto.randomUUID(), role, content },
          ],
        })),
      clearHistory: () => set({ messages: [] }),
    }),
    { name: "aula:chat-history" }
  )
);
