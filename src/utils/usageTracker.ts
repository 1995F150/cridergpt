import { supabase } from "@/integrations/supabase/client";

export interface UsageLimits {
  messages: number;
  tts: number;
}

// Daily message limits per plan
export const PLAN_LIMITS: Record<string, UsageLimits> = {
  free: { messages: 15, tts: 5 },
  plus: { messages: 100, tts: 100 },
  plu: { messages: 100, tts: 100 }, // Legacy format
  pro: { messages: 500, tts: 9999999 },
  lifetime: { messages: 9999999, tts: 9999999 } // Unlimited for Lifetime
};

export interface UserUsage {
  plan: string;
  messagesUsed: number;
  ttsUsed: number;
  limits: UsageLimits;
}

export const getUserUsage = async (userId: string): Promise<UserUsage | null> => {
  try {
    // Fetch current usage data
    const { data: usageData } = await supabase
      .from('ai_usage')
      .select('user_plan, tokens_used, tts_requests')
      .eq('user_id', userId)
      .single();

    if (!usageData) {
      // Create default usage record for new users
      await supabase
        .from('ai_usage')
        .insert({
          user_id: userId,
          user_plan: 'free',
          tokens_used: 0,
          tts_requests: 0
        });
      
      return {
        plan: 'free',
        messagesUsed: 0,
        ttsUsed: 0,
        limits: PLAN_LIMITS.free
      };
    }

    const plan = usageData.user_plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    return {
      plan,
      messagesUsed: usageData.tokens_used || 0, // tokens_used now represents messages
      ttsUsed: usageData.tts_requests || 0,
      limits
    };
  } catch (error) {
    console.error('Error fetching user usage:', error);
    return null;
  }
};

export const checkMessageLimit = async (userId: string): Promise<{ allowed: boolean; usage?: UserUsage; error?: string }> => {
  const usage = await getUserUsage(userId);
  if (!usage) {
    return { allowed: false, error: 'Unable to fetch usage data' };
  }

  if (usage.messagesUsed >= usage.limits.messages) {
    return { 
      allowed: false, 
      usage,
      error: `Daily message limit reached. Used: ${usage.messagesUsed}/${usage.limits.messages}` 
    };
  }

  return { allowed: true, usage };
};

// Keep for backward compatibility
export const checkTokenLimit = checkMessageLimit;

export const checkTTSLimit = async (userId: string): Promise<{ allowed: boolean; usage?: UserUsage; error?: string }> => {
  const usage = await getUserUsage(userId);
  if (!usage) {
    return { allowed: false, error: 'Unable to fetch usage data' };
  }

  if (usage.ttsUsed >= usage.limits.tts) {
    return { 
      allowed: false, 
      usage,
      error: `TTS limit exceeded. Used: ${usage.ttsUsed}/${usage.limits.tts}` 
    };
  }

  return { allowed: true, usage };
};

export const updateMessageUsage = async (userId: string): Promise<boolean> => {
  try {
    // Get current usage first
    const usage = await getUserUsage(userId);
    if (!usage) return false;

    const { error } = await supabase
      .from('ai_usage')
      .upsert({
        user_id: userId,
        tokens_used: usage.messagesUsed + 1, // Increment by 1 message
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating message usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating message usage:', error);
    return false;
  }
};

// Keep for backward compatibility
export const updateTokenUsage = async (userId: string, tokensUsed: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_usage')
      .upsert({
        user_id: userId,
        tokens_used: tokensUsed,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating usage:', error);
    return false;
  }
};

export const updateTTSUsage = async (userId: string): Promise<boolean> => {
  try {
    // Get current usage
    const usage = await getUserUsage(userId);
    if (!usage) return false;

    const { error } = await supabase
      .from('ai_usage')
      .upsert({
        user_id: userId,
        tts_requests: usage.ttsUsed + 1,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating TTS usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating TTS usage:', error);
    return false;
  }
};