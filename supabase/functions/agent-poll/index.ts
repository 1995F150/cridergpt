import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  try {
    // Auth: validate user via bearer token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // Hard lock: only authorized user
    if (user.email?.toLowerCase() !== 'jessiecrider3@gmail.com') {
      return json({ error: 'Forbidden' }, 403)
    }

    const db = createClient(supabaseUrl, serviceKey)
    const body = await req.json()
    const action = body.action as string

    switch (action) {
      case 'poll': {
        // Fetch up to 10 pending tasks, mark them running
        const { data: tasks, error } = await db
          .from('agent_execution_queue')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .eq('kill_switch', false)
          .order('created_at', { ascending: true })
          .limit(10)

        if (error) throw error

        if (tasks && tasks.length > 0) {
          const ids = tasks.map((t: any) => t.id)
          await db
            .from('agent_execution_queue')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .in('id', ids)
        }

        return json({ tasks: tasks || [] })
      }

      case 'report': {
        const { task_id, result, status: taskStatus, vision_data } = body
        if (!task_id) return json({ error: 'task_id required' }, 400)

        const updatePayload: Record<string, any> = {
          status: taskStatus === 'failed' ? 'failed' : 'completed',
          result: result || null,
          completed_at: new Date().toISOString(),
        }
        if (vision_data) updatePayload.vision_data = vision_data

        const { error } = await db
          .from('agent_execution_queue')
          .update(updatePayload)
          .eq('id', task_id)
          .eq('user_id', user.id)

        if (error) throw error
        return json({ ok: true })
      }

      case 'heartbeat': {
        const { agent_version } = body
        await db
          .from('agent_status')
          .upsert({
            user_id: user.id,
            is_online: true,
            last_heartbeat: new Date().toISOString(),
            agent_version: agent_version || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

        // Return any kill-switched tasks so agent can abort them
        const { data: killed } = await db
          .from('agent_execution_queue')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'running')
          .eq('kill_switch', true)

        return json({ ok: true, kill_tasks: killed || [] })
      }

      case 'vision_upload': {
        const { screenshot_base64, metadata: visionMeta } = body
        if (!screenshot_base64) return json({ error: 'screenshot_base64 required' }, 400)

        const fileName = `${user.id}/${Date.now()}.png`
        const bytes = Uint8Array.from(atob(screenshot_base64), c => c.charCodeAt(0))

        const { error: uploadError } = await db.storage
          .from('agent-vision')
          .upload(fileName, bytes, { contentType: 'image/png' })

        if (uploadError) throw uploadError

        return json({ ok: true, path: fileName, metadata: visionMeta })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    console.error('agent-poll error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
