import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Brain, Loader2, Power, Shield, Sparkles, Database, FileDown, AlertTriangle, Route, Thermometer, SlidersHorizontal, ShieldCheck, Lock, CheckCircle2, ScrollText, RefreshCw, Siren, ChevronDown, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InfraSettings {
  id: string;
  kill_switch: boolean;
  default_model: string;
  fallback_model: string;
  temperature: number;
  max_tokens: number;
  rag_enabled: boolean;
  rag_top_k: number;
  use_writing_style: boolean;
  use_ai_memory: boolean;
  safety_level: "off" | "standard" | "strict";
  blocked_keywords: string[];
  system_prompt_override: string | null;
  fine_tune_enabled: boolean;
  notes: string | null;
  updated_at: string;
  advanced_addons?: AdvancedAddons;
}

interface AdvancedAddons {
  model_router: {
    mode: "local_only" | "cloud_only" | "local_first" | "best_available" | "private_only";
    task_routes: Record<"chat" | "coding" | "image" | "long_reasoning" | "file_tasks" | "safety_sensitive", string>;
  };
  task_temperatures: { factual: number; coding: number; chat: number; brainstorm: number; creative: number };
  rag_tuning: {
    preset: "normal" | "deep" | "low_noise";
    normal_top_k: number; deep_top_k: number; low_noise_top_k: number;
    source_priority: string[];
    dedupe_memory: boolean;
    show_retrieved_context: boolean;
  };
  memory_governance: { review_required: boolean; min_confidence: number; categories: string[] };
  tool_permissions: {
    read_only: boolean; ask_before_write: boolean; ask_before_delete: boolean;
    blocked_tools: string[]; admin_only_tools: string[];
  };
  privacy_mode: {
    local_only: boolean; cloud_fallback_allowed: boolean; strip_pii_before_cloud: boolean;
    no_store_sensitive: boolean; retention_days: number;
  };
  output_verification: {
    safety_check: boolean; factual_check: boolean; formatting_check: boolean;
    instruction_check: boolean; show_confidence: boolean;
  };
  logging: {
    replay_console_enabled: boolean; log_prompts: boolean; log_rag_entries: boolean;
    log_tools: boolean; log_latency: boolean;
  };
  fallback: {
    fallback_model: string; retry_count: number; timeout_ms: number;
    local_to_cloud_fallback: boolean; friendly_error_message: string;
  };
  emergency: {
    disable_ai: boolean; disable_tools: boolean; disable_cloud_fallback: boolean;
    lock_public_access: boolean; maintenance_mode: boolean;
  };
}

const DEFAULT_ADDONS: AdvancedAddons = {
  model_router: { mode: "best_available", task_routes: { chat: "default", coding: "default", image: "default", long_reasoning: "default", file_tasks: "default", safety_sensitive: "default" } },
  task_temperatures: { factual: 0.2, coding: 0.2, chat: 0.4, brainstorm: 0.8, creative: 0.9 },
  rag_tuning: { preset: "normal", normal_top_k: 5, deep_top_k: 15, low_noise_top_k: 3, source_priority: ["memory", "corpus", "writing_style"], dedupe_memory: true, show_retrieved_context: false },
  memory_governance: { review_required: false, min_confidence: 0.5, categories: ["personal", "project", "preference", "fact", "task"] },
  tool_permissions: { read_only: false, ask_before_write: true, ask_before_delete: true, blocked_tools: [], admin_only_tools: [] },
  privacy_mode: { local_only: false, cloud_fallback_allowed: true, strip_pii_before_cloud: true, no_store_sensitive: false, retention_days: 90 },
  output_verification: { safety_check: false, factual_check: false, formatting_check: false, instruction_check: false, show_confidence: false },
  logging: { replay_console_enabled: true, log_prompts: true, log_rag_entries: true, log_tools: true, log_latency: true },
  fallback: { fallback_model: "google/gemini-3-flash-preview", retry_count: 2, timeout_ms: 30000, local_to_cloud_fallback: true, friendly_error_message: "CriderGPT is taking a breather. Try again in a moment." },
  emergency: { disable_ai: false, disable_tools: false, disable_cloud_fallback: false, lock_public_access: false, maintenance_mode: false },
};

const MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (fast, cheap)" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro (smarter)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "openai/gpt-5", label: "GPT-5" },
];

export function AIInfrastructure() {
  const [settings, setSettings] = useState<InfraSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [blockedInput, setBlockedInput] = useState("");
  const [corpusCount, setCorpusCount] = useState<number | null>(null);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [addons, setAddons] = useState<AdvancedAddons>(DEFAULT_ADDONS);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("ai_infrastructure_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      setSettings(data);
      setBlockedInput((data.blocked_keywords || []).join(", "));
      // Merge stored addons with defaults so newly added keys hydrate cleanly
      const stored = data.advanced_addons || {};
      setAddons({
        ...DEFAULT_ADDONS,
        ...stored,
        model_router: { ...DEFAULT_ADDONS.model_router, ...(stored.model_router || {}), task_routes: { ...DEFAULT_ADDONS.model_router.task_routes, ...(stored.model_router?.task_routes || {}) } },
        task_temperatures: { ...DEFAULT_ADDONS.task_temperatures, ...(stored.task_temperatures || {}) },
        rag_tuning: { ...DEFAULT_ADDONS.rag_tuning, ...(stored.rag_tuning || {}) },
        memory_governance: { ...DEFAULT_ADDONS.memory_governance, ...(stored.memory_governance || {}) },
        tool_permissions: { ...DEFAULT_ADDONS.tool_permissions, ...(stored.tool_permissions || {}) },
        privacy_mode: { ...DEFAULT_ADDONS.privacy_mode, ...(stored.privacy_mode || {}) },
        output_verification: { ...DEFAULT_ADDONS.output_verification, ...(stored.output_verification || {}) },
        logging: { ...DEFAULT_ADDONS.logging, ...(stored.logging || {}) },
        fallback: { ...DEFAULT_ADDONS.fallback, ...(stored.fallback || {}) },
        emergency: { ...DEFAULT_ADDONS.emergency, ...(stored.emergency || {}) },
      });
    }

    const [{ count: c1 }, { count: c2 }, queueRes] = await Promise.all([
      supabase.from("cridergpt_training_corpus").select("id", { count: "exact", head: true }),
      supabase.from("ai_memory").select("id", { count: "exact", head: true }),
      (supabase as any).from("ai_memory_review").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    ]);
    setCorpusCount(c1 ?? 0);
    setMemoryCount(c2 ?? 0);
    setReviewQueue(queueRes?.data || []);
    setLoading(false);
  }

  async function reviewMemory(id: string, status: "approved" | "rejected") {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("ai_memory_review")
      .update({ status, reviewed_by: userData.user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setReviewQueue((q) => q.filter((r) => r.id !== id));
    toast.success(`Memory ${status}`);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    const blocked = blockedInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("ai_infrastructure_settings")
      .update({
        kill_switch: settings.kill_switch,
        default_model: settings.default_model,
        fallback_model: settings.fallback_model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        rag_enabled: settings.rag_enabled,
        rag_top_k: settings.rag_top_k,
        use_writing_style: settings.use_writing_style,
        use_ai_memory: settings.use_ai_memory,
        safety_level: settings.safety_level,
        blocked_keywords: blocked,
        system_prompt_override: settings.system_prompt_override,
        fine_tune_enabled: settings.fine_tune_enabled,
        notes: settings.notes,
        advanced_addons: addons,
        updated_at: new Date().toISOString(),
        updated_by: userData.user?.id,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("AI infrastructure settings saved");
  }

  async function exportFineTuneDataset() {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("cridergpt_training_corpus")
        .select("topic, category, content, metadata")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const lines = (data || []).map((row: any) => {
        const system =
          "You are CriderGPT, an FFA + ag + tech expert grounded in Jessie Crider's knowledge base.";
        const user = row.topic ? `Tell me about: ${row.topic}` : "Share knowledge.";
        const assistant = row.content;
        return JSON.stringify({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
            { role: "assistant", content: assistant },
          ],
        });
      });
      const blob = new Blob([lines.join("\n")], { type: "application/jsonl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cridergpt-finetune-${new Date().toISOString().slice(0, 10)}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${lines.length} training examples`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/15 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">AI Infrastructure</h2>
            <p className="text-sm text-muted-foreground">
              Control your in-house AI: model routing, RAG, safety, and fine-tuning.
            </p>
          </div>
          {settings.kill_switch && (
            <Badge variant="destructive" className="gap-1">
              <Power className="h-3 w-3" /> KILLED
            </Badge>
          )}
        </div>
      </div>

      {/* Kill switch */}
      <Card className={settings.kill_switch ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-4 w-4" /> Master Kill Switch
          </CardTitle>
          <CardDescription>
            Globally disables all AI calls (chat, image, blueprint). Use in emergencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm">
            {settings.kill_switch ? (
              <span className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="h-4 w-4" /> All AI is currently OFF
              </span>
            ) : (
              <span className="text-muted-foreground">AI is live and serving requests.</span>
            )}
          </div>
          <Switch
            checked={settings.kill_switch}
            onCheckedChange={(v) => setSettings({ ...settings, kill_switch: v })}
          />
        </CardContent>
      </Card>

      {/* Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Model & Generation</CardTitle>
          <CardDescription>Default model used when no per-request override is provided.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default model</Label>
              <Select
                value={settings.default_model}
                onValueChange={(v) => setSettings({ ...settings, default_model: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fallback model (on failure)</Label>
              <Select
                value={settings.fallback_model}
                onValueChange={(v) => setSettings({ ...settings, fallback_model: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {settings.temperature.toFixed(2)}</Label>
            <Slider
              min={0}
              max={2}
              step={0.05}
              value={[settings.temperature]}
              onValueChange={([v]) => setSettings({ ...settings, temperature: v })}
            />
            <p className="text-xs text-muted-foreground">
              Lower = focused/deterministic. Higher = creative/varied.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max tokens per response</Label>
            <Input
              type="number"
              min={256}
              max={16000}
              value={settings.max_tokens}
              onChange={(e) =>
                setSettings({ ...settings, max_tokens: parseInt(e.target.value || "2048") })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* RAG */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Retrieval-Augmented Generation (RAG)
          </CardTitle>
          <CardDescription>
            Inject your training corpus, memory, and writing style into every chat prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-2xl font-bold">{corpusCount ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Training corpus entries</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-2xl font-bold">{memoryCount ?? "—"}</div>
              <div className="text-xs text-muted-foreground">AI memory entries</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Enable RAG</Label>
            <Switch
              checked={settings.rag_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, rag_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Use Jessie's writing style</Label>
            <Switch
              checked={settings.use_writing_style}
              onCheckedChange={(v) => setSettings({ ...settings, use_writing_style: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Use AI memory table</Label>
            <Switch
              checked={settings.use_ai_memory}
              onCheckedChange={(v) => setSettings({ ...settings, use_ai_memory: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Retrieval depth (top-K): {settings.rag_top_k}</Label>
            <Slider
              min={1}
              max={50}
              step={1}
              value={[settings.rag_top_k]}
              onValueChange={([v]) => setSettings({ ...settings, rag_top_k: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Safety */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Safety Guards
          </CardTitle>
          <CardDescription>Moderation rules applied to inputs before reaching the model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Safety level</Label>
            <Select
              value={settings.safety_level}
              onValueChange={(v: "off" | "standard" | "strict") =>
                setSettings({ ...settings, safety_level: v })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off — no filtering</SelectItem>
                <SelectItem value="standard">Standard — block obvious harms</SelectItem>
                <SelectItem value="strict">Strict — also block PII, slurs, weapons</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Custom blocked keywords (comma-separated)</Label>
            <Input
              value={blockedInput}
              onChange={(e) => setBlockedInput(e.target.value)}
              placeholder="e.g. nuke, doxx, bypass-school-filter"
            />
          </div>
        </CardContent>
      </Card>

      {/* System prompt override */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> System Prompt Override
          </CardTitle>
          <CardDescription>
            Optional. Replaces the default CriderGPT persona prompt when set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            value={settings.system_prompt_override || ""}
            onChange={(e) =>
              setSettings({ ...settings, system_prompt_override: e.target.value || null })
            }
            placeholder="Leave blank to use the default persona prompt."
          />
        </CardContent>
      </Card>

      {/* Fine-tuning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Fine-Tuning
          </CardTitle>
          <CardDescription>
            Export your training corpus as a JSONL file ready for OpenAI / OSS fine-tuning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Mark fine-tuned model as active</Label>
            <Switch
              checked={settings.fine_tune_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, fine_tune_enabled: v })}
            />
          </div>
          <Button onClick={exportFineTuneDataset} disabled={exporting} variant="secondary">
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Export training dataset (.jsonl)
          </Button>
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* ADVANCED AI INFRASTRUCTURE ADD-ONS                              */}
      {/* ============================================================== */}
      <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border border-amber-500/30 p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Advanced AI Infrastructure</h2>
            <p className="text-xs text-muted-foreground">Operations console add-ons. Expand each card to configure.</p>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <AddonCard icon={<Route className="h-4 w-4" />} title="Model Router" desc="Route requests to local, cloud, or hybrid models — by task.">
          <div className="space-y-4">
            <LabelWithTip label="Routing mode" tip="How CriderGPT picks which model to use for each request.">
              <Select value={addons.model_router.mode} onValueChange={(v: any) => setAddons({ ...addons, model_router: { ...addons.model_router, mode: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local_only">Local model only</SelectItem>
                  <SelectItem value="cloud_only">Cloud model only</SelectItem>
                  <SelectItem value="local_first">Local-first with cloud fallback</SelectItem>
                  <SelectItem value="best_available">Best available model</SelectItem>
                  <SelectItem value="private_only">Private-only mode</SelectItem>
                </SelectContent>
              </Select>
            </LabelWithTip>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Per-task overrides</p>
            <div className="grid md:grid-cols-2 gap-3">
              {(["chat","coding","image","long_reasoning","file_tasks","safety_sensitive"] as const).map((task) => (
                <div key={task} className="space-y-1">
                  <Label className="capitalize text-xs">{task.replace("_"," ")}</Label>
                  <Select value={addons.model_router.task_routes[task]} onValueChange={(v) => setAddons({ ...addons, model_router: { ...addons.model_router, task_routes: { ...addons.model_router.task_routes, [task]: v } } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use routing mode</SelectItem>
                      {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </AddonCard>

        <AddonCard icon={<Thermometer className="h-4 w-4" />} title="Task Temperature Profiles" desc="Per-task creativity presets that override the global temperature.">
          <div className="space-y-4">
            {(Object.keys(addons.task_temperatures) as (keyof typeof addons.task_temperatures)[]).map((k) => (
              <div key={k} className="space-y-1">
                <Label className="capitalize">{k}: {addons.task_temperatures[k].toFixed(2)}</Label>
                <Slider min={0} max={2} step={0.05} value={[addons.task_temperatures[k]]} onValueChange={([v]) => setAddons({ ...addons, task_temperatures: { ...addons.task_temperatures, [k]: v } })} />
              </div>
            ))}
          </div>
        </AddonCard>

        <AddonCard icon={<SlidersHorizontal className="h-4 w-4" />} title="RAG Tuning" desc="Fine-tune retrieval depth, source priority, and dedup behavior.">
          <div className="space-y-4">
            <LabelWithTip label="Active retrieval preset" tip="Normal = balanced. Deep = pulls more context. Low-noise = strict, fewer entries.">
              <Select value={addons.rag_tuning.preset} onValueChange={(v: any) => setAddons({ ...addons, rag_tuning: { ...addons.rag_tuning, preset: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal mode</SelectItem>
                  <SelectItem value="deep">Deep mode</SelectItem>
                  <SelectItem value="low_noise">Low-noise mode</SelectItem>
                </SelectContent>
              </Select>
            </LabelWithTip>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Normal top-K</Label><Input type="number" value={addons.rag_tuning.normal_top_k} onChange={(e) => setAddons({ ...addons, rag_tuning: { ...addons.rag_tuning, normal_top_k: parseInt(e.target.value || "5") } })} /></div>
              <div><Label className="text-xs">Deep top-K</Label><Input type="number" value={addons.rag_tuning.deep_top_k} onChange={(e) => setAddons({ ...addons, rag_tuning: { ...addons.rag_tuning, deep_top_k: parseInt(e.target.value || "15") } })} /></div>
              <div><Label className="text-xs">Low-noise top-K</Label><Input type="number" value={addons.rag_tuning.low_noise_top_k} onChange={(e) => setAddons({ ...addons, rag_tuning: { ...addons.rag_tuning, low_noise_top_k: parseInt(e.target.value || "3") } })} /></div>
            </div>
            <LabelWithTip label="Source priority (comma-separated)" tip="Order RAG queries: e.g. memory, corpus, writing_style.">
              <Input value={addons.rag_tuning.source_priority.join(", ")} onChange={(e) => setAddons({ ...addons, rag_tuning: { ...addons.rag_tuning, source_priority: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} />
            </LabelWithTip>
            <ToggleRow label="Filter duplicate memories" tip="Skip near-identical entries during retrieval." checked={addons.rag_tuning.dedupe_memory} onChange={(v) => setAddons({ ...addons, rag_tuning: { ...addons.rag_tuning, dedupe_memory: v } })} />
            <ToggleRow label="Show retrieved context before sending (debug)" tip="Admin-only: surfaces RAG matches in the chat UI for inspection." checked={addons.rag_tuning.show_retrieved_context} onChange={(v) => setAddons({ ...addons, rag_tuning: { ...addons.rag_tuning, show_retrieved_context: v } })} />
          </div>
        </AddonCard>

        <AddonCard icon={<Database className="h-4 w-4" />} title="Memory Governance" desc="Review queue, confidence thresholds, and category labels.">
          <div className="space-y-4">
            <ToggleRow label="Require admin approval for new memories" tip="New memories land in the review queue instead of going live." checked={addons.memory_governance.review_required} onChange={(v) => setAddons({ ...addons, memory_governance: { ...addons.memory_governance, review_required: v } })} />
            <div className="space-y-1">
              <Label>Min confidence to auto-store: {addons.memory_governance.min_confidence.toFixed(2)}</Label>
              <Slider min={0} max={1} step={0.05} value={[addons.memory_governance.min_confidence]} onValueChange={([v]) => setAddons({ ...addons, memory_governance: { ...addons.memory_governance, min_confidence: v } })} />
            </div>
            <LabelWithTip label="Allowed memory categories" tip="Comma-separated. Memories outside these categories are rejected.">
              <Input value={addons.memory_governance.categories.join(", ")} onChange={(e) => setAddons({ ...addons, memory_governance: { ...addons.memory_governance, categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} />
            </LabelWithTip>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Review queue ({reviewQueue.length} pending)</p>
              {reviewQueue.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No memories awaiting review.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reviewQueue.map((r) => (
                    <div key={r.id} className="rounded-md border p-2 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{r.category || "uncategorized"}</Badge>
                        <Badge variant="secondary">conf: {Number(r.confidence ?? 0).toFixed(2)}</Badge>
                      </div>
                      <p className="text-foreground/90">{r.content}</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => reviewMemory(r.id, "approved")}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => reviewMemory(r.id, "rejected")}>Forget</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AddonCard>

        <AddonCard icon={<ShieldCheck className="h-4 w-4" />} title="Tool Permission Layer" desc="Control which tools the AI may invoke — and when to ask first.">
          <div className="space-y-3">
            <ToggleRow label="Read-only mode (no writes anywhere)" tip="AI may only read data; all mutations blocked." checked={addons.tool_permissions.read_only} onChange={(v) => setAddons({ ...addons, tool_permissions: { ...addons.tool_permissions, read_only: v } })} />
            <ToggleRow label="Ask before write actions" tip="Confirm with the user before any insert/update tool call." checked={addons.tool_permissions.ask_before_write} onChange={(v) => setAddons({ ...addons, tool_permissions: { ...addons.tool_permissions, ask_before_write: v } })} />
            <ToggleRow label="Ask before delete actions" tip="Confirm with the user before any delete tool call." checked={addons.tool_permissions.ask_before_delete} onChange={(v) => setAddons({ ...addons, tool_permissions: { ...addons.tool_permissions, ask_before_delete: v } })} />
            <LabelWithTip label="Blocked tools (comma-separated)" tip="Tool names the AI may never invoke.">
              <Input value={addons.tool_permissions.blocked_tools.join(", ")} onChange={(e) => setAddons({ ...addons, tool_permissions: { ...addons.tool_permissions, blocked_tools: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} placeholder="e.g. delete_user, drop_table" />
            </LabelWithTip>
            <LabelWithTip label="Admin-only tools (comma-separated)" tip="Tools restricted to admin sessions.">
              <Input value={addons.tool_permissions.admin_only_tools.join(", ")} onChange={(e) => setAddons({ ...addons, tool_permissions: { ...addons.tool_permissions, admin_only_tools: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} placeholder="e.g. send_broadcast, fix_user_plan" />
            </LabelWithTip>
          </div>
        </AddonCard>

        <AddonCard icon={<Lock className="h-4 w-4" />} title="Privacy Mode" desc="Local-first inference, PII stripping, and retention rules.">
          <div className="space-y-3">
            <ToggleRow label="Local-only inference" tip="Force all inference to local model. No cloud calls." checked={addons.privacy_mode.local_only} onChange={(v) => setAddons({ ...addons, privacy_mode: { ...addons.privacy_mode, local_only: v } })} />
            <ToggleRow label="Allow cloud fallback" tip="If local unavailable, fall back to cloud (unless local-only is on)." checked={addons.privacy_mode.cloud_fallback_allowed} onChange={(v) => setAddons({ ...addons, privacy_mode: { ...addons.privacy_mode, cloud_fallback_allowed: v } })} />
            <ToggleRow label="Strip PII before cloud fallback" tip="Redacts emails, phones, and tag IDs from prompts sent to cloud." checked={addons.privacy_mode.strip_pii_before_cloud} onChange={(v) => setAddons({ ...addons, privacy_mode: { ...addons.privacy_mode, strip_pii_before_cloud: v } })} />
            <ToggleRow label="Do not store sensitive conversations" tip="Conversations flagged as sensitive are not persisted in chat history." checked={addons.privacy_mode.no_store_sensitive} onChange={(v) => setAddons({ ...addons, privacy_mode: { ...addons.privacy_mode, no_store_sensitive: v } })} />
            <LabelWithTip label="Data retention (days)" tip="Auto-purge logs and transcripts older than this.">
              <Input type="number" min={1} max={3650} value={addons.privacy_mode.retention_days} onChange={(e) => setAddons({ ...addons, privacy_mode: { ...addons.privacy_mode, retention_days: parseInt(e.target.value || "90") } })} />
            </LabelWithTip>
          </div>
        </AddonCard>

        <AddonCard icon={<CheckCircle2 className="h-4 w-4" />} title="Output Verification" desc="Optional second-pass checks before returning a response.">
          <div className="space-y-3">
            <ToggleRow label="Safety check" tip="Re-scans the response for harmful content." checked={addons.output_verification.safety_check} onChange={(v) => setAddons({ ...addons, output_verification: { ...addons.output_verification, safety_check: v } })} />
            <ToggleRow label="Factual consistency check" tip="Cross-checks claims against retrieved RAG context." checked={addons.output_verification.factual_check} onChange={(v) => setAddons({ ...addons, output_verification: { ...addons.output_verification, factual_check: v } })} />
            <ToggleRow label="Formatting check" tip="Ensures markdown / code blocks are well-formed." checked={addons.output_verification.formatting_check} onChange={(v) => setAddons({ ...addons, output_verification: { ...addons.output_verification, formatting_check: v } })} />
            <ToggleRow label="Instruction-following check" tip="Verifies the answer addresses the user's actual ask." checked={addons.output_verification.instruction_check} onChange={(v) => setAddons({ ...addons, output_verification: { ...addons.output_verification, instruction_check: v } })} />
            <ToggleRow label="Show confidence score in UI" tip="Displays a 0-100 confidence badge under each response." checked={addons.output_verification.show_confidence} onChange={(v) => setAddons({ ...addons, output_verification: { ...addons.output_verification, show_confidence: v } })} />
          </div>
        </AddonCard>

        <AddonCard icon={<ScrollText className="h-4 w-4" />} title="Logging / Replay Console" desc="Capture every request for debugging and audit.">
          <div className="space-y-3">
            <ToggleRow label="Replay console enabled" tip="Master switch for the debug log stream." checked={addons.logging.replay_console_enabled} onChange={(v) => setAddons({ ...addons, logging: { ...addons.logging, replay_console_enabled: v } })} />
            <ToggleRow label="Log user prompts" tip="Stores the raw prompt for each request." checked={addons.logging.log_prompts} onChange={(v) => setAddons({ ...addons, logging: { ...addons.logging, log_prompts: v } })} />
            <ToggleRow label="Log RAG entries used" tip="Records which corpus/memory entries were injected." checked={addons.logging.log_rag_entries} onChange={(v) => setAddons({ ...addons, logging: { ...addons.logging, log_rag_entries: v } })} />
            <ToggleRow label="Log tool calls" tip="Records every tool invocation and response." checked={addons.logging.log_tools} onChange={(v) => setAddons({ ...addons, logging: { ...addons.logging, log_tools: v } })} />
            <ToggleRow label="Log latency metrics" tip="Per-stage timing (routing, RAG, model, verify)." checked={addons.logging.log_latency} onChange={(v) => setAddons({ ...addons, logging: { ...addons.logging, log_latency: v } })} />
            <p className="text-xs text-muted-foreground italic">Logs surface in the existing API activity feed.</p>
          </div>
        </AddonCard>

        <AddonCard icon={<RefreshCw className="h-4 w-4" />} title="Fallback &amp; Failure Handling" desc="Retries, timeouts, and graceful degradation.">
          <div className="space-y-3">
            <LabelWithTip label="Fallback model" tip="Used when the primary model errors or times out.">
              <Select value={addons.fallback.fallback_model} onValueChange={(v) => setAddons({ ...addons, fallback: { ...addons.fallback, fallback_model: v } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </LabelWithTip>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Retry count</Label><Input type="number" min={0} max={10} value={addons.fallback.retry_count} onChange={(e) => setAddons({ ...addons, fallback: { ...addons.fallback, retry_count: parseInt(e.target.value || "2") } })} /></div>
              <div><Label className="text-xs">Timeout (ms)</Label><Input type="number" min={1000} max={120000} value={addons.fallback.timeout_ms} onChange={(e) => setAddons({ ...addons, fallback: { ...addons.fallback, timeout_ms: parseInt(e.target.value || "30000") } })} /></div>
            </div>
            <ToggleRow label="If local server unavailable, use cloud fallback" tip="Auto-switch to cloud when local inference fails." checked={addons.fallback.local_to_cloud_fallback} onChange={(v) => setAddons({ ...addons, fallback: { ...addons.fallback, local_to_cloud_fallback: v } })} />
            <LabelWithTip label="Friendly error message" tip="Shown to users when all models fail.">
              <Textarea rows={2} value={addons.fallback.friendly_error_message} onChange={(e) => setAddons({ ...addons, fallback: { ...addons.fallback, friendly_error_message: e.target.value } })} />
            </LabelWithTip>
          </div>
        </AddonCard>

        <AddonCard icon={<Siren className="h-4 w-4 text-destructive" />} title="Emergency Controls" desc="Hard switches for incidents and maintenance.">
          <div className="space-y-3">
            <ToggleRow label="Disable AI responses" tip="Blocks all model calls (separate from master kill switch)." checked={addons.emergency.disable_ai} onChange={(v) => setAddons({ ...addons, emergency: { ...addons.emergency, disable_ai: v } })} />
            <ToggleRow label="Disable tool execution" tip="AI can chat but cannot invoke any tools." checked={addons.emergency.disable_tools} onChange={(v) => setAddons({ ...addons, emergency: { ...addons.emergency, disable_tools: v } })} />
            <ToggleRow label="Disable cloud fallback" tip="Forces local-only behavior immediately." checked={addons.emergency.disable_cloud_fallback} onChange={(v) => setAddons({ ...addons, emergency: { ...addons.emergency, disable_cloud_fallback: v } })} />
            <ToggleRow label="Lock public access" tip="Only authenticated users may use AI features." checked={addons.emergency.lock_public_access} onChange={(v) => setAddons({ ...addons, emergency: { ...addons.emergency, lock_public_access: v } })} />
            <ToggleRow label="Admin-only maintenance mode" tip="Only admins may use AI; everyone else sees a maintenance banner." checked={addons.emergency.maintenance_mode} onChange={(v) => setAddons({ ...addons, emergency: { ...addons.emergency, maintenance_mode: v } })} />
          </div>
        </AddonCard>
      </TooltipProvider>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={settings.notes || ""}
            onChange={(e) => setSettings({ ...settings, notes: e.target.value || null })}
            placeholder="Internal notes about this config (e.g. 'reduced temp for ag answers')."
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Last updated {new Date(settings.updated_at).toLocaleString()}
        </p>
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
