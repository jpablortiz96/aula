import { create } from "zustand";

export type DisplayRole = "user" | "assistant" | "system-notice";

export interface MessageMeta {
  simplified?:    boolean;
  simplifyLevel?: number;
  fromWhiteboard?: boolean;
}

export interface DisplayMessage {
  id:    string;
  role:  DisplayRole;
  content: string;
  meta?: MessageMeta;
}

interface ChatStore {
  messages: DisplayMessage[];
  addMessage: (role: DisplayRole, content: string, meta?: MessageMeta) => void;
  setMessages: (messages: DisplayMessage[]) => void;
  clearHistory: () => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  addMessage: (role, content, meta) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), role, content, meta },
      ],
    })),
  setMessages: (messages) => set({ messages }),
  clearHistory: () => set({ messages: [] }),
}));
