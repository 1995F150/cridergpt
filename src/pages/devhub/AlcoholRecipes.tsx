import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wine, GlassWater, Beer, Flame, Loader2, Copy, Camera, Sparkles, Image as ImageIcon, X, Bot, Cpu, Cloud } from "lucide-react";

type Mode = "wine" | "cocktail" | "beer" | "pairing" | "grade" | "ai";


const PROMPTS: Partial<Record<Mode, (req: string, extra: Record<string, string>) => string>> = {
  wine: (req, x) => `
You are a home winemaker. Write a clear, practical wine recipe a hobbyist could follow safely.
Style: ${x.style || "fruit wine"}
Batch size: ${x.size || "1 gallon"}
Sweetness: ${x.sweet || "semi-dry"}
User request: ${req}

Output in this exact markdown layout:
# {Wine Name}
**Style:** {style} | **Batch:** {size} | **ABV target:** ~{x}% | **Time:** primary + secondary + bottle aging

## Ingredients
- bullet list with weights/volumes (fruit, sugar, yeast, nutrient, pectic enzyme, campden, acid blend)

## Equipment
- bullet list (primary bucket, carboy, airlock, hydrometer, siphon, sanitizer)

## Steps
1. numbered steps: sanitize, must prep, pitch yeast, primary, racking to secondary, stabilize, backsweeten, bottle
   Include OG/FG targets and racking timing.

## Tasting Notes & Aging
- 2-4 lines on expected flavor, ideal aging time, serving temp
`.trim(),

  cocktail: (req, x) => `
You are a bartender. Write a clean, build-it-tonight cocktail recipe.
Base spirit: ${x.base || "bourbon"}
Glass: ${x.glass || "rocks"}
Strength: ${x.strength || "balanced"}
User request: ${req}

Output in this exact markdown layout:
# {Cocktail Name}
**Glass:** {glass} | **Method:** stir/shake/build | **ABV:** ~{x}%

## Ingredients
- bullet list in oz / dashes

## Build
1. numbered steps with technique (stir 30s, shake until tin frosts, etc.)

## Garnish & Notes
- garnish, expressed peel, and 1-2 tweak ideas (smokier, sweeter, drier)
`.trim(),

  beer: (req, x) => `
You are a homebrewer. Write a 1-gallon BIAB extract-or-partial-mash recipe a beginner can finish on a stovetop.
Style: ${x.style || "American pale ale"}
Batch size: ${x.size || "1 gallon"}
User request: ${req}

Output in this exact markdown layout:
# {Beer Name}
**Style:** {style} | **Batch:** {size} | **OG:** {x} | **FG:** {x} | **ABV:** ~{x}% | **IBU:** {x}

## Grain Bill / Extract
- bullet list

## Hops
- additions with time + oz

## Yeast & Water
- strain, temp, water notes

## Brew Day Steps
1. numbered steps from mash/steep through pitch

## Fermentation & Packaging
- timeline, priming sugar, bottle/keg notes
`.trim(),

  pairing: (req, x) => `
You are a sommelier + grill cook. Pair an alcohol with a dish and explain why like a friend at the counter.
Dish: ${req}
Preferred category: ${x.cat || "any"}
Budget: ${x.budget || "under $25"}

Output in this exact markdown layout:
# Pairing for {dish}

## Top Pick
- name, type, ~price, where to find it

## Why It Works
- 3-5 short bullets (fat, salt, smoke, sweetness, acid)

## Backup Picks
- 2 alternates (one cheaper, one fancier) with one-line reason each

## Serving
- temp, glass, garnish or pour notes
`.trim(),
};

export default function AlcoholRecipes() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("wine");
  const [request, setRequest] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  // Grade-tab state
  const [gradeImage, setGradeImage] = useState<string>("");
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeReport, setGradeReport] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  // AI-tab state (local-first via hybrid router)
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiSource, setAiSource] = useState<"local" | "cloud" | null>(null);

  const generateAI = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Tell me what to make", description: "Give it a prompt — wine, cocktail, food, whatever.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiResult("");
    setAiSource(null);
    try {
      const sys = `You are Jessie Crider's home recipe AI. Generate a clean, practical recipe from the user's prompt. Detect category (wine, cocktail, beer, mead, cider, food, sauce, marinade) on your own. Output markdown: # Name, **meta line**, ## Ingredients (bullets w/ amounts), ## Equipment (if relevant), ## Steps (numbered), ## Notes. Keep it short, safe, and doable at home. 21+ for alcohol.`;
      const { data, error } = await supabase.functions.invoke("chat-with-ai", {
        body: {
          message: `${sys}\n\nUser request: ${aiPrompt}`,
          model: "cridergpt-5.0",
          preferLocal: true,
        },
      });
      if (error) throw new Error(error.message || "Edge function failed");
      if (data?.error && !data?.response) throw new Error(data.error);
      const text = data?.response;
      if (!text) throw new Error("Empty response from AI");
      setAiResult(text);
      setAiSource(data?._local || data?.source === "local" ? "local" : "cloud");
    } catch (e: any) {
      toast({ title: "AI generator failed", description: (e?.message || "Unknown error").slice(0, 220), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const set = (k: string, v: string) => setExtra((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (mode === "grade") return; // handled separately
    const fn = PROMPTS[mode];
    if (!fn) return;
    if (!request.trim()) {
      toast({ title: "Tell me what to make", description: "Describe the drink, batch, or dish.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const prompt = fn(request, extra);
      const { data, error } = await supabase.functions.invoke("chat-with-ai", {
        body: { message: prompt, model: "cridergpt-5.0" },
      });
      if (error) throw new Error(error.message || "Edge function failed");
      if (data?.error && !data?.response) throw new Error(data.error);
      const text = data?.response;
      if (!text) throw new Error("Empty response from AI");
      setResult(text);
    } catch (e: any) {
      toast({ title: "Generator failed", description: (e?.message || "Unknown error").slice(0, 220), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onImagePicked = (f: File | null | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setGradeImage(String(reader.result || ""));
      setGradeReport(null);
    };
    reader.readAsDataURL(f);
  };

  const runGrade = async () => {
    if (!gradeImage) {
      toast({ title: "Add a photo first", description: "Take or upload a photo of the must/foam.", variant: "destructive" });
      return;
    }
    setGradeLoading(true);
    setGradeReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("fermentation-grader", {
        body: {
          imageData: gradeImage,
          productType: extra.productType || "wine must",
          stage: extra.stage || "primary fermentation",
          ingredients: extra.ingredients,
          notes: extra.gradeNotes,
        },
      });
      if (error) throw new Error(error.message || "Grader failed");
      if ((data as any)?.error) throw new Error((data as any).error);
      const report = (data as any)?.report || data;
      setGradeReport(report);
    } catch (e: any) {
      toast({ title: "Grading failed", description: (e?.message || "Unknown error").slice(0, 220), variant: "destructive" });
    } finally {
      setGradeLoading(false);
    }
  };


  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast({ title: "Copied", description: "Recipe copied to clipboard." });
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <Helmet>
          <title>Alcohol Recipe Lab — Owner Only</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>

        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wine className="h-6 w-6 text-primary" />
                Alcohol Recipe Lab
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Owner-only. Wine, cocktails, homebrew, and food-pairing generator. 21+. Drink responsibly.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setExtra({}); }}>
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger value="wine" className="gap-1 px-2"><Wine className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="cocktail" className="gap-1 px-2"><GlassWater className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="beer" className="gap-1 px-2"><Beer className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="pairing" className="gap-1 px-2"><Flame className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="grade" className="gap-1 px-2"><Camera className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="ai" className="gap-1 px-2"><Bot className="h-4 w-4" /></TabsTrigger>
                </TabsList>


                <TabsContent value="wine" className="space-y-3 mt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground">Style</label>
                      <Input placeholder="blackberry, muscadine…" onChange={(e) => set("style", e.target.value)} /></div>
                    <div><label className="text-xs text-muted-foreground">Batch size</label>
                      <Input placeholder="1 gallon" onChange={(e) => set("size", e.target.value)} /></div>
                    <div><label className="text-xs text-muted-foreground">Sweetness</label>
                      <Select onValueChange={(v) => set("sweet", v)}>
                        <SelectTrigger><SelectValue placeholder="semi-dry" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dry">Dry</SelectItem>
                          <SelectItem value="semi-dry">Semi-dry</SelectItem>
                          <SelectItem value="sweet">Sweet</SelectItem>
                          <SelectItem value="dessert">Dessert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="cocktail" className="space-y-3 mt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground">Base spirit</label>
                      <Input placeholder="bourbon, rye, gin…" onChange={(e) => set("base", e.target.value)} /></div>
                    <div><label className="text-xs text-muted-foreground">Glass</label>
                      <Input placeholder="rocks, coupe, highball" onChange={(e) => set("glass", e.target.value)} /></div>
                    <div><label className="text-xs text-muted-foreground">Strength</label>
                      <Select onValueChange={(v) => set("strength", v)}>
                        <SelectTrigger><SelectValue placeholder="balanced" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="boozy">Boozy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="beer" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground">Style</label>
                      <Input placeholder="hazy IPA, stout…" onChange={(e) => set("style", e.target.value)} /></div>
                    <div><label className="text-xs text-muted-foreground">Batch size</label>
                      <Input placeholder="1 gallon" onChange={(e) => set("size", e.target.value)} /></div>
                  </div>
                </TabsContent>

                <TabsContent value="pairing" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground">Category</label>
                      <Select onValueChange={(v) => set("cat", v)}>
                        <SelectTrigger><SelectValue placeholder="any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="wine">Wine</SelectItem>
                          <SelectItem value="bourbon">Bourbon / Whiskey</SelectItem>
                          <SelectItem value="beer">Beer</SelectItem>
                          <SelectItem value="cocktail">Cocktail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-xs text-muted-foreground">Budget</label>
                      <Input placeholder="under $25" onChange={(e) => set("budget", e.target.value)} /></div>
                  </div>
                </TabsContent>

                <TabsContent value="grade" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Product</label>
                      <Select onValueChange={(v) => set("productType", v)}>
                        <SelectTrigger><SelectValue placeholder="wine must" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wine must">Wine must</SelectItem>
                          <SelectItem value="cider must">Cider must</SelectItem>
                          <SelectItem value="mead must">Mead must</SelectItem>
                          <SelectItem value="beer wort">Beer wort</SelectItem>
                          <SelectItem value="sugar wash">Sugar wash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Stage</label>
                      <Select onValueChange={(v) => set("stage", v)}>
                        <SelectTrigger><SelectValue placeholder="primary fermentation" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="just pitched">Just pitched (day 0)</SelectItem>
                          <SelectItem value="primary day 1-3">Primary day 1-3 (foaming)</SelectItem>
                          <SelectItem value="primary fermentation">Primary fermentation</SelectItem>
                          <SelectItem value="secondary fermentation">Secondary fermentation</SelectItem>
                          <SelectItem value="conditioning">Conditioning / clearing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Ingredients (optional)</label>
                    <Input placeholder="grape juice + 2 cups brown sugar + bread yeast" onChange={(e) => set("ingredients", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notes (optional)</label>
                    <Textarea
                      rows={2}
                      placeholder="Bubbled hard the first 6 hours, foam is dropping now…"
                      onChange={(e) => set("gradeNotes", e.target.value)}
                    />
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { onImagePicked(e.target.files?.[0]); e.target.value = ""; }}
                  />
                  <input
                    ref={camRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { onImagePicked(e.target.files?.[0]); e.target.value = ""; }}
                  />

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => camRef.current?.click()} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" /> Take Photo
                    </Button>
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
                      <ImageIcon className="h-4 w-4 mr-2" /> Upload
                    </Button>
                  </div>

                  {gradeImage && (
                    <div className="relative">
                      <img src={gradeImage} alt="Fermentation sample" className="w-full max-h-64 object-contain rounded border border-border" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => { setGradeImage(""); setGradeReport(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <Button onClick={runGrade} disabled={gradeLoading || !gradeImage} className="w-full">
                    {gradeLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Grading…</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Grade Fermentation</>)}
                  </Button>

                  {gradeReport && (
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          Grade: <Badge className="text-base px-3">{gradeReport.grade ?? "?"}</Badge>
                          {typeof gradeReport.score === "number" && <span className="text-sm text-muted-foreground">{gradeReport.score}/100</span>}
                          {gradeReport.confidence && <Badge variant="outline" className="ml-auto text-xs">conf: {gradeReport.confidence}</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {gradeReport.stage_observed && <div><span className="text-muted-foreground">Stage observed:</span> {gradeReport.stage_observed}</div>}
                        {gradeReport.predicted_outcome && <div><span className="text-muted-foreground">Outcome:</span> {gradeReport.predicted_outcome}</div>}
                        {gradeReport.fermentation_health && <div><span className="text-muted-foreground">Health:</span> {gradeReport.fermentation_health}</div>}
                        {typeof gradeReport.abv_estimate_pct === "number" && <div><span className="text-muted-foreground">ABV estimate:</span> ~{gradeReport.abv_estimate_pct}%</div>}
                        {Array.isArray(gradeReport.concerns) && gradeReport.concerns.length > 0 && (
                          <div>
                            <div className="text-muted-foreground">Concerns:</div>
                            <ul className="list-disc list-inside text-xs">
                              {gradeReport.concerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(gradeReport.recommendations) && gradeReport.recommendations.length > 0 && (
                          <div>
                            <div className="text-muted-foreground">Next steps:</div>
                            <ul className="list-disc list-inside text-xs">
                              {gradeReport.recommendations.map((c: string, i: number) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              {mode !== "grade" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {mode === "pairing" ? "What dish are you pairing?" : "What do you want to make?"}
                    </label>
                    <Textarea
                      value={request}
                      onChange={(e) => setRequest(e.target.value)}
                      placeholder={
                        mode === "wine" ? "Blackberry wine, semi-dry, around 12% ABV…" :
                        mode === "cocktail" ? "Bourbon-oak old fashioned with a smoked orange peel…" :
                        mode === "beer" ? "Easy stovetop oatmeal stout…" :
                        "Thick New York strip, Worcestershire + heavy seasoning, grilled medium…"
                      }
                      rows={3}
                    />
                  </div>

                  <Button onClick={generate} disabled={loading} className="w-full">
                    {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>) : "Generate"}
                  </Button>
                </>
              )}

            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Result</CardTitle>
                <Button variant="outline" size="sm" onClick={copy}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{result}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DevHubGuard>
  );
}
