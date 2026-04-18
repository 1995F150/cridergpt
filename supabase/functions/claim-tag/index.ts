import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const tagId = (body.tag_id || '').trim()
    if (!tagId) {
      return new Response(JSON.stringify({ error: 'tag_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const db = createClient(supabaseUrl, serviceKey)

    // Look up the pool tag
    const { data: poolTag, error: poolErr } = await db
      .from('livestock_tag_pool')
      .select('*')
      .eq('tag_id', tagId)
      .maybeSingle()
    if (poolErr) throw poolErr
    if (!poolTag) {
      return new Response(JSON.stringify({ error: 'Invalid or unknown tag' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If already assigned to an animal, deny (one tag = one owner)
    if (poolTag.assigned_to_animal) {
      return new Response(JSON.stringify({ error: 'This tag is already registered to another animal.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Reserve the tag for this user. We mark it 'assigned' with assigned_by = user,
    // but leave assigned_to_animal NULL until the user creates an animal record.
    const { error: updateErr } = await db
      .from('livestock_tag_pool')
      .update({
        status: 'assigned',
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('tag_id', tagId)
      .in('status', ['available', 'programmed'])
    if (updateErr) throw updateErr

    // Log the claim event
    await db.from('livestock_scan_logs').insert({
      card_id: tagId,
      scanned_by: user.id,
      result: 'claimed',
    })

    return new Response(JSON.stringify({ success: true, tag_id: tagId, owner_id: user.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('claim-tag error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
