"use client";

import { useState, useCallback, useRef } from "react";
import katex from "katex";
import { useT } from "@/hooks/useT";

// ─── Button definitions ───────────────────────────────────────────────────────

interface MathButton {
  label: string;
  insert: string;   // LaTeX snippet to append
  display?: string; // override the button face
}

const BUTTON_GROUPS: Array<{ key: string; buttons: MathButton[] }> = [
  {
    key: "basic",
    buttons: [
      { label: "+",  insert: "+" },
      { label: "−",  insert: "-" },
      { label: "×",  insert: "\\times " },
      { label: "÷",  insert: "\\div " },
      { label: "=",  insert: "=" },
      { label: "(",  insert: "(" },
      { label: ")",  insert: ")" },
      { label: "π",  insert: "\\pi " },
      { label: "∞",  insert: "\\infty " },
      { label: "%",  insert: "\\%" },
    ],
  },
  {
    key: "fractions",
    buttons: [
      { label: "a/b",   insert: "\\frac{}{}", display: "a/b" },
      { label: "√",     insert: "\\sqrt{}" },
      { label: "∛",     insert: "\\sqrt[3]{}" },
      { label: "| |",   insert: "\\left|\\right|", display: "|x|" },
    ],
  },
  {
    key: "powers",
    buttons: [
      { label: "x²",    insert: "^{2}" },
      { label: "xⁿ",    insert: "^{}" },
      { label: "x₀",    insert: "_{}" },
      { label: "10ⁿ",   insert: "10^{}" },
    ],
  },
  {
    key: "trig",
    buttons: [
      { label: "sin",   insert: "\\sin(" },
      { label: "cos",   insert: "\\cos(" },
      { label: "tan",   insert: "\\tan(" },
      { label: "log",   insert: "\\log(" },
      { label: "ln",    insert: "\\ln(" },
    ],
  },
  {
    key: "symbols",
    buttons: [
      { label: "≤",    insert: "\\leq " },
      { label: "≥",    insert: "\\geq " },
      { label: "≠",    insert: "\\neq " },
      { label: "≈",    insert: "\\approx " },
      { label: "∑",    insert: "\\sum " },
      { label: "∫",    insert: "\\int " },
      { label: "°",    insert: "^{\\circ}" },
      { label: "→",    insert: "\\to " },
      { label: "∈",    insert: "\\in " },
    ],
  },
];

// ─── LaTeX renderer (client-side only, no SSR) ────────────────────────────────

function renderLatex(src: string): string {
  if (!src.trim()) return "";
  try {
    return katex.renderToString(src, {
      throwOnError:   false,
      displayMode:    true,
      output:         "html",
      trust:          false,
    });
  } catch {
    return `<span style="color:#EA4335;font-family:monospace;">${src}</span>`;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EquationBuilderProps {
  onSolve: (latex: string, readable: string) => void;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EquationBuilder({ onSolve, disabled = false }: EquationBuilderProps) {
  const t = useT();
  const [latex,       setLatex]       = useState("");
  const [activeGroup, setActiveGroup] = useState("basic");
  const inputRef = useRef<HTMLInputElement>(null);

  const insert = useCallback((snippet: string) => {
    setLatex((prev) => prev + snippet);
    inputRef.current?.focus();
  }, []);

  const handleSolve = useCallback(() => {
    const trimmed = latex.trim();
    if (!trimmed) return;
    // Provide a readable fallback (strip common LaTeX commands)
    const readable = trimmed
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt\[3\]\{([^}]*)\}/g, "∛($1)")
      .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
      .replace(/\^{([^}]*)}/g, "^($1)")
      .replace(/_{([^}]*)}/g, "_($1)")
      .replace(/\\(times|cdot) /g, "×")
      .replace(/\\div /g, "÷")
      .replace(/\\(pi|Pi) /g, "π")
      .replace(/\\infty /g, "∞")
      .replace(/\\leq /g, "≤")
      .replace(/\\geq /g, "≥")
      .replace(/\\neq /g, "≠")
      .replace(/\\approx /g, "≈")
      .replace(/\\(sin|cos|tan|log|ln)\(/g, (_, fn: string) => `${fn}(`)
      .replace(/\\[a-zA-Z]+\s?/g, "")
      .replace(/[{}]/g, "")
      .trim();
    onSolve(trimmed, readable || trimmed);
  }, [latex, onSolve]);

  const renderedHtml = renderLatex(latex);

  return (
    <div className="flex flex-col gap-4">
      {/* Preview */}
      <div className="rounded-2xl bg-white border border-aula-border min-h-[72px] flex items-center justify-center px-4 py-3 overflow-x-auto">
        {latex.trim() ? (
          <div
            className="text-aula-ink text-xl"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <span className="text-aula-ink-soft text-sm">{t("equationBuilder.placeholder")}</span>
        )}
      </div>

      {/* Text input (raw LaTeX) */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          placeholder={t("equationBuilder.placeholder")}
          className="flex-1 rounded-xl border border-aula-border bg-white px-3 py-2 text-sm text-aula-ink placeholder:text-aula-ink-soft focus:outline-none focus:ring-2 focus:ring-aula-blue"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSolve(); }
          }}
          aria-label={t("equationBuilder.preview")}
        />
        <button
          onClick={() => setLatex((p) => p.slice(0, -1))}
          aria-label={t("equationBuilder.backspace")}
          className="rounded-xl border border-aula-border bg-white px-3 py-2 text-sm text-aula-ink hover:bg-aula-surface active:scale-95 transition-all"
        >
          {t("equationBuilder.backspace")}
        </button>
        <button
          onClick={() => setLatex("")}
          aria-label={t("equationBuilder.clear")}
          className="rounded-xl border border-aula-border bg-white px-3 py-2 text-sm text-aula-ink hover:bg-aula-surface active:scale-95 transition-all"
        >
          {t("equationBuilder.clear")}
        </button>
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 flex-wrap" role="tablist">
        {BUTTON_GROUPS.map((g) => (
          <button
            key={g.key}
            role="tab"
            aria-selected={activeGroup === g.key}
            onClick={() => setActiveGroup(g.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeGroup === g.key
                ? "bg-aula-blue text-white"
                : "bg-aula-surface text-aula-ink-soft hover:text-aula-ink"
            }`}
          >
            {t(`equationBuilder.group.${g.key}`)}
          </button>
        ))}
      </div>

      {/* Math buttons */}
      <div className="flex flex-wrap gap-2" role="group">
        {BUTTON_GROUPS.find((g) => g.key === activeGroup)?.buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => insert(btn.insert)}
            disabled={disabled}
            className="rounded-xl border border-aula-border bg-white px-3 py-2 text-sm font-mono text-aula-ink hover:bg-aula-surface hover:border-aula-blue active:scale-95 transition-all disabled:opacity-40"
            aria-label={btn.label}
          >
            {btn.display ?? btn.label}
          </button>
        ))}
      </div>

      {/* Solve button */}
      <button
        onClick={handleSolve}
        disabled={disabled || !latex.trim()}
        className="w-full rounded-2xl bg-aula-blue text-white font-semibold py-3 text-base hover:bg-aula-blue/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        aria-label={t("equationBuilder.solve")}
      >
        {disabled ? t("equationBuilder.solving") : t("equationBuilder.solve")}
      </button>

      {/* Local badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-aula-green/10 text-aula-green text-xs font-medium px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-aula-green animate-pulse" />
          {t("equationBuilder.localBadge")}
        </span>
      </div>
    </div>
  );
}
