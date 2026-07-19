import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Normalize tag: strip whitespace, wrapping braces/brackets, decode URI,
// pull canonical CriderGPT-XXXX out of URLs / CGPT payloads if present.
function normalizeTagId(raw: string): string {
  if (!raw) return ''
  let v = raw
  try { v = decodeURIComponent(v) } catch { /* noop */ }
  v = v.trim().replace(/^[{<\[]+|[}>\]]+$/g, '').trim()

  if (v.startsWith('CGPT:')) {
    try {
      const decoded = JSON.parse(atob(v.slice(5)))
      if (decoded && typeof decoded.id === 'string') v = decoded.id.trim()
    } catch { /* fall through */ }
  }
  const m = v.match(/CriderGPT-([A-Za-z0-9]{4,})/i)
  if (m) return `CriderGPT-${m[1].toUpperCase()}`
  return v
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    const tagId = normalizeTagId(String(body?.tag_id || ''))
    if (!tagId) return jsonResponse({ error: 'tag_id is required' }, 400)

    // Resolve caller (optional)
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await userClient.auth.getUser()
        userId = user?.id || null
      } catch { /* anon */ }
    }

    // Look up animal by canonical tag
    const { data: animal, error: animalErr } = await db
      .from('livestock_animals')
      .select('id, name, species, breed, sex, status, tag_id, notes, owner_id, photo_url, birth_date')
      .eq('tag_id', tagId)
      .maybeSingle()

    if (animalErr) {
      console.error('tag-lookup animal query failed')
      return jsonResponse({ error: 'Internal error' }, 500)
    }

    if (!animal) {
      return jsonResponse({
        error: 'No animal registered with this tag ID.',
        status: 'not_found',
        registered: false,
        tag_id: tagId,
      })
    }

    // Authorization check for full profile view
    let authorized = false
    if (userId) {
      const { data: hasAccess } = await db.rpc('has_livestock_access', {
        check_user_id: userId,
        check_animal_id: animal.id,
      })
      authorized = !!hasAccess
    }

    // Safe scan log — only insert when scanned_by can be filled.
    // livestock_scan_logs.scanned_by is NOT NULL in this project, so skip anon logs.
    if (userId) {
      const ipAddress =
        req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null
      await db.from('livestock_scan_logs').insert({
        card_id: tagId,
        scanned_by: userId,
        animal_id: animal.id,
        result: authorized ? 'success' : 'public_lookup',
        ip_address: ipAddress,
      })
    }

    // Full owner/shared response — unchanged shape plus new fields for the UI
    if (authorized) {
      return jsonResponse({
        authorized: true,
        registered: true,
        public_profile_enabled: null,
        animal,
      })
    }

    // Public / unauthorized path — build strictly from livestock_public_profiles.
    const { data: pub } = await db
      .from('livestock_public_profiles')
      .select('*')
      .eq('animal_id', animal.id)
      .maybeSingle()

    const baseAnimal = {
      name: animal.name,
      species: animal.species,
      breed: null as string | null,
      sex: null as string | null,
      birth_date: null as string | null,
      color_markings: null as string | null,
      photo_url: null as string | null,
      status: animal.status,
      tag_id: animal.tag_id,
    }

    if (!pub || !pub.public_enabled) {
      return jsonResponse({
        authorized: false,
        registered: true,
        public_profile_enabled: false,
        animal: baseAnimal,
        owner_contact: null,
        lost: null,
        public_health: [],
      })
    }

    // Apply owner allow-list flags
    const publicAnimal = {
      name: pub.show_name ? animal.name : null,
      species: pub.show_species ? animal.species : null,
      breed: pub.show_breed ? animal.breed : null,
      sex: pub.show_sex ? animal.sex : null,
      birth_date: pub.show_birth_date ? animal.birth_date : null,
      color_markings: pub.show_color_markings ? null : null, // no source column yet; explicit null
      photo_url: pub.show_photo ? animal.photo_url : null,
      status: animal.status,
      tag_id: animal.tag_id,
    }

    const owner_contact = pub.show_owner_contact
      ? {
          name: pub.public_owner_name || null,
          phone: pub.public_phone || null,
          email: pub.public_email || null,
          preferred_method: pub.preferred_contact_method || 'phone',
        }
      : null

    const lost = pub.lost_status && pub.lost_status !== 'safe'
      ? {
          status: pub.lost_status,
          instructions: pub.emergency_instructions || null,
          last_seen_general_area: pub.last_seen_general_area || null,
        }
      : null

    // Only expose intentional public health rows
    let public_health: any[] = []
    if (pub.show_vaccinations || pub.show_health_alerts) {
      const { data: rows } = await db
        .from('livestock_public_health_records')
        .select('id, category, public_title, public_summary, event_date, next_due_date, is_active')
        .eq('animal_id', animal.id)
        .eq('is_active', true)

      public_health = (rows || []).filter((r) => {
        if (r.category === 'vaccination') return !!pub.show_vaccinations
        return !!pub.show_health_alerts
      })
    }

    return jsonResponse({
      authorized: false,
      registered: true,
      public_profile_enabled: true,
      animal: publicAnimal,
      owner_contact,
      lost,
      public_health,
    })
  } catch (err) {
    console.error('tag-lookup error')
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
