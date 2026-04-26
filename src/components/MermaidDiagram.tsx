import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  flowchart: { curve: "basis" },
});

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const diagramId = useRef(id || `mmd-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!ref.current || !chart) return;
    let cancelled = false;
    (async () => {
      try {
        const { svg } = await mermaid.render(diagramId.current, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (err) {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre class="text-xs text-destructive p-4 whitespace-pre-wrap">Diagram error: ${
            err instanceof Error ? err.message : "unknown"
          }\n\n${chart}</pre>`;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto bg-muted/30 rounded-lg p-4 flex justify-center"
    />
  );
}
