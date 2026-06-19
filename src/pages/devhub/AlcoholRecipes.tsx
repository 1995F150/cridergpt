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
import { Wine, GlassWater, Beer, Flame, Loader2, Copy, Camera, Sparkles, Image as ImageIcon, X } from "lucide-react";

type Mode = "wine" | "cocktail" | "beer" | "pairing" | "grade";


const PROMPTS: Record<Mode, (req: string, extra: Record<string, string>) => string> = {
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

  const set = (k: string, v: string) => setExtra((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!request.trim()) {
      toast({ title: "Tell me what to make", description: "Describe the drink, batch, or dish.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const prompt = PROMPTS[mode](request, extra);
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
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="wine" className="gap-2"><Wine className="h-4 w-4" /> Wine</TabsTrigger>
                  <TabsTrigger value="cocktail" className="gap-2"><GlassWater className="h-4 w-4" /> Cocktail</TabsTrigger>
                  <TabsTrigger value="beer" className="gap-2"><Beer className="h-4 w-4" /> Beer</TabsTrigger>
                  <TabsTrigger value="pairing" className="gap-2"><Flame className="h-4 w-4" /> Pairing</TabsTrigger>
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
              </Tabs>

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
