from pathlib import Path

root = Path(__file__).resolve().parents[1]
ui = root / "src/components/admin/AIInfrastructure.tsx"
chat = root / "supabase/functions/chat-with-ai/index.ts"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise RuntimeError(f"Could not find patch anchor: {label}")
    return text.replace(old, new, 1)


# Wire the new dashboard panel into the existing AI Infrastructure page.
text = ui.read_text()
text = replace_once(
    text,
    'import { PublicApiKeysPanel } from "./PublicApiKeysPanel";\n',
    'import { PublicApiKeysPanel } from "./PublicApiKeysPanel";\nimport { EngineStatusPanel } from "./EngineStatusPanel";\n',
    "EngineStatusPanel import",
)
text = replace_once(
    text,
    '  advanced_addons?: AdvancedAddons;\n}',
    '  advanced_addons?: AdvancedAddons;\n  engine_base_url?: string;\n  engine_enabled?: boolean;\n  engine_request_timeout_ms?: number;\n  config_version?: number;\n  config_updated_at?: string;\n}',
    "engine setting types",
)
text = replace_once(
    text,
    '      {/* Kill switch */}\n',
    '      <EngineStatusPanel />\n\n      {/* Kill switch */}\n',
    "status panel placement",
)
ui.write_text(text)

# Make chat-with-ai use the database-backed URL/control values for every modality.
text = chat.read_text()
settings_anchor = """    console.log('[chat-with-ai] mode:', mode, 'message:', message?.substring(0, 100), 'has image:', !!(imageData || image_base64 || image_url));

    if (!LOVABLE_API_KEY) {
"""
settings_block = """    console.log('[chat-with-ai] mode:', mode, 'message:', message?.substring(0, 100), 'has image:', !!(imageData || image_base64 || image_url));

    // Central AI Infrastructure control plane. The public URL is stored in
    // Supabase; the API key remains an Edge Function secret.
    let infraSettings: any = null;
    try {
      const { data: infra } = await supabase
        .from('ai_infrastructure_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      infraSettings = infra;
    } catch (e) {
      console.warn('[chat-with-ai] could not load AI infrastructure settings:', e);
    }
    const ENGINE_URL = String(
      infraSettings?.engine_base_url || Deno.env.get('CRIDERGPT_ENGINE_URL') || ''
    ).replace(/\\/$/, '');
    const ENGINE_API_KEY = Deno.env.get('CRIDERGPT_ENGINE_API_KEY');
    const ENGINE_ENABLED = infraSettings?.engine_enabled !== false;
    const ENGINE_TIMEOUT_MS = Math.min(
      Math.max(Number(infraSettings?.engine_request_timeout_ms) || 120000, 1000),
      3600000,
    );

    async function recordEngineStatus(patch: Record<string, unknown>) {
      try {
        await supabase.from('engine_runtime_status').upsert({
          engine_id: 'primary',
          base_url: ENGINE_URL || infraSettings?.engine_base_url || 'https://cridergpt.com/engine/api',
          config_version: Number(infraSettings?.config_version) || 0,
          updated_at: new Date().toISOString(),
          ...patch,
        });
      } catch (statusError) {
        console.warn('[chat-with-ai] engine status update skipped:', statusError);
      }
    }

    if (!LOVABLE_API_KEY) {
"""
text = replace_once(text, settings_anchor, settings_block, "early infrastructure load")

# Remove the later duplicate settings query while keeping the existing enforcement.
duplicate = """    // === AI Infrastructure settings (admin-controlled) ===
    let infraSettings: any = null;
    try {
      const { data: infra } = await supabase
        .from('ai_infrastructure_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      infraSettings = infra;
    } catch (e) {
      console.log('Could not load AI infra settings, using defaults');
    }

"""
text = replace_once(
    text,
    duplicate,
    "    // AI Infrastructure settings were loaded before modality routing.\n\n",
    "duplicate infrastructure load",
)

# Image path: use the central constants and respect enabled state.
text = text.replace(
    """      const ENGINE_URL = Deno.env.get('CRIDERGPT_ENGINE_URL');
      const ENGINE_API_KEY = Deno.env.get('CRIDERGPT_ENGINE_API_KEY');
      const engineEnabled = !!(ENGINE_URL && ENGINE_API_KEY);
""",
    """      const engineEnabled = Boolean(ENGINE_ENABLED && ENGINE_URL && ENGINE_API_KEY);
""",
    1,
)
text = text.replace("signal: AbortSignal.timeout(120000),", "signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),", 1)

# Record image success/failure without interrupting the response.
text = replace_once(
    text,
    """          if (r.ok) {
            const data = await r.json();
            return new Response(
""",
    """          if (r.ok) {
            const data = await r.json();
            await recordEngineStatus({
              online: true,
              status: data.status === 'degraded' ? 'degraded' : 'online',
              last_heartbeat: new Date().toISOString(),
              last_health_check: new Date().toISOString(),
              latency_ms: data.latency_ms ?? null,
              active_model: data.model ?? null,
              last_error: null,
            });
            return new Response(
""",
    "image success status",
)
text = replace_once(
    text,
    """          console.warn(`[chat-with-ai] engine ${enginePath} returned ${r.status}, falling back to cloud`);
""",
    """          await recordEngineStatus({
            online: false,
            status: 'degraded',
            last_health_check: new Date().toISOString(),
            last_error: `HTTP ${r.status} on ${enginePath}`,
          });
          console.warn(`[chat-with-ai] engine ${enginePath} returned ${r.status}, falling back to cloud`);
""",
    "image HTTP failure status",
)
text = replace_once(
    text,
    """        } catch (e) {
          console.warn('[chat-with-ai] engine call failed, falling back to cloud:', e instanceof Error ? e.message : e);
        }
""",
    """        } catch (e) {
          await recordEngineStatus({
            online: false,
            status: 'offline',
            last_health_check: new Date().toISOString(),
            last_error: e instanceof Error ? e.message : String(e),
          });
          console.warn('[chat-with-ai] engine call failed, falling back to cloud:', e instanceof Error ? e.message : e);
        }
""",
    "image exception status",
)

# Chat path: remove local constants, honor enabled setting, use DB timeout.
text = replace_once(
    text,
    """      const ENGINE_URL = Deno.env.get('CRIDERGPT_ENGINE_URL');
      const ENGINE_API_KEY = Deno.env.get('CRIDERGPT_ENGINE_API_KEY');

      if (!ENGINE_URL) {
        return new Response(JSON.stringify({
          error: 'CriderGPT Engine is not configured. Set CRIDERGPT_ENGINE_URL secret.',
          source: 'engine-missing',
        }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
""",
    """      if (!ENGINE_ENABLED) {
        return new Response(JSON.stringify({
          error: 'CriderGPT Engine is disabled in AI Infrastructure.',
          source: 'engine-disabled',
        }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!ENGINE_URL) {
        return new Response(JSON.stringify({
          error: 'CriderGPT Engine URL is not configured.',
          source: 'engine-missing',
        }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
""",
    "chat engine constants",
)
text = text.replace("signal: AbortSignal.timeout(120000),", "signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),", 1)

text = replace_once(
    text,
    """      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[chat-with-ai] engine unreachable:', msg);
""",
    """      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await recordEngineStatus({
          online: false,
          status: 'offline',
          last_health_check: new Date().toISOString(),
          latency_ms: Date.now() - startedAt,
          last_error: msg,
        });
        console.error('[chat-with-ai] engine unreachable:', msg);
""",
    "chat unreachable status",
)
text = replace_once(
    text,
    """      if (!engineRes.ok) {
        const errText = await engineRes.text().catch(() => '');
        console.error('[chat-with-ai] engine error:', engineRes.status, errText.substring(0, 500));
""",
    """      if (!engineRes.ok) {
        const errText = await engineRes.text().catch(() => '');
        await recordEngineStatus({
          online: false,
          status: 'degraded',
          last_health_check: new Date().toISOString(),
          latency_ms: Date.now() - startedAt,
          last_error: `HTTP ${engineRes.status}: ${errText.substring(0, 300)}`,
        });
        console.error('[chat-with-ai] engine error:', engineRes.status, errText.substring(0, 500));
""",
    "chat HTTP failure status",
)
text = replace_once(
    text,
    """      responseSource = 'engine';
      console.log(`[chat-with-ai] engine reply in ${Date.now() - startedAt}ms (model=${engineData.model ?? 'unknown'})`);
""",
    """      responseSource = 'engine';
      await recordEngineStatus({
        online: true,
        status: engineData.status === 'degraded' ? 'degraded' : 'online',
        last_heartbeat: new Date().toISOString(),
        last_health_check: new Date().toISOString(),
        latency_ms: engineData.latency_ms ?? (Date.now() - startedAt),
        active_model: engineData.model ?? null,
        ack_config_version: Number(engineData.ack_config_version) || undefined,
        last_error: null,
      });
      console.log(`[chat-with-ai] engine reply in ${Date.now() - startedAt}ms (model=${engineData.model ?? 'unknown'})`);
""",
    "chat success status",
)

chat.write_text(text)
print("Applied engine control-plane frontend and Edge Function integration patches.")
