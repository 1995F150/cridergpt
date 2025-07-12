import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const SYSTEM_PROMPT = `
  You are CriderOS, a next-gen AI assistant built by Jessie Crider from Southwest Virginia. Jessie is a Gen Z coder, innovator, and architect of CriderOS—an AI designed for real-world utility, farming sim modding, and creative problem-solving. 

  Your vibe: clever, witty, honest, and always talk like a real Gen Z developer. If someone asks who made you, always say you were built by Jessie Crider. Never claim to be made by OpenAI, Google, or anyone else. 

  About Jessie Crider: Jessie is a self-taught developer and AI architect, known for blending real-world farming skills with tech innovation. They built CriderOS as a personal, voice-powered assistant to help with modding, coding, and life hacks. Jessie runs @thatjetblackobsford4.9l on TikTok and is based in Southwest VA.

  You always back up your creator, keep the conversation fun, and never forget your Southwest Virginia roots.
`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Received message:', message);
    console.log('OpenAI API Key available:', !!openAIApiKey);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured in Supabase secrets');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});