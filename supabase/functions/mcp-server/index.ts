// CriderGPT MCP Server — exposes tools to ChatGPT Apps via Model Context Protocol
// Public endpoint (verify_jwt = false). Uses service-role key for DB reads.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ---------- Tool definitions ----------
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const TOOLS = [
  {
    name: "livestock_lookup",
    description: "Look up a livestock animal by its CriderGPT tag ID (e.g. 'CriderGPT-LL1L81'). Returns species, breed, status, and notes.",
    inputSchema: {
      type: "object",
      properties: { tag_id: { type: "string", description: "Tag ID like 'CriderGPT-XXXXXX'" } },
      required: ["tag_id"],
    },
    annotations: { title: "Livestock Lookup", ...READ_ONLY_ANNOTATIONS },
  },
  {
    name: "store_search",
    description: "Search the CriderGPT digital store for products (mods, filters, guides). Returns title, price, and description.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search keywords" } },
      required: ["query"],
    },
    annotations: { title: "Store Search", ...READ_ONLY_ANNOTATIONS },
  },
  {
    name: "events_lookup",
    description: "Get upcoming public FFA / CriderGPT events.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max events to return (default 5)" } },
    },
    annotations: { title: "Events Lookup", ...READ_ONLY_ANNOTATIONS },
  },
  {
    name: "filter_quote",
    description: "Estimate price for a custom Snapchat filter based on description complexity. Pure calculation, no side effects.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "What the filter should do/look like" },
        filter_type: { type: "string", description: "lens or geofilter" },
      },
      required: ["description"],
    },
    annotations: { title: "Filter Quote", ...READ_ONLY_ANNOTATIONS },
  },
  {
    name: "cridergpt_chat",
    description: "Ask CriderGPT (Jessie Crider's FFA / agriculture / rural-tech AI) any question about livestock, farming, FFA, or rural life.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", description: "Your question" } },
      required: ["question"],
    },
    annotations: {
      title: "CriderGPT Chat",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
];

// ---------- Tool handlers ----------
async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "livestock_lookup": {
      const tagId = String(args.tag_id ?? "").trim();
      if (!tagId) return { error: "tag_id required" };
      const { data, error } = await supabase
        .from("livestock_animals")
        .select("animal_id, name, species, breed, sex, status, birth_date, notes, tag_id")
        .eq("tag_id", tagId)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) {
        const { data: pool } = await supabase
          .from("livestock_tag_pool")
          .select("tag_id, status")
          .eq("tag_id", tagId)
          .maybeSingle();
        return pool ? { tag: pool, animal: null, message: "Tag exists in pool but not assigned to an animal." }
                    : { message: "No tag or animal found with that ID." };
      }
      return { animal: data };
    }

    case "store_search": {
      const q = String(args.query ?? "").trim();
      const { data, error } = await supabase
        .from("digital_products")
        .select("title, slug, description, price_cents, currency, category, product_type")
        .eq("active", true)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
        .limit(10);
      if (error) return { error: error.message };
      return {
        results: (data ?? []).map((p) => ({
          title: p.title,
          price: `$${(p.price_cents / 100).toFixed(2)} ${p.currency}`,
          category: p.category,
          type: p.product_type,
          description: p.description,
          url: `https://cridergpt.lovable.app/store/${p.slug}`,
        })),
      };
    }

    case "events_lookup": {
      const limit = Math.min(Number(args.limit ?? 5), 25);
      const { data, error } = await supabase
        .from("events")
        .select("title, description, event_date, event_time, category")
        .eq("visibility", "public")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date", { ascending: true })
        .limit(limit);
      if (error) return { error: error.message };
      return { events: data ?? [] };
    }

    case "filter_quote": {
      const desc = String(args.description ?? "");
      const type = String(args.filter_type ?? "lens");
      const len = desc.length;
      const complex = /3d|animation|tracking|face|world|ar\b/i.test(desc);
      let base = type === "geofilter" ? 25 : 50;
      if (len > 200) base += 25;
      if (complex) base += 75;
      return {
        estimate_usd: base,
        range: `$${base}–$${base + 50}`,
        type,
        notes: "Final price set after review. Order at https://cridergpt.lovable.app/custom-filters",
      };
    }

    case "cridergpt_chat": {
      const question = String(args.question ?? "");
      if (!OPENAI_KEY) return { error: "OpenAI key not configured" };
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are CriderGPT, an FFA and agriculture expert AI built by Jessie Crider. Answer with practical, rural-tech-savvy advice. Keep it concise." },
            { role: "user", content: question },
          ],
          max_tokens: 500,
        }),
      });
      const j = await r.json();
      return { answer: j.choices?.[0]?.message?.content ?? "No answer." };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ---------- JSON-RPC / MCP handler ----------
function jsonRpc(id: unknown, result?: unknown, error?: { code: number; message: string }) {
  return error
    ? { jsonrpc: "2.0", id, error }
    : { jsonrpc: "2.0", id, result };
}

async function handleRpc(msg: any) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    return jsonRpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "cridergpt-mcp", version: "1.0.0" },
    });
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null; // notifications get no response
  }
  if (method === "tools/list") {
    return jsonRpc(id, { tools: TOOLS });
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments ?? {};
    try {
      const out = await callTool(name, args);
      return jsonRpc(id, {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      });
    } catch (e) {
      return jsonRpc(id, undefined, { code: -32000, message: (e as Error).message });
    }
  }
  if (method === "ping") return jsonRpc(id, {});

  return jsonRpc(id, undefined, { code: -32601, message: `Method not found: ${method}` });
}

// ---------- HTTP server ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Health check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ name: "cridergpt-mcp", status: "ok", tools: TOOLS.map((t) => t.name) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Support batch
    if (Array.isArray(body)) {
      const results = (await Promise.all(body.map(handleRpc))).filter(Boolean);
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await handleRpc(body);
    if (result === null) {
      return new Response(null, { status: 202, headers: corsHeaders });
    }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify(jsonRpc(null, undefined, { code: -32700, message: "Parse error: " + (e as Error).message })),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
