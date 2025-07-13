import { supabase } from "@/integrations/supabase/client";

export interface UsageLimits {
  tokens: number;
  tts: number;
}

export const PLAN_LIMITS: Record<string, UsageLimits> = {
  free: { tokens: 13, tts: 5 },
  plus: { tokens: 200, tts: 100 },
  plu: { tokens: 200, tts: 100 }, // Legacy format
  pro: { tokens: 500, tts: 9999999 } // Unlimited for Pro
};

export interface UserUsage {
  plan: string;
  tokensUsed: number;
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
        tokensUsed: 0,
        ttsUsed: 0,
        limits: PLAN_LIMITS.free
      };
    }

    const plan = usageData.user_plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    return {
      plan,
      tokensUsed: usageData.tokens_used || 0,
      ttsUsed: usageData.tts_requests || 0,
      limits
    };
  } catch (error) {
    console.error('Error fetching user usage:', error);
    return null;
  }
};

export const checkTokenLimit = async (userId: string, tokensToUse: number): Promise<{ allowed: boolean; usage?: UserUsage; error?: string }> => {
  const usage = await getUserUsage(userId);
  if (!usage) {
    return { allowed: false, error: 'Unable to fetch usage data' };
  }

  const newTokenCount = usage.tokensUsed + tokensToUse;
  if (newTokenCount > usage.limits.tokens) {
    return { 
      allowed: false, 
      usage,
      error: `Token limit exceeded. Used: ${usage.tokensUsed}/${usage.limits.tokens}. Requested: ${tokensToUse}` 
    };
  }

  return { allowed: true, usage };
};

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
      console.error('Error updating token usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating token usage:', error);
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