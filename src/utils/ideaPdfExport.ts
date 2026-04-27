import jsPDF from "jspdf";
import { addPDFHeader, addPDFFooter, addCornerWatermark } from "./pdfWatermark";

interface Part { name: string; category: string; qty: string; notes?: string; }
interface Step { phase: string; title: string; detail: string; }

export interface IdeaExport {
  title: string;
  prompt: string;
  summary?: string | null;
  mermaid?: string | null;
  blueprint_svg?: string | null;
  parts?: Part[];
  steps?: Step[];
  notes?: string;
}

async function svgToPng(svg: string, width = 800, height = 600): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    } catch { resolve(null); }
  });
}

export async function exportIdeaToPDF(idea: IdeaExport): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 18;

  let y = await addPDFHeader(doc);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(idea.title || "Untitled Idea", pageWidth - 2 * margin);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${new Date().toLocaleString()} — CriderGPT Idea Planner`, margin, y);
  y += 10;

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - 20) { doc.addPage(); y = 20; }
  };
  const sectionTitle = (label: string) => {
    ensureSpace(14);
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.text(label, margin, y);
    doc.setFont(undefined, "normal");
    y += 7;
    doc.setDrawColor(200);
    doc.line(margin, y - 3, pageWidth - margin, y - 3);
    y += 2;
  };
  const body = (txt: string) => {
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(txt, pageWidth - 2 * margin);
    lines.forEach((ln: string) => {
      ensureSpace(6);
      doc.text(ln, margin, y);
      y += 5;
    });
    y += 3;
  };

  // Original prompt
  sectionTitle("Original Idea");
  body(idea.prompt);

  // Summary
  if (idea.summary) {
    sectionTitle("Summary");
    body(idea.summary);
  }

  // Blueprint image
  if (idea.blueprint_svg) {
    sectionTitle("Visual Blueprint");
    const png = await svgToPng(idea.blueprint_svg, 1000, 750);
    if (png) {
      const imgW = pageWidth - 2 * margin;
      const imgH = (imgW * 750) / 1000;
      ensureSpace(imgH + 4);
      doc.addImage(png, "PNG", margin, y, imgW, imgH);
      y += imgH + 6;
    }
  }

  // Parts
  if (idea.parts && idea.parts.length) {
    sectionTitle("Parts & Materials");
    doc.setFontSize(9);
    const colX = [margin, margin + 70, margin + 110, margin + 130];
    doc.setFont(undefined, "bold");
    doc.text("Part", colX[0], y);
    doc.text("Category", colX[1], y);
    doc.text("Qty", colX[2], y);
    doc.text("Notes", colX[3], y);
    doc.setFont(undefined, "normal");
    y += 5;
    doc.setDrawColor(220);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
    idea.parts.forEach((p) => {
      const noteLines = doc.splitTextToSize(p.notes || "—", pageWidth - colX[3] - margin);
      const rowH = Math.max(5, noteLines.length * 4);
      ensureSpace(rowH + 2);
      doc.text(doc.splitTextToSize(p.name, 65), colX[0], y);
      doc.text(p.category, colX[1], y);
      doc.text(p.qty, colX[2], y);
      doc.text(noteLines, colX[3], y);
      y += rowH + 2;
    });
    y += 4;
  }

  // Steps
  if (idea.steps && idea.steps.length) {
    sectionTitle("Build Blueprint");
    idea.steps.forEach((s, i) => {
      ensureSpace(14);
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text(`${i + 1}. [${s.phase}] ${s.title}`, margin, y);
      doc.setFont(undefined, "normal");
      y += 5;
      const lines = doc.splitTextToSize(s.detail, pageWidth - 2 * margin - 4);
      lines.forEach((ln: string) => {
        ensureSpace(5);
        doc.text(ln, margin + 4, y);
        y += 4.5;
      });
      y += 3;
    });
  }

  // Notes
  if (idea.notes && idea.notes.trim()) {
    sectionTitle("Notes");
    body(idea.notes);
  }

  // Mermaid as text fallback
  if (idea.mermaid) {
    sectionTitle("System Diagram (Mermaid Source)");
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    idea.mermaid.split("\n").forEach((ln) => {
      ensureSpace(4);
      doc.text(ln.slice(0, 100), margin, y);
      y += 3.5;
    });
    doc.setFont(undefined, "normal");
  }

  addPDFFooter(doc);
  await addCornerWatermark(doc);

  const safe = (idea.title || "Idea").replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
  doc.save(`CriderGPT_Idea_${safe}_${new Date().toISOString().split("T")[0]}.pdf`);
}
