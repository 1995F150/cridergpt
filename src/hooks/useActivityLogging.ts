import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ActivityType = 'chat_message' | 'file_upload' | 'login' | 'feature_access' | 'ai_interaction';

interface LogActivityOptions {
  activityType: ActivityType;
  content?: string;
  metadata?: Record<string, unknown>;
}

export function useActivityLogging() {
  const { user } = useAuth();

  const logActivity = useCallback(async ({ activityType, content, metadata = {} }: LogActivityOptions) => {
    if (!user) return;

    try {
      // Check if user is being monitored by any guardian
      const { data: relationships } = await supabase
        .from('guardian_relationships')
        .select('id, guardian_id')
        .eq('child_id', user.id)
        .eq('status', 'accepted')
        .eq('monitoring_enabled', true);

      // If no active monitoring, skip logging
      if (!relationships || relationships.length === 0) return;

      // Sanitize content (limit length, remove sensitive data)
      const sanitizedContent = content 
        ? content.slice(0, 500).replace(/password|secret|token/gi, '[REDACTED]')
        : null;

      // Insert activity log
      const { data: activityLog, error } = await supabase
        .from('child_activity_logs')
        .insert([{
          child_id: user.id,
          activity_type: activityType,
          activity_content: sanitizedContent,
          metadata
        }])
        .select()
        .single();

      if (error) {
        console.error('Error logging activity:', error);
        return;
      }

      // Trigger AI analysis for chat messages and AI interactions
      if (activityLog && (activityType === 'chat_message' || activityType === 'ai_interaction')) {
        analyzeActivityAsync(activityLog.id, sanitizedContent || '', relationships.map(r => r.guardian_id));
      }

    } catch (err) {
      console.error('Activity logging error:', err);
    }
  }, [user]);

  // Async AI analysis (fire and forget)
  const analyzeActivityAsync = async (activityLogId: string, content: string, guardianIds: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-child-activity', {
        body: {
          activityLogId,
          content,
          guardianIds
        }
      });

      if (error) {
        console.error('AI analysis error:', error);
      }
    } catch (err) {
      console.error('AI analysis invocation error:', err);
    }
  };

  // Convenience methods for different activity types
  const logChatMessage = useCallback((content: string, metadata?: Record<string, unknown>) => {
    return logActivity({ activityType: 'chat_message', content, metadata });
  }, [logActivity]);

  const logFileUpload = useCallback((fileName: string, fileType: string) => {
    return logActivity({ 
      activityType: 'file_upload', 
      content: fileName,
      metadata: { fileType }
    });
  }, [logActivity]);

  const logLogin = useCallback(() => {
    return logActivity({ 
      activityType: 'login',
      metadata: { timestamp: new Date().toISOString() }
    });
  }, [logActivity]);

  const logFeatureAccess = useCallback((featureName: string) => {
    return logActivity({ 
      activityType: 'feature_access',
      content: featureName
    });
  }, [logActivity]);

  const logAIInteraction = useCallback((userInput: string, aiResponse: string) => {
    return logActivity({ 
      activityType: 'ai_interaction',
      content: userInput,
      metadata: { responsePreview: aiResponse.slice(0, 200) }
    });
  }, [logActivity]);

  return {
    logActivity,
    logChatMessage,
    logFileUpload,
    logLogin,
    logFeatureAccess,
    logAIInteraction
  };
}
