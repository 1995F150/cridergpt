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
    const { action, code, redirect_uri } = await req.json()
    const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY')!
    const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET')!

    if (action === 'get_auth_url') {
      // Build TikTok OAuth URL
      const params = new URLSearchParams({
        client_key: clientKey,
        scope: 'user.info.basic,video.publish',
        response_type: 'code',
        redirect_uri: redirect_uri || 'https://cridergpt.lovable.app/auth',
        state: 'tiktok_connect',
      })
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'exchange_code') {
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Exchange code for access token
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirect_uri || 'https://cridergpt.lovable.app/auth',
        }),
      })

      const tokenData = await tokenRes.json()
      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Store tokens in database
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: claims, error: claimsError } = await supabase.auth.getClaims(
        authHeader.replace('Bearer ', '')
      )
      if (claimsError || !claims?.claims) {
        return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const userId = claims.claims.sub
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

      const { error: upsertError } = await supabase
        .from('tiktok_tokens')
        .upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          tiktok_user_id: tokenData.open_id,
          scope: tokenData.scope,
        }, { onConflict: 'user_id' })

      if (upsertError) {
        console.error('Token storage error:', upsertError)
        return new Response(JSON.stringify({ error: 'Failed to store tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, tiktok_user_id: tokenData.open_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'refresh_token') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
      const userId = claims?.claims?.sub
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get current refresh token
      const { data: tokenRow } = await supabase
        .from('tiktok_tokens')
        .select('refresh_token')
        .eq('user_id', userId)
        .single()

      if (!tokenRow) {
        return new Response(JSON.stringify({ error: 'No TikTok account connected' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: tokenRow.refresh_token,
        }),
      })

      const refreshData = await refreshRes.json()
      if (refreshData.error) {
        return new Response(JSON.stringify({ error: refreshData.error_description }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
      await supabase.from('tiktok_tokens').update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: expiresAt,
      }).eq('user_id', userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'check_connection') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
      const userId = claims?.claims?.sub
      if (!userId) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data } = await supabase
        .from('tiktok_tokens')
        .select('tiktok_user_id, expires_at')
        .eq('user_id', userId)
        .single()

      const connected = !!data && new Date(data.expires_at) > new Date()

      return new Response(JSON.stringify({ connected, tiktok_user_id: data?.tiktok_user_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
      const userId = claims?.claims?.sub

      await supabase.from('tiktok_tokens').delete().eq('user_id', userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('TikTok auth error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
