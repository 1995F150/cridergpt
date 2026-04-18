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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const db = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const tagId = (body.tag_id || '').trim()

    if (!tagId) {
      return new Response(JSON.stringify({ error: 'tag_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Look up the animal by tag_id
    const { data: animal, error: animalError } = await db
      .from('livestock_animals')
      .select('id, name, species, breed, sex, status, tag_id, notes, owner_id, photo_url')
      .eq('tag_id', tagId)
      .maybeSingle()

    if (animalError) {
      console.error('Lookup error:', animalError)
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!animal) {
      return new Response(JSON.stringify({
        error: 'No animal registered with this tag ID.',
        status: 'not_found',
        tag_id: tagId,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if caller is authenticated and authorized
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await userClient.auth.getUser()
        userId = user?.id || null
      } catch { /* unauthenticated - continue with public view */ }
    }

    let authorized = false
    if (userId) {
      const { data: hasAccess } = await db.rpc('has_livestock_access', {
        check_user_id: userId,
        check_animal_id: animal.id,
      })
      authorized = !!hasAccess
    }

    // Log the scan
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null
    await db.from('livestock_scan_logs').insert({
      card_id: tagId,
      scanned_by: userId,
      animal_id: animal.id,
      result: authorized ? 'success' : 'public_lookup',
      ip_address: ipAddress,
    })

    if (authorized) {
      // Full profile for authorized users
      return new Response(JSON.stringify({
        authorized: true,
        animal,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Public view — limited info, try to get owner contact
    let ownerContact = null
    let ownerName = null

    // Get owner's profile for contact info (only public fields)
    const { data: ownerProfile } = await db
      .from('profiles')
      .select('username, phone')
      .eq('user_id', animal.owner_id)
      .maybeSingle()

    // Get owner email from buyers table (public-facing)
    const { data: ownerBuyer } = await db
      .from('buyers')
      .select('full_name, email, phone')
      .eq('id', animal.owner_id)
      .maybeSingle()

    if (ownerBuyer || ownerProfile) {
      ownerName = ownerBuyer?.full_name || ownerProfile?.username || null
      ownerContact = {
        email: ownerBuyer?.email || null,
        phone: ownerBuyer?.phone || ownerProfile?.phone || null,
      }
    }

    return new Response(JSON.stringify({
      authorized: false,
      animal_name: animal.name,
      species: animal.species,
      owner_name: ownerName,
      owner_contact: ownerContact,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('tag-lookup error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
