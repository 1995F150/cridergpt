import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    );

    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    // Support supabase.functions.invoke (POST-only) by allowing action routing via body or query param
    let body: any = null;
    try { body = await req.json(); } catch (_) {}
    const action = url.searchParams.get('action') || (body && body.action);

    // Helper to ensure date is present
    const ensureDate = (eventData: any) => {
      if (!eventData) return eventData;
      if (!eventData.date) {
        const src = eventData.start_time || eventData.end_time;
        if (src) {
          try {
            const d = new Date(src);
            if (!isNaN(d.getTime())) {
              eventData.date = d.toISOString().slice(0, 10);
            }
          } catch (_) {}
        }
      }
      return eventData;
    };

    // List events (POST with action=list is preferred)
    if (method === 'POST' && action === 'list') {
      const { data: events, error } = await supabaseClient
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true, nullsFirst: false })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create event
    if (method === 'POST' && (!action || action === 'create')) {
      if (!body || !body.data) {
        return new Response(JSON.stringify({ error: 'Invalid payload. Expected { action: "create", data: { ... } }' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const eventData = ensureDate(body.data);

      const { data: event, error } = await supabaseClient
        .from('calendar_events')
        .insert({
          ...eventData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update event
    if (method === 'POST' && action === 'update') {
      const eventData = ensureDate(body?.data);
      const eventId = url.searchParams.get('id') || (body && (body.id || body.eventId));

      if (!eventId) {
        return new Response(JSON.stringify({ error: 'Event ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: event, error } = await supabaseClient
        .from('calendar_events')
        .update(eventData)
        .eq('id', eventId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete event
    if (method === 'POST' && action === 'delete') {
      const eventId = url.searchParams.get('id') || (body && (body.id || body.eventId));

      if (!eventId) {
        return new Response(JSON.stringify({ error: 'Event ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseClient
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting event:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method/action not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Calendar function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});