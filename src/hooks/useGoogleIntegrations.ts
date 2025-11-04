import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type GoogleService = 'drive' | 'gmail' | 'calendar';

interface GoogleIntegration {
  service: GoogleService;
  connected: boolean;
  scopes: string[];
  last_synced?: string;
}

export function useGoogleIntegrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Record<GoogleService, GoogleIntegration>>({
    drive: { service: 'drive', connected: false, scopes: ['drive'] },
    gmail: { service: 'gmail', connected: false, scopes: ['gmail.readonly', 'gmail.send'] },
    calendar: { service: 'calendar', connected: false, scopes: ['calendar'] }
  });
  const [loading, setLoading] = useState(false);

  // Load integration status
  useEffect(() => {
    if (user) {
      loadIntegrationStatus();
    }
  }, [user]);

  const loadIntegrationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('google_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        const updatedIntegrations = { ...integrations };
        data.forEach((integration: any) => {
          const service = integration.service_name as GoogleService;
          if (updatedIntegrations[service]) {
            updatedIntegrations[service] = {
              service,
              connected: integration.is_connected,
              scopes: integration.scopes || [],
              last_synced: integration.last_synced
            };
          }
        });
        setIntegrations(updatedIntegrations);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const initiateOAuth = async (service: GoogleService) => {
    setLoading(true);
    try {
      const scopes = integrations[service].scopes.map(s => 
        `https://www.googleapis.com/auth/${s}`
      ).join(' ');

      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `access_type=offline&` +
        `state=${service}&` +
        `prompt=consent`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to initiate Google authentication',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleIntegration = async (service: GoogleService, enabled: boolean) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to enable integrations',
        variant: 'destructive'
      });
      return;
    }

    if (enabled && !integrations[service].connected) {
      // Initiate OAuth flow
      await initiateOAuth(service);
    } else if (!enabled && integrations[service].connected) {
      // Disconnect integration
      try {
        const { error } = await supabase
          .from('google_integrations')
          .update({ is_connected: false })
          .eq('user_id', user.id)
          .eq('service_name', service);

        if (error) throw error;

        setIntegrations(prev => ({
          ...prev,
          [service]: { ...prev[service], connected: false }
        }));

        toast({
          title: 'Integration Disabled',
          description: `Google ${service.charAt(0).toUpperCase() + service.slice(1)} disconnected`
        });
      } catch (error) {
        console.error('Error disconnecting:', error);
        toast({
          title: 'Error',
          description: 'Failed to disconnect integration',
          variant: 'destructive'
        });
      }
    }
  };

  const parseGoogleCommand = (message: string): { service: GoogleService; action: string; query: string } | null => {
    const lowerMessage = message.toLowerCase();

    // Gmail commands
    if (lowerMessage.includes('check') && (lowerMessage.includes('gmail') || lowerMessage.includes('email'))) {
      return { service: 'gmail', action: 'read', query: message };
    }
    if (lowerMessage.includes('send') && (lowerMessage.includes('email') || lowerMessage.includes('gmail'))) {
      return { service: 'gmail', action: 'send', query: message };
    }

    // Drive commands
    if ((lowerMessage.includes('read') || lowerMessage.includes('get')) && lowerMessage.includes('drive')) {
      return { service: 'drive', action: 'read', query: message };
    }
    if ((lowerMessage.includes('add') || lowerMessage.includes('save') || lowerMessage.includes('upload')) && lowerMessage.includes('drive')) {
      return { service: 'drive', action: 'write', query: message };
    }

    // Calendar commands
    if (lowerMessage.includes('create') && (lowerMessage.includes('event') || lowerMessage.includes('calendar'))) {
      return { service: 'calendar', action: 'create', query: message };
    }
    if ((lowerMessage.includes('check') || lowerMessage.includes('show')) && lowerMessage.includes('calendar')) {
      return { service: 'calendar', action: 'read', query: message };
    }

    return null;
  };

  const executeGoogleCommand = async (service: GoogleService, action: string, query: string) => {
    if (!integrations[service].connected) {
      toast({
        title: 'Integration Not Connected',
        description: `Please enable Google ${service.charAt(0).toUpperCase() + service.slice(1)} in settings`,
        variant: 'destructive'
      });
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-integration-handler', {
        body: { service, action, query }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Command execution error:', error);
      toast({
        title: 'Command Failed',
        description: `Failed to execute ${service} command`,
        variant: 'destructive'
      });
      return null;
    }
  };

  return {
    integrations,
    loading,
    toggleIntegration,
    parseGoogleCommand,
    executeGoogleCommand,
    loadIntegrationStatus
  };
}
