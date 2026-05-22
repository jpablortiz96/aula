"use client";

import { useEffect, useRef, useState } from "react";

let mermaidId = 0;

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export function MermaidRenderer({ chart, className }: MermaidRendererProps) {
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
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void render();
    return () => { cancelled = true; };
  }, [chart]);

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
      className={`overflow-x-auto w-full ${className ?? ""}`}
      aria-label="Mind map diagram"
    />
  );
}
