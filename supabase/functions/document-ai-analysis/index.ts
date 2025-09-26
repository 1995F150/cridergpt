import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText, question, analysisType = "general" } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = "";
    switch (analysisType) {
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
        systemPrompt = "You are a helpful AI assistant that analyzes documents thoroughly and answers questions accurately.";
    }

    console.log('Analyzing document with type:', analysisType);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: `Please analyze the following document and answer the question: "${question}"\n\nDocument content:\n${documentText}` 
          }
        ],
        max_completion_tokens: 2000,
        stream: false
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to analyze document');
    }

    const data = await response.json();
    console.log('Document analysis completed');

    return new Response(JSON.stringify({ 
      analysis: data.choices[0].message.content,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in document-ai-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Failed to analyze document',
      details: (error as Error).toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});