// Hourly auto-promo generator. Picks a rotating topic + a video from
// promo_video_library, generates fresh caption+hashtags via Lovable AI,
// dedups against 7-day history, and enqueues into marketing_auto_post_queue.
// The existing marketing-auto-post cron then publishes to TikTok.
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
    // 1. Load settings + guardrails
    const { data: settings } = await supabase
      .from('auto_promo_settings').select('*').eq('id', 1).maybeSingle()

    if (!settings) return json({ skipped: true, reason: 'no_settings' })
    if (!settings.enabled) return json({ skipped: true, reason: 'disabled' })

    // Guardrail: min gap since last successful post
    if (settings.last_posted_at) {
      const gapMs = Date.now() - new Date(settings.last_posted_at).getTime()
      const minMs = (settings.min_gap_minutes ?? 55) * 60 * 1000
      if (gapMs < minMs) {
        return json({ skipped: true, reason: 'min_gap_not_reached', wait_minutes: Math.ceil((minMs - gapMs)/60000) })
      }
    }

    // Guardrail: hourly cap (count posts queued/posted in last 60min)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('marketing_auto_post_queue')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
      .in('status', ['pending', 'processing', 'posted'])
    if ((recentCount ?? 0) >= (settings.hourly_cap ?? 1)) {
      return json({ skipped: true, reason: 'hourly_cap_reached', count: recentCount })
    }

    // 2. Pick least-recently-used active video, optionally filtered by rotating topic
    const topics: string[] = settings.topics?.length ? settings.topics : ['general']
    const topic = topics[Math.floor(Math.random() * topics.length)]

    let videoQuery = supabase
      .from('promo_video_library')
      .select('*')
      .eq('active', true)
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1)

    // Try matching topic first
    const { data: topicVideo } = await videoQuery.eq('topic_tag', topic).maybeSingle()
    let video = topicVideo
    if (!video) {
      const { data: anyVideo } = await supabase
        .from('promo_video_library').select('*').eq('active', true)
        .order('last_used_at', { ascending: true, nullsFirst: true }).limit(1).maybeSingle()
      video = anyVideo
    }
    if (!video) return json({ skipped: true, reason: 'no_active_videos_in_library' })

    // 3. Generate caption via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const prompt = `You are Jessie Crider promoting CriderGPT on TikTok. Write ONE short TikTok caption (max 150 chars, Southern Gen-Z tone, 0% AI feel, no emojis at the start) promoting this topic: "${topic}". ${video.description ? 'Context: ' + video.description : ''} Then on a new line add exactly 5 relevant hashtags space-separated. No quotes, no explanation. Just caption then hashtags.`

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!aiRes.ok) throw new Error(`AI gen failed: ${aiRes.status} ${await aiRes.text()}`)
    const aiJson = await aiRes.json()
    const caption = (aiJson.choices?.[0]?.message?.content ?? '').trim()
    if (!caption) throw new Error('Empty caption from AI')

    // 4. Dedup against last 7 days
    const captionHash = await sha256(caption.toLowerCase().replace(/\s+/g, ' '))
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: dup } = await supabase
      .from('auto_promo_history').select('id')
      .eq('caption_hash', captionHash).gte('created_at', weekAgo).maybeSingle()
    if (dup) {
      await supabase.from('auto_promo_settings').update({ last_run_at: new Date().toISOString() }).eq('id', 1)
      return json({ skipped: true, reason: 'duplicate_caption_within_7d' })
    }

    // 5. Enqueue into existing marketing_auto_post_queue
    const { data: queued, error: qErr } = await supabase
      .from('marketing_auto_post_queue')
      .insert({
        caption,
        video_url: video.video_url,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        source: 'auto_promo',
        source_id: video.id,
      })
      .select().single()
    if (qErr) throw qErr

    // 6. Bookkeeping
    await supabase.from('auto_promo_history').insert({
      caption_hash: captionHash, topic, video_id: video.id,
    })
    await supabase.from('promo_video_library').update({
      times_used: (video.times_used ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    }).eq('id', video.id)
    await supabase.from('auto_promo_settings').update({
      last_run_at: new Date().toISOString(),
      last_posted_at: new Date().toISOString(),
    }).eq('id', 1)

    // 7. Kick off the publisher immediately (don't wait for its own cron)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/marketing-auto-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ trigger: 'auto_promo' }),
    }).catch(() => {})

    return json({ queued: true, topic, video_id: video.id, queue_id: queued.id, caption })
  } catch (e: any) {
    console.error('auto-generate-promo-post error', e)
    return json({ error: e.message }, 500)
  }
})

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
