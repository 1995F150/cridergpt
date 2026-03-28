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
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = user.id

    const db = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Parse request — accept tag_id or card_id (backward compat)
    const body = await req.json()
    const tagId = (body.tag_id || body.card_id || '').trim()
    if (!tagId) {
      return new Response(JSON.stringify({ error: 'tag_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null

    // 3. Look up animal directly by tag_id
    const { data: animal, error: animalError } = await db
      .from('livestock_animals')
      .select('*')
      .eq('tag_id', tagId)
      .maybeSingle()

    if (animalError) {
      console.error('Animal lookup error:', animalError)
      return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!animal) {
      // Check if tag exists in the pre-generated pool
      const { data: poolTag } = await db
        .from('livestock_tag_pool')
        .select('*')
        .eq('tag_id', tagId)
        .in('status', ['available', 'programmed'])
        .maybeSingle()

      await db.from('livestock_scan_logs').insert({
        card_id: tagId,
        scanned_by: userId,
        animal_id: null,
        result: poolTag ? 'unregistered' : 'not_found',
        ip_address: ipAddress,
      })

      if (poolTag) {
        const isProgrammed = poolTag.status === 'programmed'
        return new Response(JSON.stringify({
          status: isProgrammed ? 'programmed' : 'unregistered',
          tag_id: tagId,
          message: isProgrammed
            ? 'Tag is programmed and ready to register.'
            : 'Tag recognized from pool. Ready to register a new animal.',
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ error: 'Tag ID not found. No animal is registered with this ID.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Authorization check
    const { data: hasAccess } = await db.rpc('has_livestock_access', {
      check_user_id: userId,
      check_animal_id: animal.id,
    })

    if (!hasAccess) {
      await db.from('livestock_scan_logs').insert({
        card_id: tagId,
        scanned_by: userId,
        animal_id: animal.id,
        result: 'access_denied',
        ip_address: ipAddress,
      })
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. Fetch full animal profile
    const [weightsRes, healthRes, notesRes, tagsRes] = await Promise.all([
      db.from('livestock_weights').select('*').eq('animal_id', animal.id).order('recorded_at', { ascending: false }),
      db.from('livestock_health_records').select('*').eq('animal_id', animal.id).order('recorded_at', { ascending: false }),
      db.from('livestock_notes').select('*').eq('animal_id', animal.id).order('created_at', { ascending: false }),
      db.from('livestock_tags').select('*').eq('animal_id', animal.id),
    ])

    // 6. Log success
    await db.from('livestock_scan_logs').insert({
      card_id: tagId,
      scanned_by: userId,
      animal_id: animal.id,
      result: 'success',
      ip_address: ipAddress,
    })

    // 7. Return profile
    return new Response(JSON.stringify({
      animal,
      weights: weightsRes.data || [],
      health_records: healthRes.data || [],
      notes: notesRes.data || [],
      tags: tagsRes.data || [],
      scan_timestamp: new Date().toISOString(),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('scan-card error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
