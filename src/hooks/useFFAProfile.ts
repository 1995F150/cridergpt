import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Chapter {
  id: string;
  name: string;
  state: string;
  city: string | null;
}

export interface FFAProfile {
  id: string;
  user_id: string;
  chapter_id: string | null;
  state: string | null;
  officer_role: string | null;
  is_advisor: boolean;
  graduation_year: number | null;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useFFAProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<FFAProfile | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .order('state', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setChapters((data as Chapter[]) || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setChapter(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_ffa_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData as FFAProfile);
        
        if (profileData.chapter_id) {
          const { data: chapterData, error: chapterError } = await supabase
            .from('chapters')
            .select('*')
            .eq('id', profileData.chapter_id)
            .single();

          if (chapterError && chapterError.code !== 'PGRST116') {
            throw chapterError;
          }
          setChapter(chapterData as Chapter);
        }
      }
    } catch (error) {
      console.error('Error fetching FFA profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (data: {
    chapter_id: string;
    state: string;
    officer_role?: string;
    is_advisor?: boolean;
    graduation_year?: number;
  }) => {
    if (!user) return null;

    try {
      const { data: newProfile, error } = await supabase
        .from('user_ffa_profiles')
        .insert({
          user_id: user.id,
          chapter_id: data.chapter_id,
          state: data.state,
          officer_role: data.officer_role || null,
          is_advisor: data.is_advisor || false,
          graduation_year: data.graduation_year || null,
          setup_completed: true,
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(newProfile as FFAProfile);
      toast({
        title: "FFA Profile Created",
        description: "Your FFA chapter setup is complete!",
      });

      return newProfile;
    } catch (error) {
      console.error('Error creating FFA profile:', error);
      toast({
        title: "Error",
        description: "Failed to create FFA profile",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProfile = async (data: Partial<FFAProfile>) => {
    if (!user || !profile) return null;

    try {
      const { data: updatedProfile, error } = await supabase
        .from('user_ffa_profiles')
        .update(data)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(updatedProfile as FFAProfile);
      toast({
        title: "Profile Updated",
        description: "Your FFA profile has been updated",
      });

      return updatedProfile;
    } catch (error) {
      console.error('Error updating FFA profile:', error);
      toast({
        title: "Error",
        description: "Failed to update FFA profile",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    fetchChapters();
    fetchProfile();
  }, [user]);

  return {
    profile,
    chapter,
    chapters,
    loading,
    needsSetup: !loading && !profile?.setup_completed,
    isOfficer: !!profile?.officer_role,
    isAdvisor: profile?.is_advisor || false,
    createProfile,
    updateProfile,
    refetch: fetchProfile,
  };
}
