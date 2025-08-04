
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFeatureAccess(featureName: string) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeatureAccess = async () => {
      if (!user || !featureName) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('user_has_feature_access', {
          feature_name: featureName
        });

        if (error) {
          console.error('Error checking feature access:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data || false);
        }
      } catch (error) {
        console.error('Feature access check error:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkFeatureAccess();
  }, [user, featureName]);

  return { hasAccess, loading };
}
