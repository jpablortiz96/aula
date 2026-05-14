"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Pencil, Eraser, Trash2, Undo2, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recognizeHandwriting, type StrokePoint } from "@/lib/handwriting/recognizeHandwriting";
import { useT } from "@/hooks/useT";
import { useI18nStore } from "@/store/i18nStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tool = "pen" | "eraser";

// ─── Constants ────────────────────────────────────────────────────────────────

const PEN_COLOR   = "#1a1a2e";
const PEN_WIDTH   = 3;
const ERASER_WIDTH= 24;
const BG_COLOR    = "#FAFBFF";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onSolve:   (recognizedText: string) => void;
  onCancel?: () => void;
  /** When provided, shows Cloud Boost option */
  onCloudBoost?: (rawDataUrl: string) => void;
}

export function DigitalWhiteboard({ onSolve, onCancel, onCloudBoost }: Props) {
  const t    = useT();
  const lang = useI18nStore((s) => s.lang);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDrawingRef    = useRef(false);
  const lastPointRef    = useRef<{ x: number; y: number } | null>(null);
  const currentStroke   = useRef<StrokePoint[]>([]);
  const allStrokes      = useRef<StrokePoint[][]>([]);
  const undoStackRef    = useRef<ImageData[]>([]);

  const [tool,   setTool]   = useState<Tool>("pen");
  const [state,  setState]  = useState<"idle" | "recognizing" | "confirming" | "error">("idle");
  const [recognized, setRecognized] = useState("");
  const [editedText, setEditedText] = useState("");
  const [method, setMethod] = useState<"native" | "tesseract" | "failed">("tesseract");
  const [hasStrokes, setHasStrokes] = useState(false);

  // ── Canvas setup ────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width  = container.clientWidth;
      canvas.height = container.clientHeight;
      fillBackground(ctx, canvas);
      if (snapshot.width > 0 && snapshot.height > 0) {
        ctx.putImageData(snapshot, 0, 0);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  function fillBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function getCanvas() {
    return canvasRef.current!;
  }
  function getCtx() {
    return getCanvas().getContext("2d")!;
  }

  function pointerToCanvas(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = getCanvas().getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  const saveSnapshot = useCallback(() => {
    const ctx = getCtx();
    const canvas = getCanvas();
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = pointerToCanvas(e);
    lastPointRef.current = pt;

    if (tool === "pen") {
      saveSnapshot();
      currentStroke.current = [{ ...pt, t: Date.now() }];
      const ctx = getCtx();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, PEN_WIDTH / 2, 0, Math.PI * 2);
      ctx.fillStyle = PEN_COLOR;
      ctx.fill();
    }
    setHasStrokes(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, saveSnapshot]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const pt  = pointerToCanvas(e);
    const ctx = getCtx();

    if (tool === "eraser") {
      ctx.clearRect(pt.x - ERASER_WIDTH / 2, pt.y - ERASER_WIDTH / 2, ERASER_WIDTH, ERASER_WIDTH);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(pt.x - ERASER_WIDTH / 2, pt.y - ERASER_WIDTH / 2, ERASER_WIDTH, ERASER_WIDTH);
    } else {
      const mid = {
        x: (lastPointRef.current.x + pt.x) / 2,
        y: (lastPointRef.current.y + pt.y) / 2,
      };
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, mid.x, mid.y);
      ctx.strokeStyle = PEN_COLOR;
      ctx.lineWidth   = PEN_WIDTH * (e.pressure > 0 ? Math.max(0.5, e.pressure) : 1);
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.stroke();
      currentStroke.current.push({ ...pt, t: Date.now() });
    }

    lastPointRef.current = pt;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;

    if (tool === "pen" && currentStroke.current.length > 0) {
      allStrokes.current.push([...currentStroke.current]);
      currentStroke.current = [];
    }
  }, [tool]);

  // ── Tools ─────────────────────────────────────────────────────────────────────

  function handleUndo() {
    const ctx = getCtx();
    const canvas = getCanvas();
    const snap = undoStackRef.current.pop();
    if (snap) {
      ctx.putImageData(snap, 0, 0);
    } else {
      fillBackground(ctx, canvas);
    }
    if (allStrokes.current.length > 0) allStrokes.current.pop();
    setHasStrokes(allStrokes.current.length > 0);
  }

  function handleClear() {
    const ctx = getCtx();
    const canvas = getCanvas();
    fillBackground(ctx, canvas);
    undoStackRef.current = [];
    allStrokes.current   = [];
    currentStroke.current = [];
    setHasStrokes(false);
    setState("idle");
  }

  // ── Recognize ─────────────────────────────────────────────────────────────────

  async function handleSolve() {
    if (!hasStrokes) return;
    setState("recognizing");

    const dataUrl  = getCanvas().toDataURL("image/png");
    const strokes  = [...allStrokes.current];
    const result   = await recognizeHandwriting(strokes, dataUrl, lang);

    setMethod(result.method);

    if (result.method === "failed" || result.text.length === 0) {
      setState("error");
      return;
    }

    setRecognized(result.text);
    setEditedText(result.text);
    setState("confirming");
  }

  function handleConfirm() {
    const text = editedText.trim();
    if (!text) return;
    onSolve(text);
  }

  function handleCloudBoost() {
    const dataUrl = getCanvas().toDataURL("image/jpeg", 0.85);
    onCloudBoost?.(dataUrl);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-200">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-white shrink-0 flex-wrap">
        <div className="flex items-center gap-1">
          {(["pen", "eraser"] as Tool[]).map((tl) => (
            <button
              key={tl}
              onClick={() => setTool(tl)}
              title={t(`pizarra.tools.${tl}`)}
              aria-label={t(`pizarra.tools.${tl}`)}
              aria-pressed={tool === tl}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
                tool === tl
                  ? "bg-aula-blue text-white"
                  : "text-aula-ink-soft hover:bg-gray-100"
              }`}
            >
              {tl === "pen" ? <Pencil className="w-4 h-4" /> : <Eraser className="w-4 h-4" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={handleUndo}
            title={t("pizarra.tools.undo")}
            aria-label={t("pizarra.tools.undo")}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-aula-ink-soft hover:bg-gray-100 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            title={t("pizarra.tools.clear")}
            aria-label={t("pizarra.tools.clear")}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-aula-ink-soft hover:bg-gray-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {method === "native" && state === "confirming" && (
          <span className="text-xs text-aula-green font-medium">{t("pizarra.nativeApi")}</span>
        )}
        {method === "tesseract" && state === "confirming" && (
          <span className="text-xs text-aula-ink-soft">{t("pizarra.tesseractFallback")}</span>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-aula-ink-soft hover:text-aula-ink p-1 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 min-h-0 relative" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
          aria-label={t("pizarra.subtitle")}
        />
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 border-t bg-white px-4 py-3">
        {state === "idle" && (
          <Button
            onClick={() => { void handleSolve(); }}
            disabled={!hasStrokes}
            className="w-full bg-aula-blue hover:bg-aula-blue-dark text-white rounded-xl gap-2"
          >
            <Pencil className="w-4 h-4" />
            {t("pizarra.solve")}
          </Button>
        )}

        {state === "recognizing" && (
          <div className="flex items-center justify-center gap-2 py-1 text-sm text-aula-ink-soft">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("pizarra.solving")}
          </div>
        )}

        {state === "confirming" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-aula-ink-soft">{t("pizarra.confirm.title")}</p>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-aula-blue"
              rows={2}
              aria-label={t("pizarra.confirm.title")}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleConfirm}
                disabled={!editedText.trim()}
                className="flex-1 bg-aula-blue hover:bg-aula-blue-dark text-white rounded-xl gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {t("pizarra.confirm.yes")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setState("idle")}
                className="gap-1.5 rounded-xl"
              >
                {t("pizarra.confirm.cancel")}
              </Button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-aula-red">{t("pizarra.error.noText")}</p>
            <p className="text-xs text-aula-ink-soft">{t("pizarra.error.hint")}</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setState("idle")}
                className="rounded-xl"
              >
                {t("common.retry")}
              </Button>
              {onCloudBoost && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCloudBoost}
                  className="rounded-xl text-aula-blue border-aula-blue/30"
                >
                  {t("pizarra.error.cloudOpt")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
