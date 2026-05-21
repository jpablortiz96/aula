"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { generateText, getActiveEngine } from "@/engines/engineSingleton";
import { useProgressStore } from "@/store/progressStore";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";

// ─── Button definitions ───────────────────────────────────────────────────────

type Variant = "num" | "op" | "fn" | "var" | "clear" | "back" | "solve";

interface CalcBtn {
  label:   string;
  insert?: string;
  action?: "clear" | "back" | "solve";
  variant: Variant;
  aria:    string;
}

const ROWS: CalcBtn[][] = [
  [
    { label: "sin",  insert: "sin(",  variant: "fn",    aria: "seno" },
    { label: "cos",  insert: "cos(",  variant: "fn",    aria: "coseno" },
    { label: "tan",  insert: "tan(",  variant: "fn",    aria: "tangente" },
    { label: "log",  insert: "log(",  variant: "fn",    aria: "logaritmo" },
    { label: "ln",   insert: "ln(",   variant: "fn",    aria: "logaritmo natural" },
  ],
  [
    { label: "x²",   insert: "^2",    variant: "fn",    aria: "al cuadrado" },
    { label: "x³",   insert: "^3",    variant: "fn",    aria: "al cubo" },
    { label: "√",    insert: "√(",    variant: "fn",    aria: "raíz cuadrada" },
    { label: "π",    insert: "π",     variant: "var",   aria: "pi" },
    { label: "e",    insert: "e",     variant: "var",   aria: "número e" },
  ],
  [
    { label: "(",    insert: "(",     variant: "op",    aria: "paréntesis izquierdo" },
    { label: ")",    insert: ")",     variant: "op",    aria: "paréntesis derecho" },
    { label: "|x|",  insert: "|",     variant: "fn",    aria: "valor absoluto" },
    { label: "%",    insert: "%",     variant: "op",    aria: "porcentaje" },
    { label: "÷",    insert: "÷",     variant: "op",    aria: "dividir" },
  ],
  [
    { label: "7",    insert: "7",     variant: "num",   aria: "7" },
    { label: "8",    insert: "8",     variant: "num",   aria: "8" },
    { label: "9",    insert: "9",     variant: "num",   aria: "9" },
    { label: "x",    insert: "x",     variant: "var",   aria: "variable x" },
    { label: "×",    insert: "×",     variant: "op",    aria: "multiplicar" },
  ],
  [
    { label: "4",    insert: "4",     variant: "num",   aria: "4" },
    { label: "5",    insert: "5",     variant: "num",   aria: "5" },
    { label: "6",    insert: "6",     variant: "num",   aria: "6" },
    { label: "y",    insert: "y",     variant: "var",   aria: "variable y" },
    { label: "−",    insert: "−",     variant: "op",    aria: "restar" },
  ],
  [
    { label: "1",    insert: "1",     variant: "num",   aria: "1" },
    { label: "2",    insert: "2",     variant: "num",   aria: "2" },
    { label: "3",    insert: "3",     variant: "num",   aria: "3" },
    { label: ",",    insert: ",",     variant: "op",    aria: "coma" },
    { label: "+",    insert: "+",     variant: "op",    aria: "sumar" },
  ],
  [
    { label: "0",    insert: "0",     variant: "num",   aria: "0" },
    { label: ".",    insert: ".",     variant: "num",   aria: "punto decimal" },
    { label: "AC",   action: "clear", variant: "clear", aria: "limpiar todo" },
    { label: "⌫",    action: "back",  variant: "back",  aria: "borrar último carácter" },
    { label: "=",    action: "solve", variant: "solve", aria: "resolver con AULA" },
  ],
];

const VARIANT_CLASS: Record<Variant, string> = {
  num:   "bg-white text-aula-ink border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all",
  op:    "bg-blue-50 text-aula-blue border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all",
  fn:    "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all",
  var:   "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 active:scale-95 transition-all",
  clear: "bg-red-50 text-aula-red border border-red-200 hover:bg-red-100 active:scale-95 transition-all",
  back:  "bg-red-50 text-aula-red border border-red-200 hover:bg-red-100 active:scale-95 transition-all",
  solve: "bg-aula-green text-white border border-aula-green hover:bg-aula-green/90 active:scale-95 transition-all font-bold text-base",
};

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = "input" | "solving" | "result";

export function ScientificCalculator() {
  const t                  = useT();
  const lang               = useI18nStore((s) => s.lang);
  const recordCalc         = useProgressStore((s) => s.recordEquationBuilderUsed);

  const [expr,    setExpr]    = useState("");
  const [phase,   setPhase]   = useState<Phase>("input");
  const [result,  setResult]  = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const canSolve =
    typeof window !== "undefined" &&
    (getActiveEngine() !== null ||
      Boolean(localStorage.getItem("aula:google-ai-api-key")));

  const reset = useCallback(() => {
    setExpr("");
    setResult(null);
    setError(null);
    setPhase("input");
  }, []);

  const handleSolve = useCallback(async () => {
    const trimmed = expr.trim();
    if (!trimmed || phase === "solving") return;

    setPhase("solving");
    setError(null);
    setResult(null);
    recordCalc();

    const prompt =
      lang === "es"
        ? `Resuelve esta operación matemática paso a paso de forma didáctica. Numera cada paso. Usa LaTeX con $...$ para expresiones matemáticas inline y $$...$$ para display. Escribe la respuesta final en **negrita**.\n\nOperación: ${trimmed}`
        : `Solve this mathematical expression step by step. Number each step. Use LaTeX with $...$ for inline math and $$...$$ for display. Write the final answer in **bold**.\n\nExpression: ${trimmed}`;

    try {
      const text = await generateText(prompt, { maxTokens: 600, temperature: 0.3 });
      setResult(text || (lang === "es" ? "Sin respuesta del modelo." : "No response from model."));
      setPhase("result");
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly =
        raw.includes("No AI engine") || raw.includes("API key")
          ? (lang === "es"
              ? "Carga el modelo desde Chat primero, o agrega una API key en Config."
              : "Load the model from Chat first, or add an API key in Settings.")
          : raw;
      setError(friendly);
      setPhase("input");
    }
  }, [expr, lang, phase, recordCalc]);

  const handleButton = useCallback((btn: CalcBtn) => {
    if (phase === "solving") return;
    if (btn.action === "clear") {
      reset();
    } else if (btn.action === "back") {
      setExpr((p) => p.slice(0, -1));
      if (phase === "result") { setResult(null); setPhase("input"); }
    } else if (btn.action === "solve") {
      void handleSolve();
    } else if (btn.insert !== undefined) {
      setExpr((p) => p + btn.insert);
      if (phase === "result") { setResult(null); setPhase("input"); }
    }
  }, [phase, reset, handleSolve]);

  // Physical keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept when user is in a form field
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (phase === "solving") return;

      if (e.key === "Enter") {
        e.preventDefault();
        void handleSolve();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setExpr((p) => p.slice(0, -1));
      } else if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        reset();
      } else if (/^[0-9+\-*/().^,%xyeπ ]$/.test(e.key)) {
        setExpr((p) => p + e.key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleSolve, reset]);

  if (!canSolve) {
    return (
      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 text-center">
        <p className="text-sm text-aula-ink">{t("calculator.noEngine")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* LCD Display */}
      <div
        className="rounded-2xl bg-gray-950 border border-gray-800 px-4 py-3 min-h-[64px] flex items-center overflow-x-auto"
        role="status"
        aria-label={t("calculator.displayPlaceholder")}
        aria-live="polite"
      >
        <span
          className={`font-mono text-xl tracking-wider select-all ${
            expr ? "text-green-400" : "text-gray-600"
          }`}
        >
          {expr || "0"}
        </span>
      </div>

      {/* Button grid — 5 columns */}
      <div className="grid grid-cols-5 gap-1.5">
        {ROWS.map((row, ri) =>
          row.map((btn) => (
            <button
              key={`${ri}-${btn.label}`}
              onClick={() => handleButton(btn)}
              disabled={phase === "solving"}
              aria-label={btn.aria}
              className={`rounded-xl py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASS[btn.variant]}`}
            >
              {btn.label}
            </button>
          ))
        )}
      </div>

      {/* Solving spinner */}
      {phase === "solving" && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-aula-ink-soft">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("calculator.solving")}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-aula-red/10 border border-aula-red/20 p-4">
          <p className="text-sm text-aula-red">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && phase === "result" && (
        <div className="rounded-2xl bg-aula-green/10 border border-aula-green/30 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-aula-green uppercase tracking-wide">
            {t("calculator.result.label")}
          </p>
          <div className="text-sm text-aula-ink leading-relaxed whitespace-pre-wrap font-mono">
            {result}
          </div>
          <button
            onClick={reset}
            className="self-start rounded-xl bg-aula-green text-white text-xs font-semibold px-3 py-1.5 hover:bg-aula-green/90 transition-all"
          >
            {t("calculator.newCalc")}
          </button>
        </div>
      )}

      {/* Local badge */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-aula-green font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-aula-green animate-pulse" />
        {t("calculator.badge")}
      </div>
    </div>
  );
}
