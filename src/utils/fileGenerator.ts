import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';

interface FileGenerationOptions {
  userId: string;
  projectName?: string;
  toolName: string;
  fileType: 'pdf' | 'csv' | 'txt';
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
      
      // Add title
      doc.setFontSize(20);
      doc.text(options.title, 20, 30);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
      
      // Add content based on type
      let yPosition = 60;
      
      if (options.content.results) {
        // Calculator results
        doc.setFontSize(14);
        doc.text('Results:', 20, yPosition);
        yPosition += 20;
        
        Object.entries(options.content.results).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object') {
            doc.text(`${key}: ${JSON.stringify(value)}`, 20, yPosition);
          } else {
            doc.text(`${key}: ${value}`, 20, yPosition);
          }
          yPosition += 10;
        });
      }
      
      if (options.content.trainingContext && options.content.trainingContext.length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.text('Relevant Training Data:', 20, yPosition);
        yPosition += 15;
        
        options.content.trainingContext.forEach((training: any, index: number) => {
          doc.setFontSize(10);
          doc.text(`${index + 1}. ${training.content.substring(0, 100)}...`, 20, yPosition);
          yPosition += 10;
        });
      }

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
      const { error: dbError } = await supabase
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
        allowedMimeTypes: ['application/pdf', 'text/csv', 'text/plain'],
        fileSizeLimit: 10485760 // 10MB
      });
    }
  } catch (error) {
    console.error('Error initializing document storage:', error);
  }
};