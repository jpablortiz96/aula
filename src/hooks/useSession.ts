"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAllSessions, saveSession, deleteSession, type StudySession } from "@/lib/db";
import { useChatStore, type DisplayMessage } from "@/store/chatStore";

function inferTitle(messages: DisplayMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Nueva sesión";
  const text = first.content.slice(0, 42);
  return first.content.length > 42 ? `${text}…` : text;
}

export interface UseSessionReturn {
  sessions: StudySession[];
  activeSessionId: string | null;
  createNewSession: () => void;
  loadSession: (id: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const isRestoringRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeSessionId;

  useEffect(() => {
    getAllSessions()
      .then(setSessions)
      .catch(console.error);
  }, []);

  // Auto-save active session when messages change (debounced 800ms)
  useEffect(() => {
    const unsub = useChatStore.subscribe((state) => {
      if (isRestoringRef.current) return;
      const id = activeIdRef.current;
      if (!id) return;
      if (state.messages.length === 0) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const messages = useChatStore.getState().messages;
        const now = Date.now();
        setSessions((prev) => {
          const existing = prev.find((s) => s.id === id);
          const updated: StudySession = {
            id,
            title: inferTitle(messages),
            subject: existing?.subject ?? "other",
            messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          void saveSession(updated);
          return prev.map((s) => (s.id === id ? updated : s));
        });
      }, 800);
    });
    return unsub;
  }, []);

  const createNewSession = useCallback(() => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const session: StudySession = {
      id,
      title: "Nueva sesión",
      subject: "other",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    useChatStore.getState().clearHistory();
    setActiveSessionId(id);
    setSessions((prev) => [session, ...prev]);
    void saveSession(session);
  }, []);

  const loadSession = useCallback(async (id: string) => {
    isRestoringRef.current = true;
    try {
      const all = await getAllSessions();
      const found = all.find((s) => s.id === id);
      if (!found) return;
      useChatStore.getState().setMessages(found.messages);
      setActiveSessionId(id);
    } finally {
      setTimeout(() => { isRestoringRef.current = false; }, 1200);
    }
  }, []);

  const removeSession = useCallback(async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeIdRef.current === id) {
      useChatStore.getState().clearHistory();
      setActiveSessionId(null);
    }
  }, []);

  return { sessions, activeSessionId, createNewSession, loadSession, removeSession };
}
