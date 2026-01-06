import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName, analysisMode = "general", customPrompt } = await req.json();
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing file:', fileName, 'Mode:', analysisMode);

    let systemPrompt = "";
    switch (analysisMode) {
      case "agricultural":
        systemPrompt = "You are an expert agricultural consultant and FFA advisor. Analyze documents related to farming, livestock, crop management, and agricultural business. Provide detailed, actionable insights.";
        break;
      case "financial":
        systemPrompt = "You are a financial advisor specializing in agricultural and rural business finance. Analyze financial documents, budgets, and business plans with expertise.";
        break;
      case "legal":
        systemPrompt = "You are a legal expert in agricultural law, land use, and rural regulations. Analyze legal documents and provide clear explanations.";
        break;
      default:
        systemPrompt = "You are CriderGPT, a helpful AI assistant that analyzes documents thoroughly and answers questions accurately. Use a casual, friendly tone.";
    }

    // Extract text from base64 file
    let documentText = "";
    let isPDF = false;
    
    try {
      // Check file type from name or content
      const fileExtension = fileName?.toLowerCase().split('.').pop() || '';
      isPDF = fileExtension === 'pdf' || fileContent.includes('application/pdf');
      
      // Remove data URL prefix if present
      const base64Data = fileContent.includes(',') ? fileContent.split(',')[1] : fileContent;
      
      if (isPDF) {
        // For PDFs, we'll send the raw content and let the AI attempt to parse what it can
        documentText = `[PDF Document: ${fileName}]\n\nNote: This is a PDF file. Extracting readable text content...\n\n`;
        // Try to decode - PDFs have text markers we can extract
        try {
          const decoded = atob(base64Data);
          // Extract text between stream markers (simplified PDF text extraction)
          const textMatches = decoded.match(/\((.*?)\)/g);
          if (textMatches) {
            documentText += textMatches.slice(0, 500).map(m => m.slice(1, -1)).join(' ');
          }
        } catch {
          documentText += "[Binary PDF content - please provide text-based documents for better analysis]";
        }
      } else {
        // For text-based files (txt, docx content, etc.)
        documentText = atob(base64Data);
      }
    } catch (error) {
      console.error('Error decoding file:', error);
      throw new Error('Unable to read document content. Please ensure the file is in a supported text format (TXT, DOC).');
    }

    const userPrompt = customPrompt 
      ? `Please analyze this document with the following instructions: ${customPrompt}\n\nDocument: ${fileName}\n\nContent:\n${documentText.substring(0, 15000)}`
      : `Please provide a comprehensive analysis of this document titled "${fileName}".\n\nContent:\n${documentText.substring(0, 15000)}`;

    // Use Lovable AI Gateway instead of OpenAI directly
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limited. Please try again in a moment.",
          analysis: "⚠️ Too many requests. Please wait a moment and try again."
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted.",
          analysis: "⚠️ AI credits exhausted. Please add credits to continue."
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult = data.choices?.[0]?.message?.content;
    
    if (!analysisResult) {
      throw new Error('No valid AI response received');
    }

    console.log('Document analysis completed successfully');

    return new Response(JSON.stringify({ 
      analysis: analysisResult,
      fileName,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in document-ai-analysis function:', error);
    return new Response(JSON.stringify({ 
      analysis: '⚠️ Unable to analyze document. Please try again.',
      error: (error as Error).message || 'Failed to analyze document',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});