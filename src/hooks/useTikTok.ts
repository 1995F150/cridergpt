import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useTikTok() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tiktokUserId, setTiktokUserId] = useState<string | null>(null);

  useEffect(() => {
    if (user) checkConnection();
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state === 'tiktok_connect') {
      exchangeCode(code);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-auth', {
        body: { action: 'check_connection' },
      });
      if (!error && data) {
        setConnected(data.connected);
        setTiktokUserId(data.tiktok_user_id);
      }
    } catch (e) {
      console.error('TikTok check error:', e);
    }
  };

  const connectTikTok = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-auth', {
        body: { action: 'get_auth_url' },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exchangeCode = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-auth', {
        body: { action: 'exchange_code', code },
      });
      if (error) throw error;
      if (data?.success) {
        setConnected(true);
        setTiktokUserId(data.tiktok_user_id);
        toast({ title: 'TikTok Connected', description: 'Your TikTok account is now linked!' });
      }
    } catch (e: any) {
      toast({ title: 'Connection Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const disconnectTikTok = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke('tiktok-auth', {
        body: { action: 'disconnect' },
      });
      setConnected(false);
      setTiktokUserId(null);
      toast({ title: 'Disconnected', description: 'TikTok account removed.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const postVideoToTikTok = async (videoBlob: Blob, caption: string) => {
    if (!connected) {
      toast({ title: 'Not Connected', description: 'Connect your TikTok account first.', variant: 'destructive' });
      return null;
    }

    setLoading(true);
    try {
      // For now, use FILE_UPLOAD approach
      const { data, error } = await supabase.functions.invoke('tiktok-post-video', {
        body: {
          action: 'init_upload',
          caption,
          video_data: { size: videoBlob.size },
        },
      });

      if (error) throw error;

      if (data?.upload_url) {
        // Upload the video binary to TikTok's upload URL
        const uploadRes = await fetch(data.upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/webm',
            'Content-Range': `bytes 0-${videoBlob.size - 1}/${videoBlob.size}`,
          },
          body: videoBlob,
        });

        if (!uploadRes.ok) {
          throw new Error('Video upload to TikTok failed');
        }

        toast({ title: 'Posted to TikTok!', description: 'Video uploaded as private draft. Open TikTok to publish.' });
        return data.publish_id;
      } else if (data?.publish_id) {
        // PULL_FROM_URL was used
        toast({ title: 'Posted to TikTok!', description: 'Video is being processed.' });
        return data.publish_id;
      }

      throw new Error(data?.error || 'Unknown error');
    } catch (e: any) {
      toast({ title: 'TikTok Post Failed', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    connected,
    loading,
    tiktokUserId,
    connectTikTok,
    disconnectTikTok,
    postVideoToTikTok,
    checkConnection,
  };
}
