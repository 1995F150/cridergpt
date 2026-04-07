/**
 * Legacy Chatbot Engine — "chatbot_jessie.py" reborn in TypeScript
 * 
 * This is the very first AI system Jessie ever built, originally a Python
 * command-line chatbot created around his birthday (early June).
 * Now repurposed as an offline fallback and Easter egg for CriderGPT.
 * 
 * Original file preserved at: public/legacy/chatbot_jessie.py
 */

interface LegacyResponse {
  text: string;
  source: 'legacy-chatbot';
  isOfflineFallback: boolean;
}

// Extended keyword rules — original chatbot_jessie.py patterns + expanded coverage
const RULES: Array<{ keywords: string[]; response: string }> = [
  // Original chatbot_jessie.py rules
  { keywords: ['hello', 'hi', 'hey'], response: "Hey there! How can I help you today?" },
  { keywords: ['how are you'], response: "I'm doing great. Thanks for asking!" },
  { keywords: ['your name'], response: "I'm CriderGPT — but I started as a simple Python chatbot on a command line." },
  { keywords: ['help'], response: "I'm here for you! Ask me anything — though I'm running in legacy mode right now, so my answers are limited." },
  { keywords: ['bye', 'goodbye', 'see you'], response: "Take care! Talk to you later. 👋" },
  
  // Extended rules for practical offline use
  { keywords: ['farming simulator', 'fs25', 'fs22', 'giants'], response: "I know you love Farming Simulator modding! I can't do deep analysis offline, but check your GIANTS Editor project files or the modhub for help." },
  { keywords: ['blender', '3d model'], response: "For Blender work, make sure your project files are saved. I can help more when I'm back online!" },
  { keywords: ['mod', 'modding', 'xml', 'lua'], response: "For mod files, check your XML syntax and LUA scripts. Common issues: missing closing tags, wrong fillType names, or path errors in i3d files." },
  { keywords: ['docker', 'container'], response: "Your Docker stack runs on port 5000 (voice), 5050 (backup), 5100 (agent). Run 'start.bat' in public/voice-engine to start everything." },
  { keywords: ['password', 'login', 'account'], response: "I can't help with account issues offline. Try resetting your password through the login page when you're back online." },
  { keywords: ['error', 'bug', 'broken', 'crash'], response: "Sorry you're hitting issues! Try refreshing the page, clearing cache, or checking the browser console (F12) for error details." },
  { keywords: ['price', 'plan', 'subscription', 'cost'], response: "CriderGPT offers Free, Basic ($4.99/mo), Pro ($9.99/mo), and Lifetime ($29.99) plans. Check the pricing page for full details!" },
  { keywords: ['thank', 'thanks', 'appreciate'], response: "You're welcome! Happy to help. 😊" },
  { keywords: ['weather', 'forecast'], response: "I can't check the weather offline, but try weather.gov or your phone's weather app!" },
  { keywords: ['time', 'date', 'what day'], response: `Right now it's ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.` },
];

/**
 * Process a message through the legacy keyword-matching engine.
 * Returns a response if a match is found, null otherwise.
 */
export function legacyChatbotResponse(input: string): LegacyResponse | null {
  const lower = input.toLowerCase().trim();
  
  if (!lower) return null;

  for (const rule of RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return {
        text: rule.response,
        source: 'legacy-chatbot',
        isOfflineFallback: true,
      };
    }
  }

  // Default fallback — the original chatbot_jessie.py behavior
  return {
    text: "Hmm... I'm running in legacy mode right now and I'm not sure how to respond to that. Try again when the full AI is back online, or keep it simple!",
    source: 'legacy-chatbot',
    isOfflineFallback: true,
  };
}

/**
 * Check if the AI API is reachable.
 */
export async function isAIOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-ai`, {
      method: 'OPTIONS',
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    return res.ok || res.status === 204 || res.status === 405;
  } catch {
    return false;
  }
}

/**
 * Get the training data pairs from the legacy chatbot for corpus seeding.
 */
export function getLegacyTrainingPairs(): Array<{ input: string; output: string; category: string }> {
  return RULES.map(rule => ({
    input: rule.keywords.join(', '),
    output: rule.response,
    category: 'legacy_chatbot_personality',
  }));
}
