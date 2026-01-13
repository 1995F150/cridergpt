import { useState, useCallback, useEffect } from "react";
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

export interface Suggestion {
  id: string;
  text: string;
  category: string;
  confidence: number;
  icon?: string;
}

// Suggestion templates by category
const SUGGESTION_TEMPLATES: Record<string, Suggestion[]> = {
  fs_modding: [
    { id: "fs1", text: "Help me configure XML for a placeable", category: "fs_modding", confidence: 0.8, icon: "🎮" },
    { id: "fs2", text: "What's new in FS25 modding?", category: "fs_modding", confidence: 0.7, icon: "🎮" },
    { id: "fs3", text: "Debug my mod channel settings", category: "fs_modding", confidence: 0.6, icon: "🎮" },
    { id: "fs4", text: "Convert my FS22 mod to FS25", category: "fs_modding", confidence: 0.7, icon: "🎮" },
  ],
  stock_investing: [
    { id: "st1", text: "Analyze market trends today", category: "stock_investing", confidence: 0.8, icon: "📈" },
    { id: "st2", text: "Compare dividend stocks", category: "stock_investing", confidence: 0.7, icon: "📈" },
    { id: "st3", text: "Calculate my portfolio returns", category: "stock_investing", confidence: 0.6, icon: "📈" },
    { id: "st4", text: "Best ETFs for long-term growth?", category: "stock_investing", confidence: 0.7, icon: "📈" },
  ],
  agriculture: [
    { id: "ag1", text: "What's the best crop rotation?", category: "agriculture", confidence: 0.8, icon: "🌾" },
    { id: "ag2", text: "Calculate fertilizer rates", category: "agriculture", confidence: 0.7, icon: "🌾" },
    { id: "ag3", text: "Soil health tips for my field", category: "agriculture", confidence: 0.6, icon: "🌾" },
    { id: "ag4", text: "When should I plant corn?", category: "agriculture", confidence: 0.7, icon: "🌾" },
  ],
  ffa_leadership: [
    { id: "ffa1", text: "Help me prepare for a CDE", category: "ffa_leadership", confidence: 0.8, icon: "🎽" },
    { id: "ffa2", text: "SAE project ideas for dairy", category: "ffa_leadership", confidence: 0.7, icon: "🎽" },
    { id: "ffa3", text: "Write a chapter meeting agenda", category: "ffa_leadership", confidence: 0.6, icon: "🎽" },
    { id: "ffa4", text: "FFA officer speech tips", category: "ffa_leadership", confidence: 0.7, icon: "🎽" },
  ],
  mechanics: [
    { id: "mech1", text: "Troubleshoot hydraulic issues", category: "mechanics", confidence: 0.8, icon: "🔧" },
    { id: "mech2", text: "Welding settings for 1/4\" steel", category: "mechanics", confidence: 0.7, icon: "🔧" },
    { id: "mech3", text: "Calculate voltage drop", category: "mechanics", confidence: 0.6, icon: "🔧" },
    { id: "mech4", text: "Diagnose electrical problems", category: "mechanics", confidence: 0.7, icon: "🔧" },
  ],
  vehicles: [
    { id: "veh1", text: "Troubleshoot my Cummins diesel", category: "vehicles", confidence: 0.8, icon: "🚗" },
    { id: "veh2", text: "Best maintenance schedule for trucks", category: "vehicles", confidence: 0.7, icon: "🚗" },
    { id: "veh3", text: "Compare diesel vs gas engines", category: "vehicles", confidence: 0.6, icon: "🚗" },
    { id: "veh4", text: "Transmission troubleshooting tips", category: "vehicles", confidence: 0.7, icon: "🚗" },
  ],
  coding: [
    { id: "code1", text: "Help me debug this TypeScript", category: "coding", confidence: 0.8, icon: "💻" },
    { id: "code2", text: "Build a React component", category: "coding", confidence: 0.7, icon: "💻" },
    { id: "code3", text: "Supabase query optimization", category: "coding", confidence: 0.6, icon: "💻" },
    { id: "code4", text: "API integration best practices", category: "coding", confidence: 0.7, icon: "💻" },
  ],
  personal: [
    { id: "per1", text: "Help me write a text message", category: "personal", confidence: 0.8, icon: "💬" },
    { id: "per2", text: "Draft a thoughtful response", category: "personal", confidence: 0.7, icon: "💬" },
    { id: "per3", text: "Make this sound more casual", category: "personal", confidence: 0.6, icon: "💬" },
    { id: "per4", text: "Help me explain something clearly", category: "personal", confidence: 0.7, icon: "💬" },
  ],
  financial: [
    { id: "fin1", text: "Calculate loan interest", category: "financial", confidence: 0.8, icon: "💰" },
    { id: "fin2", text: "Help me create a budget", category: "financial", confidence: 0.7, icon: "💰" },
    { id: "fin3", text: "Track my farm expenses", category: "financial", confidence: 0.6, icon: "💰" },
    { id: "fin4", text: "Calculate profit margins", category: "financial", confidence: 0.7, icon: "💰" },
  ],
  general: [
    { id: "gen1", text: "What can you help me with?", category: "general", confidence: 0.5, icon: "✨" },
    { id: "gen2", text: "Tell me about yourself", category: "general", confidence: 0.4, icon: "✨" },
    { id: "gen3", text: "Generate an image for me", category: "general", confidence: 0.5, icon: "🎨" },
    { id: "gen4", text: "Help me write an essay", category: "general", confidence: 0.5, icon: "📝" },
  ],
};

// Time-based suggestions
const TIME_BASED_SUGGESTIONS: Record<string, Suggestion[]> = {
  morning: [
    { id: "time1", text: "What's the weather looking like?", category: "weather", confidence: 0.6, icon: "🌅" },
    { id: "time2", text: "Plan my day", category: "productivity", confidence: 0.5, icon: "📋" },
  ],
  afternoon: [
    { id: "time3", text: "Quick calculation help", category: "general", confidence: 0.5, icon: "🧮" },
  ],
  evening: [
    { id: "time4", text: "Summarize what I learned today", category: "general", confidence: 0.5, icon: "📚" },
  ],
};

export function usePredictiveSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch top patterns directly (avoid circular dependency)
  const getTopPatterns = useCallback(async (limit: number = 5): Promise<UserPattern[]> => {
    if (!user) return [];

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
    }
  }, [user]);

  // Get time of day for contextual suggestions
  const getTimeOfDay = useCallback((): "morning" | "afternoon" | "evening" => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    return "evening";
  }, []);

  // Generate suggestions based on patterns
  const generateSuggestions = useCallback(async (): Promise<Suggestion[]> => {
    if (!user) {
      // Return general suggestions for non-authenticated users
      return SUGGESTION_TEMPLATES.general.slice(0, 3);
    }

    setIsLoading(true);
    try {
      const patterns = await getTopPatterns(5);
      const allSuggestions: Suggestion[] = [];

      // Add pattern-based suggestions
      for (const pattern of patterns) {
        if (pattern.pattern_type === "category" && SUGGESTION_TEMPLATES[pattern.pattern_key]) {
          const categorySuggestions = SUGGESTION_TEMPLATES[pattern.pattern_key];
          // Weight suggestions by pattern confidence
          const weightedSuggestions = categorySuggestions.map(s => ({
            ...s,
            confidence: s.confidence * pattern.confidence,
          }));
          allSuggestions.push(...weightedSuggestions);
        }
      }

      // Add time-based suggestions
      const timeOfDay = getTimeOfDay();
      if (TIME_BASED_SUGGESTIONS[timeOfDay]) {
        allSuggestions.push(...TIME_BASED_SUGGESTIONS[timeOfDay]);
      }

      // If no patterns detected, use general suggestions
      if (allSuggestions.length === 0) {
        allSuggestions.push(...SUGGESTION_TEMPLATES.general);
      }

      // Sort by confidence and deduplicate
      const uniqueSuggestions = allSuggestions
        .sort((a, b) => b.confidence - a.confidence)
        .filter((s, index, arr) => arr.findIndex(x => x.text === s.text) === index)
        .slice(0, 4);

      setSuggestions(uniqueSuggestions);
      return uniqueSuggestions;
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return SUGGESTION_TEMPLATES.general.slice(0, 3);
    } finally {
      setIsLoading(false);
    }
  }, [user, getTopPatterns, getTimeOfDay]);

  // Get contextual suggestions based on current input
  const getContextualSuggestions = useCallback((currentInput: string): Suggestion[] => {
    if (!currentInput.trim()) return suggestions;

    const input = currentInput.toLowerCase();
    const contextual: Suggestion[] = [];

    // Check each category for matches
    for (const [category, templates] of Object.entries(SUGGESTION_TEMPLATES)) {
      const categoryKeywords = category.split("_");
      if (categoryKeywords.some(keyword => input.includes(keyword))) {
        contextual.push(...templates.slice(0, 2));
      }
    }

    return contextual.length > 0 ? contextual.slice(0, 3) : suggestions.slice(0, 3);
  }, [suggestions]);

  // Refresh suggestions on mount and when user changes
  useEffect(() => {
    generateSuggestions();
  }, [user]);

  return {
    suggestions,
    isLoading,
    generateSuggestions,
    getContextualSuggestions,
    getTimeOfDay,
  };
}
