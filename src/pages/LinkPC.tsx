import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Cpu } from 'lucide-react';

export default function LinkPC() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'need-auth' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('Linking your PC...');

  const url = params.get('url') ?? '';
  const token = params.get('token') ?? '';
  const label = params.get('label') ?? '';

  useEffect(() => {
    (async () => {
      if (!url || !token) {
        setStatus('error');
        setMessage('Missing url or token in the link.');
        return;
      }
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setStatus('need-auth');
        setMessage('Sign in first, then re-open this link.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('register-pc', {
        body: { action: 'save', agent_url: url, agent_token: token, label },
      });
      if (error || (data as any)?.error) {
        setStatus('error');
        setMessage((data as any)?.error || error?.message || 'Failed to save PC link.');
      } else {
        setStatus('ok');
        setMessage(`PC linked! CriderGPT can now reach ${new URL(url).hostname}`);
      }
    })();
  }, [url, token, label]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 space-y-4 text-center">
        <Cpu className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Link Your PC</h1>
        <div className="flex justify-center">
          {status === 'loading' && <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />}
          {status === 'ok' && <CheckCircle2 className="w-8 h-8 text-green-500" />}
          {(status === 'error' || status === 'need-auth') && <XCircle className="w-8 h-8 text-destructive" />}
        </div>
        <p className="text-muted-foreground">{message}</p>
        {status === 'need-auth' && (
          <Button onClick={() => navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)} className="w-full">
            Sign In
          </Button>
        )}
        {status === 'ok' && (
          <Button onClick={() => navigate('/admin')} className="w-full">Open Admin Panel</Button>
        )}
        {status === 'error' && (
          <Button variant="outline" onClick={() => navigate('/')} className="w-full">Back to App</Button>
        )}
      </Card>
    </div>
  );
}
