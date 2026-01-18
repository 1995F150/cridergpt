import jsPDF from 'jspdf';

// CriderGPT logo path - stored in public folder for easy loading
// Using absolute URL to ensure it loads correctly in all contexts
const LOGO_PATH = '/cridergpt-logo.png';
const LOGO_WIDTH = 30;
const LOGO_HEIGHT = 30;

// Cache for the loaded logo image
let cachedLogo: string | null = null;

/**
 * Load the CriderGPT logo as base64 for PDF embedding
 */
export async function loadLogoForPDF(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  
  try {
    // Build absolute URL to ensure it works in all contexts
    const baseUrl = window.location.origin;
    const logoUrl = `${baseUrl}${LOGO_PATH}`;
    
    console.log('📄 Loading PDF logo from:', logoUrl);
    
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.error('Failed to fetch logo:', response.status, response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogo = reader.result as string;
        console.log('✅ Logo loaded successfully for PDF');
        resolve(cachedLogo);
      };
      reader.onerror = () => {
        console.error('Failed to read logo blob');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo for PDF:', error);
    return null;
  }
}

/**
 * Add CriderGPT branding header to a PDF document
 * Includes logo image and text branding
 */
export async function addPDFHeader(doc: jsPDF): Promise<number> {
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 15;
  
  // Try to add logo
  const logo = await loadLogoForPDF();
  if (logo) {
    const logoX = (pageWidth - LOGO_WIDTH) / 2;
    doc.addImage(logo, 'PNG', logoX, yPosition, LOGO_WIDTH, LOGO_HEIGHT);
    yPosition += LOGO_HEIGHT + 5;
  }
  
  // Add CriderGPT text branding
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 51); // Green color matching logo
  doc.text('CriderGPT', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Professional Calculator Suite', pageWidth / 2, yPosition, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return yPosition + 15;
}

/**
 * Add CriderGPT branding footer to all pages of a PDF
 */
export function addPDFFooter(doc: jsPDF): void {
  const pageCount = doc.internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Powered by CriderGPT', pageWidth / 2, 285, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 285, { align: 'right' });
  }
}

/**
 * Add a small watermark logo to the corner of each page
 */
export async function addCornerWatermark(doc: jsPDF): Promise<void> {
  const logo = await loadLogoForPDF();
  if (!logo) return;
  
  const pageCount = doc.internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.width;
  const smallLogoSize = 15;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Add small logo in bottom-left corner
    doc.addImage(logo, 'PNG', 10, 270, smallLogoSize, smallLogoSize);
  }
}
