import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Hammer, Loader2, Copy } from "lucide-react";

type Mode = "food" | "craft";

const FOOD_PROMPT = (req: string, servings: string, diet: string) => `
You are a recipe writer. Write a clear, practical recipe a regular home cook could follow.
Mode: FOOD
Servings: ${servings || "4"}
Diet/notes: ${diet || "none"}
User request: ${req}

Output in this exact markdown layout:
# {Recipe Name}
**Prep:** {time} | **Cook:** {time} | **Serves:** {n}

## Ingredients
- bullet list with measurements

## Instructions
1. numbered steps, one action per step

## Tips
- 2-4 short tips (substitutions, storage, doneness cues)
`.trim();

const CRAFT_PROMPT = (req: string, materials: string, skill: string) => `
You are a maker / craftsman writing a "recipe" for a hands-on craft project.
Mode: CRAFT
Skill level: ${skill || "beginner-friendly"}
Materials user has on hand: ${materials || "standard hobby supplies"}
User request: ${req}

Output in this exact markdown layout:
# {Project Name}
**Time:** {est} | **Skill:** {level} | **Cost:** ~$X

## Materials
- bullet list with sizes/quantities

## Tools
- bullet list

## Steps
1. numbered, one action per step, include measurements and safety notes where relevant

## Finish & Care
- 2-4 tips on finishing, sealing, or maintaining the piece
`.trim();

export default function Recipes() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("food");
  const [request, setRequest] = useState("");
  const [servings, setServings] = useState("4");
  const [diet, setDiet] = useState("");
  const [materials, setMaterials] = useState("");
  const [skill, setSkill] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const generate = async () => {
    if (!request.trim()) {
      toast({ title: "Tell me what to make", description: "Describe the dish or project.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const prompt =
        mode === "food"
          ? FOOD_PROMPT(request, servings, diet)
          : CRAFT_PROMPT(request, materials, skill);

      const { data, error } = await supabase.functions.invoke("chat-with-ai", {
        body: { message: prompt, model: "cridergpt-5.0" },
      });
      if (error) throw new Error(error.message || "Edge function failed");
      if (data?.error && !data?.response) throw new Error(data.error);
      const text = data?.response;
      if (!text) throw new Error("Empty response from AI");
      setResult(text);
    } catch (e: any) {
      toast({
        title: "Recipe generator failed",
        description: (e?.message || "Unknown error").slice(0, 220),
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Helmet>
        <title>CriderGPT Recipe Generator — Food & Craft</title>
        <meta
          name="description"
          content="Generate food recipes and hands-on craft project plans with CriderGPT. Quick, clear, and farm-tested."
        />
        <link rel="canonical" href="https://cridergpt.com/recipes" />
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              Recipe Generator
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Food recipes or hands-on craft project plans. Pick a mode, describe what you want, hit generate.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="food" className="gap-2">
                  <ChefHat className="h-4 w-4" /> Food
                </TabsTrigger>
                <TabsTrigger value="craft" className="gap-2">
                  <Hammer className="h-4 w-4" /> Craft
                </TabsTrigger>
              </TabsList>

              <TabsContent value="food" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Servings</label>
                    <Input value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Diet / notes</label>
                    <Input
                      value={diet}
                      onChange={(e) => setDiet(e.target.value)}
                      placeholder="gluten-free, low carb…"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="craft" className="space-y-3 mt-4">
                <div>
                  <label className="text-xs text-muted-foreground">Materials on hand</label>
                  <Input
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="leather scraps, brass snaps, paracord…"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Skill level</label>
                  <Select value={skill} onValueChange={setSkill}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div>
              <label className="text-xs text-muted-foreground">
                What do you want to {mode === "food" ? "cook" : "make"}?
              </label>
              <Textarea
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder={
                  mode === "food"
                    ? "Smoked brisket sandwich with quick pickles…"
                    : "Leather cord keeper with brass snap and engraved logo…"
                }
                rows={3}
              />
            </div>

            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate recipe"
              )}
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
  );
}
