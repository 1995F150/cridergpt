// register-pc: logged-in user saves their PC remote agent URL + token
// to their own row in pc_links (RLS-protected, per-user).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'save');

    if (action === 'get') {
      const { data, error } = await supabase
        .from('pc_links').select('agent_url,label,last_seen,updated_at')
        .eq('user_id', userId).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ link: data });
    }

    if (action === 'delete') {
      const { error } = await supabase.from('pc_links').delete().eq('user_id', userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // default: save / upsert
    const agent_url = String(body.agent_url ?? '').trim();
    const agent_token = String(body.agent_token ?? '').trim();
    const label = body.label ? String(body.label).slice(0, 80) : null;
    if (!/^https?:\/\//i.test(agent_url)) return json({ error: 'agent_url must be https://...' }, 400);
    if (agent_token.length < 8) return json({ error: 'agent_token too short' }, 400);

    const { error } = await supabase.from('pc_links').upsert({
      user_id: userId,
      agent_url,
      agent_token,
      label,
      last_seen: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, message: 'PC linked successfully' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
