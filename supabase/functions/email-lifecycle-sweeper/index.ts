// Hourly sweeper that fires plan-welcome, iap-receipt, and inactive-reminder
// emails by invoking send-transactional-email. Uses metadata flags so emails
// are not duplicated.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://cridergpt.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const stats = { welcome: 0, receipts: 0, reminders: 0, errors: [] as string[] }

  const invoke = async (templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, unknown>) => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
      })
      if (!res.ok) {
        const txt = await res.text()
        stats.errors.push(`${templateName}/${idempotencyKey}: ${res.status} ${txt.slice(0, 200)}`)
        return false
      }
      return true
    } catch (e) {
      stats.errors.push(`${templateName}/${idempotencyKey}: ${(e as Error).message}`)
      return false
    }
  }

  // --- 1. Plan welcome (last 24h, not yet sent) ---
  const { data: newSubs } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, email, plan_name, metadata, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .in('plan_status', ['active', 'trialing'])
    .limit(200)

  for (const sub of newSubs ?? []) {
    const meta = (sub.metadata as Record<string, unknown>) ?? {}
    if (meta.welcome_email_sent_at) continue
    if (!sub.email) continue
    const { data: prof } = await supabase
      .from('profiles').select('display_name, username').eq('user_id', sub.user_id).maybeSingle()
    const planLabel = sub.plan_name?.toLowerCase().includes('lifetime') ? 'Lifetime'
      : sub.plan_name?.toLowerCase().includes('pro') ? 'Pro' : 'Plus'
    const ok = await invoke('plan-welcome', sub.email, `welcome-${sub.id}`, {
      planName: planLabel,
      displayName: prof?.display_name || prof?.username || null,
      siteUrl: SITE_URL,
    })
    if (ok) {
      await supabase.from('user_subscriptions').update({
        metadata: { ...meta, welcome_email_sent_at: new Date().toISOString() },
      }).eq('id', sub.id)
      stats.welcome++
    }
  }

  // --- 2. IAP / purchase receipts (last 24h, not yet sent) ---
  const { data: newIap } = await supabase
    .from('iap_purchases')
    .select('id, user_id, platform, product_id, amount_cents, currency, transaction_id, verified_at, metadata, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .eq('status', 'verified')
    .limit(200)

  for (const p of newIap ?? []) {
    const meta = (p.metadata as Record<string, unknown>) ?? {}
    if (meta.receipt_email_sent_at) continue
    const { data: auth } = await supabase.auth.admin.getUserById(p.user_id)
    const email = auth?.user?.email
    if (!email) continue
    const ok = await invoke('iap-receipt', email, `receipt-${p.id}`, {
      productName: p.product_id,
      platform: p.platform,
      amount: ((p.amount_cents ?? 0) / 100).toFixed(2),
      currency: p.currency ?? 'USD',
      transactionId: p.transaction_id,
      purchasedAt: p.verified_at ?? p.created_at,
    })
    if (ok) {
      await supabase.from('iap_purchases').update({
        metadata: { ...meta, receipt_email_sent_at: new Date().toISOString() },
      }).eq('id', p.id)
      stats.receipts++
    }
  }

  // --- 3. Inactive reminders (7+ days, not reminded in last 14 days) ---
  // Only run during the daily window so we don't spam every hour.
  const hour = new Date().getUTCHours()
  if (hour === 15) { // ~10am Central
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()

    // Find inactive users via ai_interactions (proxy for "logged in & used the app")
    const { data: candidates } = await supabase.rpc('get_inactive_users_for_reminder', {
      _inactive_since: sevenDaysAgo,
      _last_reminder_before: fourteenDaysAgo,
      _limit: 100,
    })

    for (const u of (candidates ?? []) as Array<{ user_id: string; email: string; display_name: string | null; tier: string | null; days_away: number }>) {
      if (!u.email) continue
      const ok = await invoke('inactive-reminder', u.email, `reminder-${u.user_id}-${new Date().toISOString().slice(0, 10)}`, {
        displayName: u.display_name,
        daysAway: u.days_away,
        tier: u.tier ?? 'Free',
        siteUrl: SITE_URL,
      })
      if (ok) {
        await supabase.from('profiles').update({
          // store on profiles via a jsonb-ish text col would be cleaner; we just upsert into a side table
        }).eq('user_id', u.user_id)
        await supabase.from('user_notifications').insert({
          user_id: u.user_id,
          type: 'inactive_reminder_email',
          title: 'Reminder email sent',
          message: `Sent inactive reminder (${u.days_away} days)`,
        }).then(() => {}).catch(() => {})
        stats.reminders++
      }
    }
  }

  return new Response(JSON.stringify(stats), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
