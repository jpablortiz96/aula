"use client";

import { useI18nStore } from "@/store/i18nStore";
import es from "@/i18n/es.json";
import en from "@/i18n/en.json";

const DICTS = { es: es as Record<string, string>, en: en as Record<string, string> };

export function useT() {
  const lang = useI18nStore((s) => s.lang);
  const dict = DICTS[lang];

  return function t(key: string, vars?: Record<string, string | number>): string {
    let str = dict[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

/** Non-hook version for outside React (e.g. stores, engine callbacks). */
export function getT(lang: "es" | "en") {
  const dict = DICTS[lang];
  return function t(key: string, vars?: Record<string, string | number>): string {
    let str = dict[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };
}
