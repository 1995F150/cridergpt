// Drains marketing_auto_post_queue and publishes each pending row to TikTok
// using the owner's per-user OAuth (video.publish scope). Triggered by cron
// and by the DevHub UI ("Run now" button).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Find the owner (active system_owner) and their TikTok token
    const { data: owner } = await supabase
      .from('system_owners')
      .select('id, email')
      .eq('is_active', true)
      .order('added_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!owner) throw new Error('No active system_owner configured')

    let { data: tokenRow } = await supabase
      .from('tiktok_tokens')
      .select('*')
      .eq('user_id', owner.id)
      .maybeSingle()

    if (!tokenRow) {
      return json({ skipped: true, reason: 'owner_tiktok_not_connected', owner: owner.email }, 200)
    }

    // Refresh if expired
    if (new Date(tokenRow.expires_at) <= new Date(Date.now() + 60_000)) {
      const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: Deno.env.get('TIKTOK_CLIENT_KEY')!,
          client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET')!,
          grant_type: 'refresh_token',
          refresh_token: tokenRow.refresh_token,
        }),
      })
      const r = await refreshRes.json()
      if (r.error) throw new Error('TikTok refresh failed: ' + r.error_description)
      tokenRow.access_token = r.access_token
      await supabase.from('tiktok_tokens').update({
        access_token: r.access_token,
        refresh_token: r.refresh_token,
        expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(),
      }).eq('user_id', owner.id)
    }

    // Pick up to 5 due pending rows
    const { data: rows } = await supabase
      .from('marketing_auto_post_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(5)

    const results: any[] = []

    for (const row of rows ?? []) {
      // Mark processing
      await supabase.from('marketing_auto_post_queue')
        .update({ status: 'processing', attempts: row.attempts + 1 })
        .eq('id', row.id)

      try {
        if (!row.video_url) {
          throw new Error('No video_url on row — generate or upload a video first.')
        }

        const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenRow.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            post_info: {
              title: row.caption.slice(0, 2200),
              privacy_level: row.privacy_level || 'PUBLIC_TO_EVERYONE',
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: { source: 'PULL_FROM_URL', video_url: row.video_url },
          }),
        })
        const initData = await initRes.json()
        if (initData.error?.code && initData.error.code !== 'ok') {
          throw new Error(`init failed: ${initData.error.code} ${initData.error.message}`)
        }
        const publishId = initData.data?.publish_id

        await supabase.from('marketing_auto_post_queue').update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          tiktok_publish_id: publishId,
          error: null,
        }).eq('id', row.id)

        results.push({ id: row.id, publish_id: publishId, ok: true })
      } catch (e: any) {
        await supabase.from('marketing_auto_post_queue').update({
          status: row.attempts >= 2 ? 'failed' : 'pending',
          error: e.message,
        }).eq('id', row.id)
        results.push({ id: row.id, ok: false, error: e.message })
      }
    }

    return json({ processed: results.length, results }, 200)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
