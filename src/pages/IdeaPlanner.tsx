import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Lightbulb, Sparkles, Save, Trash2, Plus, Loader2, Workflow, FileDown, Upload, Image as ImageIcon } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { BlueprintSVG } from "@/components/idea/BlueprintSVG";
import { exportIdeaToPDF } from "@/utils/ideaPdfExport";

interface Part { name: string; category: string; qty: string; notes?: string; }
interface Step { phase: string; title: string; detail: string; }
interface Idea {
  id: string;
  title: string;
  prompt: string;
  summary: string | null;
  mermaid: string | null;
  blueprint_svg: string | null;
  blueprint_kind: string | null;
  parts: Part[];
  steps: Step[];
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const SUGGESTED_PROMPTS: { title: string; prompt: string }[] = [
  {
    title: "Smart Livestock Collar",
    prompt: "A solar-powered GPS + NFC livestock collar for cattle that tracks location, body temperature, and activity. Sends alerts to the rancher's phone when an animal strays outside a geofence or shows signs of illness. Should run on a low-power microcontroller and last 30+ days between charges.",
  },
  {
    title: "Beehive Monitor",
    prompt: "A wooden Langstroth-style beehive with built-in sensors: hive weight (load cell), interior temperature/humidity, and a microphone for swarm detection. Solar powered with LoRa or WiFi backhaul. Beekeeper sees real-time hive health on a phone app.",
  },
  {
    title: "Leather Belt Pattern",
    prompt: "A handcrafted 1.5\" wide leather belt with a tooled western pattern, stainless steel buckle, and edge burnishing. Provide cutting dimensions, leather weight (oz), tools needed, stitch spacing, and finishing steps for a beginner leatherworker.",
  },
  {
    title: "Backyard Chicken Coop",
    prompt: "A 4-hen backyard chicken coop with attached run, sloped roof for rain runoff, removable droppings tray, and 2 nesting boxes. Built from cedar lumber. Include cut list, hardware list, and step-by-step assembly suitable for a weekend DIY build.",
  },
  {
    title: "FFA Show Box",
    prompt: "A portable FFA livestock show grooming box with locking lid, removable tool tray, side handle, and compartments for clippers, brushes, and adhesive. Made from 3/4\" plywood with a stained finish and brass hardware.",
  },
  {
    title: "Smart Feed Scale",
    prompt: "A bench-mounted livestock feed scale that weighs feed buckets up to 100 lbs, logs each feeding to an app over Bluetooth, and tracks feed conversion ratio per pen. Battery powered with an OLED display.",
  },
  {
    title: "Off-Grid Garden Sensor",
    prompt: "A weatherproof soil moisture, temperature, and light sensor stake for a vegetable garden. Solar trickle charged, transmits via LoRa to a base station, alerts gardener when soil moisture drops below threshold.",
  },
  {
    title: "Wooden Tool Tote",
    prompt: "A simple cedar carpenter's tool tote with a center dowel handle, sloped sides, and divided interior for hand tools. Provide a cut list for one 1x8x6ft board, joinery method (glued + nailed), and finishing steps.",
  },
];

export default function IdeaPlanner() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selected, setSelected] = useState<Idea | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading && (!user || !isAdmin)) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadIdeas();
  }, [isAdmin]);

  async function loadIdeas() {
    const { data, error } = await supabase
      .from("idea_planner_ideas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setIdeas((data || []) as unknown as Idea[]);
  }

  function newIdea() {
    setSelected(null);
    setTitle("");
    setPrompt("");
    setNotes("");
  }

  function openIdea(idea: Idea) {
    setSelected(idea);
    setTitle(idea.title);
    setPrompt(idea.prompt);
    setNotes(idea.notes || "");
  }

  async function generate() {
    if (!prompt.trim()) { toast.error("Describe your idea first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-idea-blueprint", {
        body: { prompt, title: title || "Untitled Idea" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const blueprint = data as { summary: string; mermaid?: string; blueprint_svg?: string; blueprint_kind?: string; parts: Part[]; steps: Step[] };
      const payload = {
        user_id: user!.id,
        title: title || "Untitled Idea",
        prompt,
        summary: blueprint.summary,
        mermaid: blueprint.mermaid || null,
        blueprint_svg: blueprint.blueprint_svg || null,
        blueprint_kind: blueprint.blueprint_kind || "system_diagram",
        parts: blueprint.parts as any,
        steps: blueprint.steps as any,
        notes,
        status: "draft",
      };

      if (selected) {
        const { data: upd, error: upErr } = await supabase
          .from("idea_planner_ideas").update(payload).eq("id", selected.id).select().single();
        if (upErr) throw upErr;
        setSelected(upd as unknown as Idea);
      } else {
        const { data: ins, error: insErr } = await supabase
          .from("idea_planner_ideas").insert(payload).select().single();
        if (insErr) throw insErr;
        setSelected(ins as unknown as Idea);
      }
      await loadIdeas();
      toast.success("Blueprint generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function saveNotes() {
    if (!selected) { toast.error("Generate or open an idea first"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("idea_planner_ideas")
      .update({ title, notes })
      .eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    loadIdeas();
  }

  async function deleteIdea(id: string) {
    if (!confirm("Delete this idea?")) return;
    const { error } = await supabase.from("idea_planner_ideas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (selected?.id === id) newIdea();
    loadIdeas();
    toast.success("Deleted");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("File too large (max 2MB)"); return; }
    try {
      const text = await file.text();
      const baseName = file.name.replace(/\.[^.]+$/, "");
      newIdea();
      setTitle(baseName.slice(0, 80));
      setPrompt(text.slice(0, 8000));
      toast.success(`Imported "${file.name}" — review then Generate Blueprint`);
    } catch {
      toast.error("Could not read file");
    }
  }

  async function exportPDF() {
    if (!selected) { toast.error("Open or generate an idea first"); return; }
    try {
      await exportIdeaToPDF({
        title: selected.title,
        prompt: selected.prompt,
        summary: selected.summary,
        mermaid: selected.mermaid,
        blueprint_svg: selected.blueprint_svg,
        parts: selected.parts,
        steps: selected.steps,
        notes: selected.notes,
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF export failed");
    }
  }

  if (authLoading || adminLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Idea Planner — CriderGPT Admin</title>
        <meta name="description" content="AI-powered invention planner with blueprints, parts lists, and diagrams." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Idea Planner</h1>
              <Badge variant="outline" className="ml-2">Admin</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>← Back</Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar: idea list */}
          <aside className="space-y-3">
            <Button onClick={newIdea} className="w-full" variant="default">
              <Plus className="h-4 w-4 mr-2" /> New Idea
            </Button>
            <ScrollArea className="h-[calc(100vh-220px)] pr-2">
              <div className="space-y-2">
                {ideas.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">No ideas yet. Start one →</p>
                )}
                {ideas.map((i) => (
                  <Card
                    key={i.id}
                    className={`cursor-pointer transition hover:border-primary/60 ${selected?.id === i.id ? "border-primary" : ""}`}
                    onClick={() => openIdea(i)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{i.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{i.prompt}</p>
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                          onClick={(e) => { e.stopPropagation(); deleteIdea(i.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Main editor */}
          <main className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Describe the idea
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Title (e.g. Smart livestock collar)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Describe your invention. Include what it does, how it might work, target user. The AI will fill in parts, wiring, code, and diagrams."
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Need a spark? Try one of these:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_PROMPTS.map((s) => (
                      <Button
                        key={s.title}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-1.5 px-2.5 text-xs"
                        onClick={() => { setTitle(s.title); setPrompt(s.prompt); }}
                      >
                        {s.title}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generate} disabled={generating || !prompt.trim()}>
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {selected ? "Regenerate Blueprint" : "Generate Blueprint"}
                  </Button>
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Product
                      <input
                        type="file"
                        accept=".txt,.md,.markdown,.json,text/plain"
                        className="hidden"
                        onChange={handleImport}
                      />
                    </label>
                  </Button>
                  {selected && (
                    <>
                      <Button variant="outline" onClick={saveNotes} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Title & Notes
                      </Button>
                      <Button variant="outline" onClick={exportPDF}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {selected?.summary && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                <CardContent><p className="text-sm leading-relaxed">{selected.summary}</p></CardContent>
              </Card>
            )}

            {selected?.blueprint_svg && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" /> Visual Blueprint
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BlueprintSVG svg={selected.blueprint_svg} className="w-full overflow-auto" />
                </CardContent>
              </Card>
            )}

            {selected?.mermaid && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" /> System Diagram
                  </CardTitle>
                </CardHeader>
                <CardContent><MermaidDiagram chart={selected.mermaid} id={`d-${selected.id}`} /></CardContent>
              </Card>
            )}

            {selected?.parts && selected.parts.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Parts & Materials</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground border-b border-border">
                        <tr><th className="text-left py-2 pr-4">Part</th><th className="text-left py-2 pr-4">Category</th><th className="text-left py-2 pr-4">Qty</th><th className="text-left py-2">Notes</th></tr>
                      </thead>
                      <tbody>
                        {selected.parts.map((p, i) => (
                          <tr key={i} className="border-b border-border/40">
                            <td className="py-2 pr-4 font-medium">{p.name}</td>
                            <td className="py-2 pr-4"><Badge variant="secondary" className="text-xs">{p.category}</Badge></td>
                            <td className="py-2 pr-4">{p.qty}</td>
                            <td className="py-2 text-muted-foreground">{p.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {selected?.steps && selected.steps.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Build Blueprint</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {selected.steps.map((s, i) => (
                      <li key={i} className="border-l-2 border-primary/60 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{s.phase}</Badge>
                          <span className="font-medium text-sm">{i + 1}. {s.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{s.detail}</p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Notepad</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Your own notes, sketches, links, follow-ups…"
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {selected && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-xs text-muted-foreground">
                      Last updated {new Date(selected.updated_at).toLocaleString()}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </>
  );
}
