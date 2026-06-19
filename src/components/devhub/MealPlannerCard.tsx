import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  foodBudget: number;
  period: string;
}

interface MealDay {
  day: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snack?: string;
  est_cost?: number;
}

interface MealPlan {
  summary?: string;
  total_estimated?: number;
  days?: MealDay[];
  grocery_list?: { item: string; qty?: string; est_cost?: number }[];
  savings_tips?: string[];
}

interface SavedPlan {
  id: string;
  week_start: string;
  budget: number;
  household_size: number;
  notes: string | null;
  plan: MealPlan;
  created_at: string;
}

function thisWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // back to Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function MealPlannerCard({ foodBudget, period }: Props) {
  const { user } = useAuth();
  const [budget, setBudget] = useState<number>(Math.max(foodBudget || 0, 0));
  const [household, setHousehold] = useState<number>(2);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [saved, setSaved] = useState<SavedPlan[]>([]);

  useEffect(() => { setBudget(Math.max(foodBudget || 0, 0)); }, [foodBudget]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("money_split_meal_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(10);
      if (data) setSaved(data as any);
    })();
  }, [user?.id]);

  const generate = async () => {
    if (!budget || budget <= 0) {
      toast.error("Set a food budget first (or fund the Food envelope)");
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke("meal-plan-generator", {
        body: { budget, household_size: household, period, notes: notes.trim() || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const p: MealPlan = (data as any)?.plan || (data as any);
      setPlan(p);
      toast.success("Meal plan ready");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Meal planner failed");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!user) { toast.error("Sign in to save plans"); return; }
    if (!plan) return;
    const { data, error } = await supabase
      .from("money_split_meal_plans")
      .insert({
        user_id: user.id,
        week_start: thisWeekStart(),
        budget,
        household_size: household,
        notes: notes.trim() || null,
        plan: plan as any,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setSaved(prev => [data as any, ...prev].slice(0, 10));
    toast.success("Meal plan saved");
  };

  const remove = async (id: string) => {
    if (!user) return;
    await supabase.from("money_split_meal_plans").delete().eq("id", id).eq("user_id", user.id);
    setSaved(prev => prev.filter(p => p.id !== id));
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-orange-400" />
          Weekly Food Planner
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Plans a full week of meals against your Food envelope. Pulls budget from your split — overrideable.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Food budget ($)</Label>
            <Input type="number" min={0} value={budget} onChange={e => setBudget(Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label className="text-xs">Household size</Label>
            <Input type="number" min={1} max={12} value={household} onChange={e => setHousehold(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <Label className="text-xs">Pay period</Label>
            <Input value={period} readOnly className="bg-muted/40" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Notes (dietary needs, leftovers, what's already in the fridge)</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Got a pound of ground beef, half-gallon milk. No pork. Try to use rice."
          />
        </div>

        <Button onClick={generate} disabled={loading} className="w-full">
          {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Planning…</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Generate Week Plan</>)}
        </Button>

        {plan && (
          <div className="space-y-3 border border-border/60 rounded-lg p-3 bg-muted/30">
            {plan.summary && <p className="text-sm">{plan.summary}</p>}
            {typeof plan.total_estimated === "number" && (
              <Badge variant="secondary">Estimated total: ${plan.total_estimated.toFixed(2)} of ${budget}</Badge>
            )}
            {Array.isArray(plan.days) && (
              <div className="grid gap-2">
                {plan.days.map((d, i) => (
                  <div key={i} className="p-2 rounded bg-background/60 border border-border/50 text-xs">
                    <div className="font-semibold mb-1 flex justify-between">
                      <span>{d.day}</span>
                      {typeof d.est_cost === "number" && <span className="text-muted-foreground">${d.est_cost.toFixed(2)}</span>}
                    </div>
                    {d.breakfast && <div><span className="text-muted-foreground">Breakfast:</span> {d.breakfast}</div>}
                    {d.lunch && <div><span className="text-muted-foreground">Lunch:</span> {d.lunch}</div>}
                    {d.dinner && <div><span className="text-muted-foreground">Dinner:</span> {d.dinner}</div>}
                    {d.snack && <div><span className="text-muted-foreground">Snack:</span> {d.snack}</div>}
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(plan.grocery_list) && plan.grocery_list.length > 0 && (
              <div>
                <div className="font-semibold text-sm mb-1">Grocery List</div>
                <ul className="text-xs space-y-0.5">
                  {plan.grocery_list.map((g, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{g.item}{g.qty ? ` — ${g.qty}` : ""}</span>
                      {typeof g.est_cost === "number" && <span className="text-muted-foreground">${g.est_cost.toFixed(2)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(plan.savings_tips) && plan.savings_tips.length > 0 && (
              <div className="text-xs">
                <div className="font-semibold mb-1">Savings tips</div>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {plan.savings_tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={save} disabled={!user}>
              {user ? "Save this plan" : "Sign in to save"}
            </Button>
          </div>
        )}

        {saved.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <div className="text-sm font-semibold mb-2">Saved plans</div>
            <div className="space-y-2">
              {saved.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30 border border-border/50">
                  <div>
                    <div className="font-medium">Week of {p.week_start} · ${Number(p.budget).toFixed(0)} · {p.household_size} ppl</div>
                    {p.plan?.summary && <div className="text-muted-foreground truncate max-w-[60ch]">{p.plan.summary}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPlan(p.plan)}>Load</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
