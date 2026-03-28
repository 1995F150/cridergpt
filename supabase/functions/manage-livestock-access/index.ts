import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

type GrantBody = {
  action: 'grant'
  animal_id: string
  email: string
  role?: string
  permissions?: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawBody = await req.json()
    const body = rawBody as GrantBody

    if (body.action !== 'grant') {
      return new Response(JSON.stringify({ error: 'Unsupported action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const animalId = body.animal_id?.trim()
    const targetEmail = body.email?.trim().toLowerCase()
    const role = body.role?.trim() || 'farm_worker'

    if (!animalId || !targetEmail) {
      return new Response(JSON.stringify({ error: 'animal_id and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: animal, error: animalError } = await adminClient
      .from('livestock_animals')
      .select('id, owner_id')
      .eq('id', animalId)
      .single()

    if (animalError || !animal) {
      return new Response(JSON.stringify({ error: 'Animal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (animal.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the owner can grant access' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let targetUserId: string | null = null

    const { data: buyer } = await adminClient
      .from('buyers')
      .select('id')
      .eq('email', targetEmail)
      .maybeSingle()

    if (buyer?.id) {
      targetUserId = buyer.id
    } else {
      const { data: usersData } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      const matched = usersData?.users?.find((u) => (u.email || '').toLowerCase() === targetEmail)
      targetUserId = matched?.id || null
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'No account found for that email yet. Ask them to sign up first.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: 'You already have owner access.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedPermissions = {
      view_records: true,
      add_notes: true,
      add_weights: true,
      add_health: true,
      manage_tags: false,
      grantee_email: targetEmail,
      ...(body.permissions || {}),
    }

    const { data: existingAccess } = await adminClient
      .from('livestock_access')
      .select('*')
      .eq('owner_id', user.id)
      .eq('granted_to', targetUserId)
      .is('revoked_at', null)
      .order('granted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingAccess) {
      const existingAnimalIds = existingAccess.animal_ids as string[] | null
      const nextAnimalIds = !existingAnimalIds
        ? null
        : Array.from(new Set([...existingAnimalIds, animalId]))

      const { error: updateError } = await adminClient
        .from('livestock_access')
        .update({
          role,
          animal_ids: nextAnimalIds,
          permissions: normalizedPermissions,
        })
        .eq('id', existingAccess.id)

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ ok: true, access_id: existingAccess.id, granted_to: targetUserId, updated: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('livestock_access')
      .insert({
        owner_id: user.id,
        granted_to: targetUserId,
        role,
        animal_ids: [animalId],
        permissions: normalizedPermissions,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ ok: true, access_id: inserted.id, granted_to: targetUserId, created: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('manage-livestock-access error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
