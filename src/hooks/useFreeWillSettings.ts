import { useMemo } from 'react';
import { useSubscriptionStatus } from './useSubscriptionStatus';

/**
 * Free Will is now ON BY DEFAULT for every CriderGPT model.
 * The plan controls the *intensity ceiling* (how many autonomous tool/reasoning
 * steps a single response is allowed to chain), not whether free will is on.
 *
 * Free / Plus / Pro / Lifetime → 2 / 5 / 10 / 25 reasoning steps per turn.
 * Side-effect tools (SMS, calendar writes, purchases) always require either
 * an explicit user request or a confirmed action — never silent.
 */
export interface FreeWillLimits {
  enabled: true;
  maxReasoningSteps: number;
  maxToolCallsPerTurn: number;
  allowAutoSideEffects: boolean; // SMS / writes / purchases without asking
  plan: string;
}

const PLAN_LIMITS: Record<string, Omit<FreeWillLimits, 'enabled' | 'plan'>> = {
  free:     { maxReasoningSteps: 2,  maxToolCallsPerTurn: 2,  allowAutoSideEffects: false },
  plus:     { maxReasoningSteps: 5,  maxToolCallsPerTurn: 5,  allowAutoSideEffects: false },
  pro:      { maxReasoningSteps: 10, maxToolCallsPerTurn: 8,  allowAutoSideEffects: false },
  lifetime: { maxReasoningSteps: 25, maxToolCallsPerTurn: 15, allowAutoSideEffects: true  },
};

export function useFreeWillSettings(): FreeWillLimits {
  const { plan } = useSubscriptionStatus();
  return useMemo(() => {
    const key = (plan || 'free').toLowerCase();
    const limits = PLAN_LIMITS[key] || PLAN_LIMITS.free;
    return { enabled: true, plan: key, ...limits };
  }, [plan]);
}

export const FREE_WILL_PLAN_LIMITS = PLAN_LIMITS;
