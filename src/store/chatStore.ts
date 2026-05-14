import { create } from "zustand";

export type DisplayRole = "user" | "assistant" | "system-notice";

export interface DisplayMessage {
  id: string;
  role: DisplayRole;
  content: string;
}

interface ChatStore {
  messages: DisplayMessage[];
  addMessage: (role: DisplayRole, content: string) => void;
  setMessages: (messages: DisplayMessage[]) => void;
  clearHistory: () => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  addMessage: (role, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), role, content },
      ],
    })),
  setMessages: (messages) => set({ messages }),
  clearHistory: () => set({ messages: [] }),
}));
