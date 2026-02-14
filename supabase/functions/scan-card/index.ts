import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // User client for auth validation
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = claimsData.claims.sub as string

    // Service client for data operations (bypasses RLS)
    const db = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Parse request
    const { card_id, encrypted = false } = await req.json()
    if (!card_id || typeof card_id !== 'string') {
      return new Response(JSON.stringify({ error: 'card_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let resolvedCardId = card_id.trim()

    // 3. Decryption placeholder
    if (encrypted) {
      // Future: decrypt card_id using a stored secret
      // For now, just use it as-is
      console.log('Encrypted card scan requested — decryption not yet implemented, using raw ID')
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null

    // 4. Look up card
    const { data: card, error: cardError } = await db
      .from('livestock_rfid_cards')
      .select('*')
      .eq('card_id', resolvedCardId)
      .is('unlinked_at', null)
      .maybeSingle()

    if (cardError) {
      console.error('Card lookup error:', cardError)
      return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!card || !card.animal_id) {
      // Log not_found
      await db.from('livestock_scan_logs').insert({
        card_id: resolvedCardId,
        scanned_by: userId,
        animal_id: null,
        result: 'not_found',
        ip_address: ipAddress,
      })
      return new Response(JSON.stringify({ error: 'Card not registered or not linked to an animal' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. Authorization check using the existing has_livestock_access function
    const { data: hasAccess } = await db.rpc('has_livestock_access', {
      check_user_id: userId,
      check_animal_id: card.animal_id,
    })

    if (!hasAccess) {
      await db.from('livestock_scan_logs').insert({
        card_id: resolvedCardId,
        scanned_by: userId,
        animal_id: card.animal_id,
        result: 'access_denied',
        ip_address: ipAddress,
      })
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 6. Update last_scan
    await db.from('livestock_rfid_cards').update({ last_scan: new Date().toISOString() }).eq('id', card.id)

    // 7. Fetch full animal profile
    const [animalRes, weightsRes, healthRes, notesRes, tagsRes] = await Promise.all([
      db.from('livestock_animals').select('*').eq('id', card.animal_id).single(),
      db.from('livestock_weights').select('*').eq('animal_id', card.animal_id).order('recorded_at', { ascending: false }),
      db.from('livestock_health_records').select('*').eq('animal_id', card.animal_id).order('recorded_at', { ascending: false }),
      db.from('livestock_notes').select('*').eq('animal_id', card.animal_id).order('created_at', { ascending: false }),
      db.from('livestock_tags').select('*').eq('animal_id', card.animal_id),
    ])

    // 8. Log success
    await db.from('livestock_scan_logs').insert({
      card_id: resolvedCardId,
      scanned_by: userId,
      animal_id: card.animal_id,
      result: 'success',
      ip_address: ipAddress,
    })

    // 9. Return profile
    return new Response(JSON.stringify({
      animal: animalRes.data,
      weights: weightsRes.data || [],
      health_records: healthRes.data || [],
      notes: notesRes.data || [],
      tags: tagsRes.data || [],
      card: { card_id: card.card_id, last_scan: new Date().toISOString(), linked_at: card.linked_at },
      scan_timestamp: new Date().toISOString(),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('scan-card error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
