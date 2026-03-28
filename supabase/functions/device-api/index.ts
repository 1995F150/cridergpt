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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate via device token in Authorization header
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Device token required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Look up device by hashed token
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

    const body = await req.json()
    const action = body.action

    // ========== HEARTBEAT ==========
    if (action === 'heartbeat') {
      await db
        .from('livestock_devices')
        .update({ last_heartbeat: new Date().toISOString(), status: 'online' })
        .eq('id', device.id)

      await db.from('livestock_device_logs').insert({
        device_id: device.id,
        event_type: 'heartbeat',
        payload: { timestamp: new Date().toISOString() },
      })

      return new Response(JSON.stringify({
        status: 'ok',
        device_name: device.device_name,
        commands: [], // future: pending commands
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ========== SCAN ==========
    if (action === 'scan') {
      const tagId = (body.tag_id || '').trim()
      if (!tagId) {
        return new Response(JSON.stringify({ error: 'tag_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Look up animal by tag_id
      const { data: animal, error: animalError } = await db
        .from('livestock_animals')
        .select('*')
        .eq('tag_id', tagId)
        .maybeSingle()

      if (animalError) {
        console.error('Animal lookup error:', animalError)
        await db.from('livestock_device_logs').insert({
          device_id: device.id, event_type: 'error',
          payload: { tag_id: tagId, error: animalError.message },
        })
        return new Response(JSON.stringify({ error: 'Internal error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!animal) {
        // Check tag pool
        const { data: poolTag } = await db
          .from('livestock_tag_pool')
          .select('*')
          .eq('tag_id', tagId)
          .maybeSingle()

        await db.from('livestock_device_logs').insert({
          device_id: device.id, event_type: 'scan',
          payload: { tag_id: tagId, result: poolTag ? poolTag.status : 'not_found' },
        })

        if (poolTag) {
          const msg = poolTag.status === 'programmed'
            ? 'Tag is programmed and ready to register.'
            : 'Tag recognized from pool. Ready to register a new animal.'

          return new Response(JSON.stringify({
            status: poolTag.status === 'programmed' ? 'programmed' : 'unregistered',
            tag_id: tagId,
            message: msg,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response(JSON.stringify({ error: 'Tag ID not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Fetch full profile
      const [weightsRes, healthRes, notesRes] = await Promise.all([
        db.from('livestock_weights').select('*').eq('animal_id', animal.id).order('recorded_at', { ascending: false }),
        db.from('livestock_health_records').select('*').eq('animal_id', animal.id).order('recorded_at', { ascending: false }),
        db.from('livestock_notes').select('*').eq('animal_id', animal.id).order('created_at', { ascending: false }),
      ])

      await db.from('livestock_device_logs').insert({
        device_id: device.id, event_type: 'scan',
        payload: { tag_id: tagId, animal_id: animal.id, result: 'success' },
      })

      return new Response(JSON.stringify({
        animal,
        weights: weightsRes.data || [],
        health_records: healthRes.data || [],
        notes: notesRes.data || [],
        scan_timestamp: new Date().toISOString(),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Use "heartbeat" or "scan".' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('device-api error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
