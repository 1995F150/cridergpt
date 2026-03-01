import { supabase } from "@/integrations/supabase/client";

export interface UpdateLogData {
  updateType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export const logUpdate = async (data: UpdateLogData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No authenticated user found, skipping update log');
      return;
    }

    const { error } = await (supabase as any)
      .from('user_updates')
      .insert({
        user_id: user.id,
        update_type: data.updateType,
        title: data.title,
        description: data.description,
        metadata: data.metadata
      });

    if (error) {
      console.error('Error logging update:', error);
    }
  } catch (error) {
    console.error('Error in logUpdate:', error);
  }
};

// Predefined update types for consistency
export const UpdateTypes = {
  API_KEY_ADDED: 'api_key_added',
  TTS_REQUEST: 'tts_request',
  AI_REQUEST: 'ai_request',
  FILE_UPLOAD: 'file_upload',
  PROJECT_CREATED: 'project_created',
  FEATURE_UNLOCKED: 'feature_unlocked',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SETTINGS_CHANGED: 'settings_changed',
  MEDIA_GENERATED: 'media_generated',
} as const;