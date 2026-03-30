import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Auto-generate new tag IDs into the pool
async function autoGeneratePoolIds(db: any, count: number = 50, userId?: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const newTags: { tag_id: string; status: string; generated_by: string | null }[] = [];

  for (let i = 0; i < count; i++) {
    let suffix = '';
    for (let j = 0; j < 6; j++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    const tagId = `CriderGPT-${suffix}`;
    newTags.push({ tag_id: tagId, status: 'available', generated_by: userId || null });
  }

  // Insert, ignoring duplicates
  const { data, error } = await db
    .from('livestock_tag_pool')
    .upsert(newTags, { onConflict: 'tag_id', ignoreDuplicates: true })
    .select('tag_id');

  if (error) {
    console.error('Auto-generate pool error:', error);
  }

  console.log(`Auto-generated ${newTags.length} new tag IDs into pool`);
  return data || [];
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

    const body = await req.json()

    // ─── Device API mode (action-based routing for Raspberry Pi) ───
    if (body.action === 'heartbeat' || body.action === 'scan') {
      return await handleDeviceAction(req, body, db, corsHeaders)
    }

    // ─── Normal user scan mode ───
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

      // Tag not found anywhere — check if pool is empty and auto-generate
      const { count: availableCount } = await db
        .from('livestock_tag_pool')
        .select('*', { count: 'exact', head: true })
        .in('status', ['available', 'programmed'])

      if (availableCount !== null && availableCount < 10) {
        console.log(`Pool low (${availableCount} remaining), auto-generating 50 new IDs`)
        await autoGeneratePoolIds(db, 50, userId)
      }

      return new Response(JSON.stringify({ error: 'Tag ID not found. No animal is registered with this ID.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Duplicate check — ensure the tag_id hasn't been double-assigned
    const { count: assignCount } = await db
      .from('livestock_animals')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId)
    
    if (assignCount && assignCount > 1) {
      console.error(`DUPLICATE TAG DETECTED: ${tagId} assigned to ${assignCount} animals`)
      await db.from('livestock_scan_logs').insert({
        card_id: tagId,
        scanned_by: userId,
        animal_id: animal.id,
        result: 'duplicate_detected',
        ip_address: ipAddress,
      })
      return new Response(JSON.stringify({ 
        error: 'Duplicate tag detected. This tag ID is assigned to multiple animals. Please contact admin.',
        animal,
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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

// ─── Device API handler for Raspberry Pi scanners ───────────────────────────
async function handleDeviceAction(req: Request, body: any, db: any, corsHeaders: Record<string, string>) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Device token required' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const tokenHash = btoa(token)
  const { data: device, error: deviceError } = await db
    .from('livestock_devices')
    .select('*')
    .eq('device_token', tokenHash)
    .maybeSingle()

  if (deviceError || !device) {
    return new Response(JSON.stringify({ error: 'Invalid device token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (body.action === 'heartbeat') {
    await db.from('livestock_devices').update({ last_heartbeat: new Date().toISOString(), status: 'online' }).eq('id', device.id)
    await db.from('livestock_device_logs').insert({ device_id: device.id, event_type: 'heartbeat', payload: { timestamp: new Date().toISOString() } })
    return new Response(JSON.stringify({ status: 'ok', device_name: device.device_name, commands: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (body.action === 'scan') {
    const tagId = (body.tag_id || '').trim()
    if (!tagId) {
      return new Response(JSON.stringify({ error: 'tag_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: animal } = await db.from('livestock_animals').select('*').eq('tag_id', tagId).maybeSingle()

    if (!animal) {
      const { data: poolTag } = await db.from('livestock_tag_pool').select('*').eq('tag_id', tagId).maybeSingle()
      await db.from('livestock_device_logs').insert({ device_id: device.id, event_type: 'scan', payload: { tag_id: tagId, result: poolTag ? poolTag.status : 'not_found' } })

      if (poolTag) {
        const msg = poolTag.status === 'programmed' ? 'Tag is programmed and ready to register.' : 'Tag recognized from pool.'
        return new Response(JSON.stringify({ status: poolTag.status === 'programmed' ? 'programmed' : 'unregistered', tag_id: tagId, message: msg }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ error: 'Tag ID not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const [weightsRes, healthRes, notesRes] = await Promise.all([
      db.from('livestock_weights').select('*').eq('animal_id', animal.id).order('recorded_at', { ascending: false }),
      db.from('livestock_health_records').select('*').eq('animal_id', animal.id).order('recorded_at', { ascending: false }),
      db.from('livestock_notes').select('*').eq('animal_id', animal.id).order('created_at', { ascending: false }),
    ])

    await db.from('livestock_device_logs').insert({ device_id: device.id, event_type: 'scan', payload: { tag_id: tagId, animal_id: animal.id, result: 'success' } })

    return new Response(JSON.stringify({
      animal, weights: weightsRes.data || [], health_records: healthRes.data || [], notes: notesRes.data || [], scan_timestamp: new Date().toISOString(),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
