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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claims.claims.sub
    const { action, video_url, caption, video_data } = await req.json()

    // Get user's TikTok token
    const { data: tokenRow } = await supabase
      .from('tiktok_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: 'TikTok account not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenRow.access_token
    if (new Date(tokenRow.expires_at) <= new Date()) {
      const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY')!
      const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET')!

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
        return new Response(JSON.stringify({ error: 'TikTok token expired. Please reconnect.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      accessToken = refreshData.access_token
      await supabase.from('tiktok_tokens').update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
      }).eq('user_id', userId)
    }

    if (action === 'init_upload') {
      // Step 1: Initialize video upload with TikTok
      // Using PULL_FROM_URL if video_url is provided, otherwise FILE_UPLOAD
      const postBody: any = {
        post_info: {
          title: caption || 'Created with CriderGPT',
          privacy_level: 'SELF_ONLY', // Start as private, user can change on TikTok
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: video_url
          ? { source: 'PULL_FROM_URL', video_url }
          : { source: 'FILE_UPLOAD', video_size: video_data?.size || 0, chunk_size: video_data?.size || 0, total_chunk_count: 1 },
      }

      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(postBody),
      })

      const initData = await initRes.json()
      console.log('TikTok init response:', JSON.stringify(initData))

      if (initData.error?.code) {
        return new Response(JSON.stringify({
          error: initData.error.message || 'TikTok upload init failed',
          details: initData.error,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        success: true,
        publish_id: initData.data?.publish_id,
        upload_url: initData.data?.upload_url,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'check_status') {
      const { publish_id } = await req.json()

      const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publish_id }),
      })

      const statusData = await statusRes.json()

      return new Response(JSON.stringify(statusData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('TikTok post error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
