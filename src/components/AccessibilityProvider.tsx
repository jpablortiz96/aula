"use client";

import { useEffect } from "react";
import { useAccessibilityStore } from "@/store/accessibilityStore";

/**
 * Applies accessibility CSS classes to <html> based on the persisted store.
 * Must be rendered inside the client tree (inside a "use client" subtree or via layout).
 */
export function AccessibilityProvider() {
  const { textSize, highContrast, reduceMotion, easyReading } = useAccessibilityStore();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("aula-text-large",    textSize === "large");
    html.classList.toggle("aula-text-xl",       textSize === "xl");
    html.classList.toggle("aula-high-contrast", highContrast);
    html.classList.toggle("aula-reduce-motion", reduceMotion);
    html.classList.toggle("aula-easy-reading",  easyReading);
  }, [textSize, highContrast, reduceMotion, easyReading]);

  return null;
}
