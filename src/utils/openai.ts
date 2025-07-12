import { supabase } from "@/integrations/supabase/client";

export async function getOpenAIResponse(userMessage: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('chat-with-ai', {
      body: { message: userMessage }
    });

    if (error) throw error;

    return data.response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    throw new Error('Failed to get AI response. Please try again.');
  }
}

// Example usage:
// getOpenAIResponse("Hey, what's up?").then(console.log);