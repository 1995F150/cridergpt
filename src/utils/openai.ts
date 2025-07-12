import { supabase } from "@/integrations/supabase/client";

// For demo, set user's plan here (should come from your real user auth)
const userPlan = "free"; // Options: "free", "plu", "pro"

const TOKEN_LIMITS = {
  free: 13,
  plu: 200,
  pro: 500
};

const REQUESTS_KEY = "ai_token_count";

function getTokenLimit() {
  return TOKEN_LIMITS[userPlan] || 0;
}

function getTokenCount() {
  return Number(localStorage.getItem(REQUESTS_KEY)) || 0;
}

function increaseTokenCount() {
  const count = getTokenCount() + 1;
  localStorage.setItem(REQUESTS_KEY, count.toString());
  return count;
}

export async function getOpenAIResponse(userMessage: string): Promise<string> {
  // Check token limit before making the request
  if (getTokenCount() >= getTokenLimit()) {
    alert("You've hit your plan's token limit! 🚫 Upgrade for more AI sauce.");
    return "Token limit reached.";
  }

  try {
    const { data, error } = await supabase.functions.invoke('chat-with-ai', {
      body: { message: userMessage }
    });

    if (error) throw error;

    // Only increase token count if the request was successful
    increaseTokenCount();

    return data.response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    throw new Error('Failed to get AI response. Please try again.');
  }
}

// Example usage:
// getOpenAIResponse("Hey, what's up?").then(console.log);