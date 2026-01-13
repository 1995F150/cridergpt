import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPattern {
  id: string;
  user_id: string;
  pattern_type: "topic" | "tone" | "time" | "category";
  pattern_key: string;
  frequency: number;
  confidence: number;
  last_seen: string;
  first_seen: string;
  metadata: Record<string, any>;
}

export interface UserPreference {
  id: string;
  user_id: string;
  preference_type: "tone" | "detail_level" | "format" | "language_style";
  preference_value: string;
  confidence: number;
}

// Comprehensive pattern detection rules
const CATEGORY_PATTERNS: Record<string, RegExp> = {
  fs_modding: /farming simulator|fs22|fs25|fs\d+|mod|modding|xml|i3d|giant editor|map editor|placeable|modhub/i,
  stock_investing: /stock|invest|portfolio|market|dividend|shares|trading|nasdaq|dow|s&p|etf|bonds|crypto|bitcoin/i,
  agriculture: /farm|crop|livestock|cattle|harvest|soil|tractor|field|irrigation|fertilizer|hay|corn|wheat|soybean|dairy/i,
  ffa_leadership: /ffa|leadership|cde|sae|agriscience|speaking|convention|chapter|officer|greenhand|historian/i,
  mechanics: /weld|engine|repair|mechanical|voltage|electrical|maintenance|tools|hydraulic|torque|horsepower/i,
  vehicles: /truck|car|diesel|engine|transmission|brake|tire|oil|dodge|ram|ford|chevy|cummins|powerstroke|duramax/i,
  coding: /code|program|function|typescript|python|javascript|api|database|react|web dev|github|npm|supabase/i,
  personal: /message|text|reply|girlfriend|boyfriend|friend|communication|talk|say|write to|respond to/i,
  financial: /budget|money|loan|interest|tax|expense|income|profit|cost|price|calculate/i,
  weather: /weather|rain|temperature|forecast|storm|wind|humidity|drought/i,
};

// Tone detection patterns
const TONE_PATTERNS = {
  formal: /please|kindly|would you|could you|i would like|thank you|sincerely|regarding|concerning/i,
  casual: /hey|yo|what's up|sup|gonna|wanna|gotta|ain't|y'all|dude|bro|lol|haha/i,
  urgent: /asap|urgent|immediately|right now|emergency|hurry|quick|fast|help!/i,
  curious: /how does|why does|what is|explain|tell me about|i wonder|curious/i,
  frustrated: /doesn't work|broken|frustrated|annoyed|angry|hate|stupid|wtf|damn/i,
  excited: /awesome|amazing|love it|can't wait|so excited|wow|incredible|fantastic/i,
};

// Detail level patterns
const DETAIL_PATTERNS = {
  concise: { minWords: 1, maxWords: 10, indicator: "short questions, single-word responses" },
  balanced: { minWords: 10, maxWords: 50, indicator: "normal conversation length" },
  detailed: { minWords: 50, maxWords: 999, indicator: "long explanations, multiple questions" },
};

export function usePatternDetection() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Detect topic/category from message
  const detectCategory = useCallback((message: string): string[] => {
    const detectedCategories: string[] = [];
    
    for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
      if (pattern.test(message)) {
        detectedCategories.push(category);
      }
    }
    
    return detectedCategories.length > 0 ? detectedCategories : ["general"];
  }, []);

  // Detect tone from message
  const detectTone = useCallback((message: string): string => {
    for (const [tone, pattern] of Object.entries(TONE_PATTERNS)) {
      if (pattern.test(message)) {
        return tone;
      }
    }
    return "neutral";
  }, []);

  // Detect preferred detail level
  const detectDetailLevel = useCallback((message: string): string => {
    const wordCount = message.split(/\s+/).length;
    
    if (wordCount <= DETAIL_PATTERNS.concise.maxWords) return "concise";
    if (wordCount <= DETAIL_PATTERNS.balanced.maxWords) return "balanced";
    return "detailed";
  }, []);

  // Store or update a pattern in the database
  const storePattern = useCallback(async (
    patternType: "topic" | "tone" | "time" | "category",
    patternKey: string,
    metadata?: Record<string, any>
  ): Promise<void> => {
    if (!user) return;

    try {
      // Check if pattern exists
      const { data: existingPattern } = await supabase
        .from("user_patterns")
        .select("id, frequency, confidence")
        .eq("user_id", user.id)
        .eq("pattern_type", patternType)
        .eq("pattern_key", patternKey)
        .maybeSingle();

      if (existingPattern) {
        // Update existing pattern - increase frequency and confidence
        const newFrequency = existingPattern.frequency + 1;
        const newConfidence = Math.min(0.99, existingPattern.confidence + 0.05);
        
        await supabase
          .from("user_patterns")
          .update({
            frequency: newFrequency,
            confidence: newConfidence,
            last_seen: new Date().toISOString(),
            metadata: metadata || {},
          })
          .eq("id", existingPattern.id);
      } else {
        // Create new pattern
        await supabase
          .from("user_patterns")
          .insert({
            user_id: user.id,
            pattern_type: patternType,
            pattern_key: patternKey,
            frequency: 1,
            confidence: 0.3,
            metadata: metadata || {},
          });
      }
    } catch (error) {
      console.error("Error storing pattern:", error);
    }
  }, [user]);

  // Store or update a preference
  const storePreference = useCallback(async (
    preferenceType: "tone" | "detail_level" | "format" | "language_style",
    preferenceValue: string
  ): Promise<void> => {
    if (!user) return;

    try {
      const { data: existingPref } = await supabase
        .from("user_preferences")
        .select("id, confidence")
        .eq("user_id", user.id)
        .eq("preference_type", preferenceType)
        .eq("preference_value", preferenceValue)
        .maybeSingle();

      if (existingPref) {
        // Increase confidence
        await supabase
          .from("user_preferences")
          .update({
            confidence: Math.min(0.99, existingPref.confidence + 0.1),
          })
          .eq("id", existingPref.id);
      } else {
        // Insert new preference
        await supabase
          .from("user_preferences")
          .insert({
            user_id: user.id,
            preference_type: preferenceType,
            preference_value: preferenceValue,
            confidence: 0.3,
          });
      }
    } catch (error) {
      console.error("Error storing preference:", error);
    }
  }, [user]);

  // Main function to analyze a message and store patterns
  const analyzeAndStorePatterns = useCallback(async (message: string): Promise<{
    categories: string[];
    tone: string;
    detailLevel: string;
  }> => {
    const categories = detectCategory(message);
    const tone = detectTone(message);
    const detailLevel = detectDetailLevel(message);

    if (user) {
      // Store all detected patterns
      for (const category of categories) {
        await storePattern("category", category);
      }
      await storePattern("tone", tone);
      await storePreference("tone", tone);
      await storePreference("detail_level", detailLevel);
    }

    return { categories, tone, detailLevel };
  }, [user, detectCategory, detectTone, detectDetailLevel, storePattern, storePreference]);

  // Get top patterns for a user
  const getTopPatterns = useCallback(async (limit: number = 5): Promise<UserPattern[]> => {
    if (!user) return [];

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_patterns")
        .select("*")
        .eq("user_id", user.id)
        .order("confidence", { ascending: false })
        .order("frequency", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as UserPattern[];
    } catch (error) {
      console.error("Error fetching patterns:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Get user preferences
  const getPreferences = useCallback(async (): Promise<UserPreference[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .order("confidence", { ascending: false });

      if (error) throw error;
      return (data || []) as UserPreference[];
    } catch (error) {
      console.error("Error fetching preferences:", error);
      return [];
    }
  }, [user]);

  // Decay old patterns (reduce confidence over time)
  const decayOldPatterns = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get patterns not seen in 30 days
      const { data: oldPatterns } = await supabase
        .from("user_patterns")
        .select("id, confidence")
        .eq("user_id", user.id)
        .lt("last_seen", thirtyDaysAgo.toISOString());

      if (oldPatterns) {
        for (const pattern of oldPatterns) {
          const newConfidence = Math.max(0.1, pattern.confidence - 0.1);
          await supabase
            .from("user_patterns")
            .update({ confidence: newConfidence })
            .eq("id", pattern.id);
        }
      }
    } catch (error) {
      console.error("Error decaying patterns:", error);
    }
  }, [user]);

  // Clear all patterns (for privacy)
  const clearAllPatterns = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      await supabase
        .from("user_patterns")
        .delete()
        .eq("user_id", user.id);

      await supabase
        .from("user_preferences")
        .delete()
        .eq("user_id", user.id);

      return true;
    } catch (error) {
      console.error("Error clearing patterns:", error);
      return false;
    }
  }, [user]);

  return {
    isLoading,
    detectCategory,
    detectTone,
    detectDetailLevel,
    analyzeAndStorePatterns,
    getTopPatterns,
    getPreferences,
    decayOldPatterns,
    clearAllPatterns,
    storePattern,
    storePreference,
  };
}
