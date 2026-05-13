import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EngineId } from "@/engines/types";

export type EngineSelection = EngineId | "auto";

interface EngineStore {
  selectedEngineId: EngineSelection;
  apiKey: string;
  preferCloud: boolean;
  setEngine: (id: EngineSelection) => void;
  setApiKey: (key: string) => void;
  setPreferCloud: (v: boolean) => void;
}

export const useEngineStore = create<EngineStore>()(
  persist(
    (set) => ({
      selectedEngineId: "auto",
      apiKey: "",
      preferCloud: false,
      setEngine: (selectedEngineId) => set({ selectedEngineId }),
      setApiKey: (apiKey) => {
        // Persist key to localStorage under dedicated key for engine classes to read
        try {
          if (apiKey) {
            localStorage.setItem("aula:google-ai-api-key", apiKey);
          } else {
            localStorage.removeItem("aula:google-ai-api-key");
          }
        } catch {
          // ignore storage errors
        }
        set({ apiKey });
      },
      setPreferCloud: (preferCloud) => set({ preferCloud }),
    }),
    { name: "aula-engine-settings" }
  )
);
