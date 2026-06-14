import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = 'loading' | 'valid' | 'invalid' | 'already' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (!res.ok) { setState('invalid'); return; }
        if (data.valid === false && data.reason === 'already_unsubscribed') setState('already');
        else if (data.valid) setState('valid');
        else setState('invalid');
      } catch { setState('error'); }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (error) { setState('error'); return; }
      if (data?.success) setState('success');
      else if (data?.reason === 'already_unsubscribed') setState('already');
      else setState('error');
    } finally { setSubmitting(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full p-8 space-y-4">
        <h1 className="text-2xl font-bold">CriderGPT email preferences</h1>
        {state === 'loading' && <p className="text-muted-foreground">Checking your unsubscribe link…</p>}
        {state === 'valid' && (
          <>
            <p>Click below to stop receiving non-essential emails from CriderGPT. Account & security emails will still go through.</p>
            <Button onClick={confirm} disabled={submitting} className="w-full">
              {submitting ? 'Unsubscribing…' : 'Confirm unsubscribe'}
            </Button>
          </>
        )}
        {state === 'success' && <p className="text-green-600">You're unsubscribed. Sorry to see ya go.</p>}
        {state === 'already' && <p className="text-muted-foreground">You're already unsubscribed.</p>}
        {state === 'invalid' && <p className="text-destructive">This unsubscribe link is invalid or expired.</p>}
        {state === 'error' && <p className="text-destructive">Something went wrong. Try again later.</p>}
      </Card>
    </main>
  );
}
