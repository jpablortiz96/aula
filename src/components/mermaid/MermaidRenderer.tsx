"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/hooks/useT";
import { SvgLightbox } from "@/components/ui/SvgLightbox";

let mermaidCounter = 0;

interface MermaidRendererProps {
  chart:      string;
  filename?:  string;
  className?: string;
}

export function MermaidRenderer({ chart, filename = "aula-mindmap", className }: MermaidRendererProps) {
  const t            = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup,    setSvgMarkup]    = useState<string>("");
  const [error,        setError]        = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const idRef = useRef(`mermaid-${++mermaidCounter}`);

  useEffect(() => {
    let cancelled = false;
    const id = idRef.current;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default" });
        const { svg } = await mermaid.render(id, chart);
        if (cancelled) return;
        setSvgMarkup(svg);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    void render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
        <details>
          <summary className="text-xs text-red-600 cursor-pointer">Error rendering mind map</summary>
          <pre className="text-xs mt-2 text-red-500 whitespace-pre-wrap break-all">{error}</pre>
        </details>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`overflow-x-auto w-full ${svgMarkup ? "cursor-pointer hover:opacity-90 transition-opacity" : ""} ${className ?? ""}`}
        onClick={() => svgMarkup && setLightboxOpen(true)}
        title={svgMarkup ? t("lightbox.expand") : undefined}
        aria-label="Mind map diagram"
      />
      <SvgLightbox
        svgMarkup={svgMarkup}
        filename={filename}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
