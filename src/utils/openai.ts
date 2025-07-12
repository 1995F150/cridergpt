import { supabase } from "@/integrations/supabase/client";

export async function getOpenAIResponse(userMessage: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('chat-with-ai', {
      body: { message: userMessage }
    });

    if (error) throw error;

    // Check if we hit the rate limit
    if (data.error && data.usage) {
      throw new Error(`${data.error} (Used: ${data.usage.used}/${data.usage.limit})`);
    }

    return data.response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    throw new Error(error.message || 'Failed to get AI response. Please try again.');
  }
}

// Example usage:
// getOpenAIResponse("Hey, what's up?").then(console.log);