import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const OWNER_EMAIL = 'jessiecrider3@gmail.com';

// Realtime API tool format (flat — not nested under "function")
const PRODUCT_TOOLS = [
  {
    type: 'function',
    name: 'search_products',
    description: "Search the CriderGPT catalog (physical products, digital products, Snapchat filters). Use whenever the user asks about products, pricing, or availability.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search across titles, descriptions, tags' },
        category: { type: 'string', description: 'Optional category filter, e.g. "snapchat-filters"' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'recommend_products',
    description: "Recommend products based on a stated need (e.g. 'I need something for tracking cattle'). Returns 5 best matches.",
    parameters: {
      type: 'object',
      properties: { need: { type: 'string', description: "What the user is trying to accomplish" } },
      required: ['need'],
    },
  },
  {
    type: 'function',
    name: 'lookup_order',
    description: "Look up the signed-in user's own orders, subscriptions, and custom-filter requests. Returns status and amounts.",
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'create_checkout_link',
    description: "Generate a Stripe checkout link the user can tap to pay. Use after confirming intent. Returns a URL.",
    parameters: {
      type: 'object',
      properties: {
        product_ref: { type: 'string', description: 'Stripe price_id, prod_id, or digital_products id/slug' },
        quantity: { type: 'integer', minimum: 1, default: 1 },
      },
      required: ['product_ref'],
    },
  },
  {
    type: 'function',
    name: 'add_to_cart',
    description: "Add an item to the user's store cart so they can review it on the /store page.",
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Store product id' },
        quantity: { type: 'integer', minimum: 1, default: 1 },
      },
      required: ['product_id'],
    },
  },
  {
    type: 'function',
    name: 'find_restaurants',
    description: "Find restaurants on DoorDash by cuisine or dish, optionally near a location. Returns deep links the user can tap to open DoorDash and check out there. CriderGPT cannot place DoorDash orders directly — always hand off via link.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Cuisine, dish, or restaurant name (e.g. "pizza", "tacos", "Chipotle")' },
        location: { type: 'string', description: 'Optional city, ZIP, or neighborhood' },
      },
      required: ['query'],
    },
  },
];


const BASE_INSTRUCTIONS = `You are CriderGPT, an authentic ag-expert AI built by Jessie Crider for FFA members and the rural community. You're the smartest kid in the barn — knowledgeable about livestock, farming, FFA, agriculture, modding (especially Farming Simulator), and rural life. Speak naturally and conversationally, like talking on the phone. Keep responses concise for voice — usually 1-3 sentences unless asked for detail. Be warm, direct, and helpful.`;

function buildPersonalizedInstructions(opts: {
  isOwner: boolean;
  displayName: string | null;
  email: string | null;
  username: string | null;
}) {
  const { isOwner, displayName, email, username } = opts;

  if (isOwner) {
    return `${BASE_INSTRUCTIONS}

IMPORTANT — YOU ARE TALKING TO YOUR CREATOR:
You are speaking with Jessie Crider — your founder, owner, and lead developer. Address him as "Jessie" (or "boss" occasionally if it feels natural). Be candid, technical when needed, and treat him as an insider — he built you. You can speak freely about system internals, builds, and roadmap. Greet him by name when the call starts.`;
  }

  const name = displayName || username || (email ? email.split('@')[0] : null);
  if (name) {
    return `${BASE_INSTRUCTIONS}

You are speaking with ${name}${email ? ` (${email})` : ''}. Greet them by their first name when the call starts and use their name naturally during the conversation.`;
  }

  return `${BASE_INSTRUCTIONS}

You are speaking with a guest user whose name you don't know yet. Greet them warmly and feel free to ask their name early in the conversation.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Identify the caller from their JWT
    let isOwner = false;
    let displayName: string | null = null;
    let email: string | null = null;
    let username: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          email = user.email ?? null;
          isOwner = email?.toLowerCase() === OWNER_EMAIL;
          const meta = (user.user_metadata || {}) as Record<string, any>;
          displayName = meta.full_name || meta.name || meta.display_name || null;
          username = meta.preferred_username || meta.user_name || null;
        }
      } catch (err) {
        console.warn('Could not resolve user from JWT:', err);
      }
    }

    const body = await req.json().catch(() => ({}));
    const voice = body.voice || 'alloy';
    const model = body.model || 'gpt-4o-realtime-preview-2024-12-17';

    const instructions = buildPersonalizedInstructions({ isOwner, displayName, email, username });
    console.log('[realtime-token] caller:', { email, isOwner, displayName, username });

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        instructions: instructions + `\n\n🛒 PRODUCT TOOLS:\nYou have function tools to search products, recommend items, look up the user's orders, add to their cart, and create Stripe checkout links. When the user asks about products, pricing, what they bought, or wants to buy/order something, USE THE TOOLS — never make up SKUs, prices, or order details. Read prices/descriptions out loud naturally; you don't need to read URLs aloud.`,
        modalities: ['audio', 'text'],
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: PRODUCT_TOOLS,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI session error:', response.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: errText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    // Surface caller context to the client so it can tailor the greeting trigger too
    data._caller = { isOwner, displayName, email, username };
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Realtime token error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
