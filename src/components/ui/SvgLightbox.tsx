"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Download, FileImage } from "lucide-react";
import { useT } from "@/hooks/useT";

interface Props {
  svgMarkup: string;
  filename:  string;
  open:      boolean;
  onClose:   () => void;
}

export function SvgLightbox({ svgMarkup, filename, open, onClose }: Props) {
  const t    = useT();
  const [scale, setScale] = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setScale(1); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function downloadSvg() {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${filename}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob   = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url       = URL.createObjectURL(svgBlob);
    const img       = new Image();
    img.onload = () => {
      const canvas  = document.createElement("canvas");
      const w       = (img.width  || 800) * 2;
      const h       = (img.height || 600) * 2;
      canvas.width  = w;
      canvas.height = h;
      const ctx     = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a    = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Always rendered — CSS controls visibility so refs/DOM are always valid.
  // SVG content rendered by React (dangerouslySetInnerHTML), never via
  // manual innerHTML in an effect, avoiding all React commit-phase races.
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-150 ${
        open ? "opacity-100 pointer-events-auto bg-black/70" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
      role="dialog"
      aria-hidden={!open}
    >
      <div
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t("lightbox.zoomOut")}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-sm tabular-nums text-gray-600 select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(4, s + 0.25))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t("lightbox.zoomIn")}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={downloadSvg}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors"
              aria-label={t("lightbox.downloadSvg")}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">SVG</span>
            </button>
            <button
              onClick={downloadPng}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-colors"
              aria-label={t("lightbox.downloadPng")}
            >
              <FileImage className="w-4 h-4" />
              <span className="hidden sm:inline">PNG</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-1"
              aria-label={t("lightbox.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SVG viewport */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-6 min-h-[300px]">
          {/* Zoom wrapper — scale applied via inline style to avoid effect timing */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
            }}
          >
            {/* dangerouslySetInnerHTML: React renders SVG synchronously,
                no effect-timing race. svgRef only used for PNG export. */}
            <div
              ref={svgRef}
              className="[&_svg]:max-w-full [&_svg]:h-auto [&_svg]:block"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
