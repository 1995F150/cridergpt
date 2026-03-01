import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';
import { addPDFHeader, addPDFFooter, addCornerWatermark } from './pdfWatermark';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

interface FileGenerationOptions {
  userId: string;
  projectName?: string;
  toolName: string;
  fileType: 'pdf' | 'csv' | 'txt' | 'docx';
  content: any;
  title: string;
  relatedProjectId?: string;
  relatedCalculatorId?: string;
}

export class FileGenerator {
  static generateFileName(userId: string, projectName: string = 'project', toolName: string, fileType: string): string {
    const date = new Date().toISOString().split('T')[0];
    const userShort = userId.substring(0, 8);
    return `${userShort}_${projectName}_${toolName}_${date}.${fileType}`;
  }

  static async generatePDF(options: FileGenerationOptions): Promise<string | null> {
    try {
      const fileName = this.generateFileName(
        options.userId, 
        options.projectName, 
        options.toolName, 
        'pdf'
      );

      // Create PDF
      const doc = new jsPDF();
      
      // Add CriderGPT branding header with logo
      let yPosition = await addPDFHeader(doc);
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(options.title, 20, yPosition);
      yPosition += 10;
      
      // Add timestamp
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 15;
      
      if (options.content.results) {
        // Calculator results
        doc.setFontSize(14);
        doc.text('Results:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        Object.entries(options.content.results).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object') {
            doc.text(`${key}: ${JSON.stringify(value)}`, 20, yPosition);
          } else {
            doc.text(`${key}: ${value}`, 20, yPosition);
          }
          yPosition += 8;
        });
      }
      
      if (options.content.trainingContext && options.content.trainingContext.length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.text('Relevant Training Data:', 20, yPosition);
        yPosition += 12;
        
        options.content.trainingContext.forEach((training: any, index: number) => {
          doc.setFontSize(10);
          doc.text(`${index + 1}. ${training.content.substring(0, 100)}...`, 20, yPosition);
          yPosition += 8;
        });
      }

      // Handle plain text content
      if (typeof options.content === 'string') {
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(options.content, 170);
        lines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });
      }

      // Add footer and corner watermark with logo
      addPDFFooter(doc);
      await addCornerWatermark(doc);

      // Convert to blob
      const pdfBlob = doc.output('blob');
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save document record
      const { error: dbError } = await (supabase as any)
        .from('documents')
        .insert({
          user_id: options.userId,
          document_type: 'calculator_report',
          title: options.title,
          file_path: fileName,
          file_url: publicUrl,
          related_project_id: options.relatedProjectId,
          related_calculator_id: options.relatedCalculatorId,
          metadata: {
            tool_name: options.toolName,
            file_type: 'pdf',
            generated_at: new Date().toISOString()
          }
        });

      if (dbError) throw dbError;

      return publicUrl;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  }

  /**
   * Generate a CSV file from data
   */
  static async generateCSV(options: FileGenerationOptions): Promise<string | null> {
    try {
      const fileName = this.generateFileName(
        options.userId,
        options.projectName,
        options.toolName,
        'csv'
      );

      let csvContent = '';

      // Handle array of objects (most common case)
      if (Array.isArray(options.content)) {
        if (options.content.length > 0) {
          // Get headers from first object
          const headers = Object.keys(options.content[0]);
          csvContent = headers.join(',') + '\n';

          // Add rows
          options.content.forEach(row => {
            const values = headers.map(header => {
              const value = row[header];
              // Escape quotes and wrap in quotes if contains comma
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value ?? '';
            });
            csvContent += values.join(',') + '\n';
          });
        }
      } 
      // Handle object with results
      else if (options.content.results) {
        csvContent = 'Property,Value\n';
        Object.entries(options.content.results).forEach(([key, value]) => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          csvContent += `"${key}","${valueStr.replace(/"/g, '""')}"\n`;
        });
      }
      // Handle plain string
      else if (typeof options.content === 'string') {
        csvContent = options.content;
      }

      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, csvBlob, {
          contentType: 'text/csv',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save document record
      await (supabase as any).from('documents').insert({
        user_id: options.userId,
        document_type: 'csv_export',
        title: options.title,
        file_path: fileName,
        file_url: publicUrl,
        related_project_id: options.relatedProjectId,
        related_calculator_id: options.relatedCalculatorId,
        metadata: {
          tool_name: options.toolName,
          file_type: 'csv',
          generated_at: new Date().toISOString()
        }
      });

      return publicUrl;
    } catch (error) {
      console.error('Error generating CSV:', error);
      return null;
    }
  }

  /**
   * Generate a plain text file
   */
  static async generateTXT(options: FileGenerationOptions): Promise<string | null> {
    try {
      const fileName = this.generateFileName(
        options.userId,
        options.projectName,
        options.toolName,
        'txt'
      );

      let textContent = `${options.title}\n`;
      textContent += `${'='.repeat(options.title.length)}\n\n`;
      textContent += `Generated by CriderGPT on ${new Date().toLocaleString()}\n\n`;

      if (typeof options.content === 'string') {
        textContent += options.content;
      } else if (options.content.results) {
        textContent += 'Results:\n';
        textContent += '-'.repeat(40) + '\n';
        Object.entries(options.content.results).forEach(([key, value]) => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          textContent += `${key}: ${valueStr}\n`;
        });
      } else if (Array.isArray(options.content)) {
        options.content.forEach((item, index) => {
          textContent += `${index + 1}. ${JSON.stringify(item, null, 2)}\n`;
        });
      } else {
        textContent += JSON.stringify(options.content, null, 2);
      }

      textContent += '\n\n---\nPowered by CriderGPT';

      const txtBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, txtBlob, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      await (supabase as any).from('documents').insert({
        user_id: options.userId,
        document_type: 'text_export',
        title: options.title,
        file_path: fileName,
        file_url: publicUrl,
        related_project_id: options.relatedProjectId,
        related_calculator_id: options.relatedCalculatorId,
        metadata: {
          tool_name: options.toolName,
          file_type: 'txt',
          generated_at: new Date().toISOString()
        }
      });

      return publicUrl;
    } catch (error) {
      console.error('Error generating TXT:', error);
      return null;
    }
  }

  /**
   * Generate a Word document (DOCX)
   */
  static async generateDOCX(options: FileGenerationOptions): Promise<string | null> {
    try {
      const fileName = this.generateFileName(
        options.userId,
        options.projectName,
        options.toolName,
        'docx'
      );

      const children: Paragraph[] = [];

      // Title
      children.push(
        new Paragraph({
          text: options.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      // Timestamp
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated by CriderGPT on ${new Date().toLocaleString()}`,
              italics: true,
              size: 20,
              color: '666666',
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Content
      if (typeof options.content === 'string') {
        const paragraphs = options.content.split('\n');
        paragraphs.forEach(para => {
          children.push(
            new Paragraph({
              text: para,
              spacing: { after: 120 },
            })
          );
        });
      } else if (options.content.results) {
        children.push(
          new Paragraph({
            text: 'Results',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          })
        );

        Object.entries(options.content.results).forEach(([key, value]) => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${key}: `, bold: true }),
                new TextRun({ text: valueStr }),
              ],
              spacing: { after: 100 },
            })
          );
        });
      } else if (Array.isArray(options.content)) {
        options.content.forEach((item, index) => {
          children.push(
            new Paragraph({
              text: `${index + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`,
              spacing: { after: 100 },
            })
          );
        });
      }

      // Footer
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '\n\nPowered by CriderGPT',
              italics: true,
              size: 18,
              color: '999999',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        })
      );

      const doc = new Document({
        sections: [{ children }],
        creator: 'CriderGPT',
        title: options.title,
        description: `Generated by CriderGPT - ${options.toolName}`,
      });

      const docxBuffer = await Packer.toBlob(doc);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, docxBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      await (supabase as any).from('documents').insert({
        user_id: options.userId,
        document_type: 'word_document',
        title: options.title,
        file_path: fileName,
        file_url: publicUrl,
        related_project_id: options.relatedProjectId,
        related_calculator_id: options.relatedCalculatorId,
        metadata: {
          tool_name: options.toolName,
          file_type: 'docx',
          generated_at: new Date().toISOString()
        }
      });

      return publicUrl;
    } catch (error) {
      console.error('Error generating DOCX:', error);
      return null;
    }
  }

  /**
   * Generate file based on type
   */
  static async generateFile(options: FileGenerationOptions): Promise<string | null> {
    switch (options.fileType) {
      case 'pdf':
        return this.generatePDF(options);
      case 'csv':
        return this.generateCSV(options);
      case 'txt':
        return this.generateTXT(options);
      case 'docx':
        return this.generateDOCX(options);
      default:
        console.error('Unsupported file type:', options.fileType);
        return null;
    }
  }

  static async checkDocumentUsage(userId: string): Promise<{ canProceed: boolean; reason: string }> {
    try {
      const { data, error } = await supabase.rpc('can_user_make_request', {
        user_uuid: userId,
        request_type: 'documents',
        requested_amount: 1
      });

      if (error) throw error;
      return data as { canProceed: boolean; reason: string };
    } catch (error) {
      console.error('Error checking document usage:', error);
      return { canProceed: false, reason: 'Error checking usage limits' };
    }
  }

  static async recordDocumentUsage(userId: string): Promise<void> {
    try {
      await supabase.rpc('record_usage', {
        user_uuid: userId,
        request_type: 'documents',
        amount_used: 1
      });
    } catch (error) {
      console.error('Error recording document usage:', error);
    }
  }
}

// Create storage bucket for documents if it doesn't exist
export const initializeDocumentStorage = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const documentsBucket = buckets?.find(bucket => bucket.name === 'documents');
    
    if (!documentsBucket) {
      await supabase.storage.createBucket('documents', {
        public: true,
        allowedMimeTypes: [
          'application/pdf', 
          'text/csv', 
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        fileSizeLimit: 10485760 // 10MB
      });
    }
  } catch (error) {
    console.error('Error initializing document storage:', error);
  }
};