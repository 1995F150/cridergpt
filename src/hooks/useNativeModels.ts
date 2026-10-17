import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { CriderModelDef } from '@/config/criderGPTModels';
export function useNativeModels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['native-cridergpt-models', user?.id], enabled: Boolean(user), staleTime: 60000, retry: false,
    queryFn: async (): Promise<CriderModelDef[]> => {
      const { data, error } = await supabase.functions.invoke('cridergpt-ubuntu-api', { body: { action: 'public_models' } });
      if (error || data?.error) throw new Error(data?.error || 'Could not load native server models. Your existing models are unchanged.');
      if (!Array.isArray(data?.models)) throw new Error('Native model catalog was unreadable.');
      return data.models.filter((model: any) => model.type === 'text' && typeof model.id === 'string').map((model: any) => ({
        id: `native:${model.id}` as CriderModelDef['id'], name: model.name, backend: model.id,
        tagline: 'Native server checkpoint · experimental', description: 'Runs your selected CriderGPT checkpoint on Ubuntu. Quality is experimental; web search currently requires Andromeda.',
        temperature: 0, personality: '', speed: 'slow', capability: 'basic', requiredPlan: 'free', vision: false,
      }));
    },
  });
}
