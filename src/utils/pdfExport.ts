import jsPDF from 'jspdf';
import { addPDFHeader, addPDFFooter, addCornerWatermark } from './pdfWatermark';

export interface PDFExportData {
  title: string;
  module: string;
  data: { [key: string]: any };
  calculations?: { [key: string]: any };
  recommendations?: string[];
}

export async function exportToPDF(exportData: PDFExportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  // Add CriderGPT branding header with logo
  let yPosition = await addPDFHeader(doc);

  // Title and date
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(exportData.title, margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const currentDate = new Date().toLocaleDateString();
  doc.text(`Generated: ${currentDate}`, margin, yPosition);
  
  yPosition += 20;

  // Input data section
  if (exportData.data && Object.keys(exportData.data).length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Input Data:', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    Object.entries(exportData.data).forEach(([key, value]) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${key}: ${value}`, margin + 10, yPosition);
      yPosition += 8;
    });
    yPosition += 10;
  }

  // Calculations section
  if (exportData.calculations && Object.keys(exportData.calculations).length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Calculations & Results:', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    Object.entries(exportData.calculations).forEach(([key, value]) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${key}: ${value}`, margin + 10, yPosition);
      doc.setFont(undefined, 'normal');
      yPosition += 8;
    });
    yPosition += 10;
  }

  // Recommendations section
  if (exportData.recommendations && exportData.recommendations.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Recommendations:', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    exportData.recommendations.forEach((rec, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      const lines = doc.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - 2 * margin - 10);
      doc.text(lines, margin + 10, yPosition);
      yPosition += lines.length * 5 + 3;
    });
  }

  // Add footer and corner watermark with logo
  addPDFFooter(doc);
  await addCornerWatermark(doc);

  // Generate filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `CriderGPT_${exportData.module}_${dateStr}.pdf`;
  
  doc.save(filename);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
