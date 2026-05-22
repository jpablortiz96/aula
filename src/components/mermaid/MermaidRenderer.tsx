"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/hooks/useT";

let mermaidId = 0;

interface MermaidRendererProps {
  chart:      string;
  className?: string;
  onRender?:  (svg: string) => void;
  onExpand?:  () => void;
}

export function MermaidRenderer({ chart, className, onRender, onExpand }: MermaidRendererProps) {
  const t            = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const id = `mermaid-${++mermaidId}`;
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          mindmap: { padding: 16 },
        });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
          onRender?.(svg);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void render();
    return () => { cancelled = true; };
  }, [chart, onRender]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
        <p className="text-xs text-red-600 font-mono break-all">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto w-full ${onExpand ? "cursor-pointer hover:opacity-90 transition-opacity" : ""} ${className ?? ""}`}
      onClick={onExpand}
      title={onExpand ? t("lightbox.expand") : undefined}
      aria-label="Mind map diagram"
    />
  );
}
