import { useEffect, useRef } from "react";

interface Props {
  svg: string;
  className?: string;
}

/** Safely renders an AI-generated SVG blueprint. Strips <script>/event handlers. */
export function BlueprintSVG({ svg, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cleaned = svg
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "");
    ref.current.innerHTML = cleaned;
    const svgEl = ref.current.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "auto");
      svgEl.style.maxWidth = "100%";
      svgEl.style.height = "auto";
      svgEl.style.background = "white";
      svgEl.style.borderRadius = "6px";
    }
  }, [svg]);

  return <div ref={ref} className={className} />;
}
