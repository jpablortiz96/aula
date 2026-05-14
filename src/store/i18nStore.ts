import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "es" | "en";

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      lang: "es",
      setLang: (lang) => set({ lang }),
    }),
    { name: "aula-lang" },
  ),
);
