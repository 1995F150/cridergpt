import { useEffect, useMemo, useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  PiggyBank, Wallet, Zap, Home, TrendingUp, AlertTriangle, Lightbulb, RotateCcw,
  History, Trash2, Save, Lock, Plus, Minus, ArrowDownToLine
} from "lucide-react";
import { toast } from "sonner";

type Period = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

interface HistoryEntry {
  id: string;
  ts: number;
  income: number;
  period: Period;
  pct: Record<string, number>;
}

interface Txn {
  id: string;
  ts: number;
  bucket: string;
  amount: number; // + deposit, - withdraw
  note: string;
}

const HISTORY_KEY = "money-split-history";
const ENVELOPE_KEY = "money-split-envelopes";
const TXN_KEY = "money-split-txns";

interface Bucket {
  key: string;
  label: string;
  emoji: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  desc: string;
}

const BUCKETS: Bucket[] = [
  { key: "cridergpt", label: "CriderGPT / Business", emoji: "🚀", icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10", desc: "Reinvest into the app, ads, new builds" },
  { key: "emergency", label: "Emergency Fund", emoji: "🛡️", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", desc: "3–6 months expenses, do not touch" },
  { key: "living", label: "Bills / Living", emoji: "🏠", icon: Home, color: "text-blue-400", bg: "bg-blue-400/10", desc: "Rent, utilities, food, gas, phone" },
  { key: "fun", label: "Personal / Fun", emoji: "🎮", icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-400/10", desc: "Gaming, going out, treats for yourself" },
  { key: "savings", label: "Savings / Invest", emoji: "📈", icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-400/10", desc: "Stocks, crypto, long-term wealth" },
  { key: "taxes", label: "Taxes (set-aside)", emoji: "📝", icon: PiggyBank, color: "text-slate-400", bg: "bg-slate-400/10", desc: "Self-employment tax reserve" },
];

const PRESETS = [
  { name: "50/30/20 Classic", desc: "Living 50% / Fun 30% / Savings 20%", values: { living: 50, fun: 30, savings: 20, cridergpt: 0, emergency: 0, taxes: 0 } },
  { name: "Business First", desc: "Aggressive reinvestment mode", values: { cridergpt: 40, emergency: 10, living: 25, fun: 10, savings: 10, taxes: 5 } },
  { name: "Survival Mode", desc: "Bare minimum, stack cash", values: { living: 60, emergency: 20, fun: 5, savings: 10, cridergpt: 0, taxes: 5 } },
  { name: "Balanced Builder", desc: "Grow business + life", values: { cridergpt: 25, emergency: 10, living: 30, fun: 15, savings: 15, taxes: 5 } },
];

const DEFAULTS: Record<string, number> = {
  cridergpt: 20,
  emergency: 10,
  living: 35,
  fun: 10,
  savings: 15,
  taxes: 10,
};

export default function MoneySplitCalc() {
  const [income, setIncome] = useState(1000);
  const [period, setPeriod] = useState<Period>("weekly");
  const [pct, setPct] = useState<Record<string, number>>({ ...DEFAULTS });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [envelopes, setEnvelopes] = useState<Record<string, number>>({});
  const [txns, setTxns] = useState<Txn[]>([]);
  const [manualAmt, setManualAmt] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
      const env = localStorage.getItem(ENVELOPE_KEY);
      if (env) setEnvelopes(JSON.parse(env));
      const tx = localStorage.getItem(TXN_KEY);
      if (tx) setTxns(JSON.parse(tx));
    } catch {}
  }, []);

  const persistHistory = (next: HistoryEntry[]) => {
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const persistEnvelopes = (next: Record<string, number>) => {
    setEnvelopes(next);
    localStorage.setItem(ENVELOPE_KEY, JSON.stringify(next));
  };

  const persistTxns = (next: Txn[]) => {
    setTxns(next);
    localStorage.setItem(TXN_KEY, JSON.stringify(next));
  };

  const logTxn = (bucket: string, amount: number, note: string, currentTxns: Txn[]) => {
    const entry: Txn = { id: crypto.randomUUID(), ts: Date.now(), bucket, amount, note };
    return [entry, ...currentTxns].slice(0, 200);
  };

  const depositPaycheck = () => {
    const nextEnv = { ...envelopes };
    let nextTx = [...txns];
    BUCKETS.forEach(b => {
      const cut = income * ((pct[b.key] ?? 0) / 100);
      if (cut > 0) {
        nextEnv[b.key] = (nextEnv[b.key] ?? 0) + cut;
        nextTx = logTxn(b.key, cut, `Paycheck split (${period})`, nextTx);
      }
    });
    persistEnvelopes(nextEnv);
    persistTxns(nextTx);
    toast.success(`Deposited ${fmt(income)} across envelopes`);
  };

  const adjustEnvelope = (bucket: string, delta: number, note: string) => {
    if (!delta || isNaN(delta)) return;
    const current = envelopes[bucket] ?? 0;
    if (delta < 0 && current + delta < 0) {
      toast.error("Not enough in that envelope");
      return;
    }
    const nextEnv = { ...envelopes, [bucket]: current + delta };
    const nextTx = logTxn(bucket, delta, note, txns);
    persistEnvelopes(nextEnv);
    persistTxns(nextTx);
    setManualAmt(prev => ({ ...prev, [bucket]: "" }));
  };

  const resetEnvelopes = () => {
    if (!confirm("Empty every envelope and clear all transactions? This can't be undone.")) return;
    persistEnvelopes({});
    persistTxns([]);
    toast.success("Lockbox reset");
  };

  const totalLockbox = useMemo(
    () => Object.values(envelopes).reduce((a, b) => a + b, 0),
    [envelopes]
  );

  const totalPct = useMemo(() => Object.values(pct).reduce((a, b) => a + b, 0), [pct]);
  const overBudget = totalPct > 100;
  const underBudget = totalPct < 100;

  const yearlyIncome = useMemo(() => {
    switch (period) {
      case "daily": return income * 365;
      case "weekly": return income * 52;
      case "biweekly": return income * 26;
      case "monthly": return income * 12;
      case "yearly": return income;
    }
  }, [income, period]);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const periodMultiplier = useMemo(() => {
    switch (period) {
      case "daily": return 1 / 365;
      case "weekly": return 1 / 52;
      case "biweekly": return 1 / 26;
      case "monthly": return 1 / 12;
      case "yearly": return 1;
    }
  }, [period]);

  const applyPreset = (values: Record<string, number>) => {
    setPct({ ...values });
  };

  const reset = () => setPct({ ...DEFAULTS });

  const saveToHistory = () => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      income,
      period,
      pct: { ...pct },
    };
    const next = [entry, ...history].slice(0, 50);
    persistHistory(next);
    toast.success("Saved to history");
  };

  const loadEntry = (e: HistoryEntry) => {
    setIncome(e.income);
    setPeriod(e.period);
    setPct({ ...e.pct });
    toast.success("Loaded from history");
  };

  const removeEntry = (id: string) => {
    persistHistory(history.filter(h => h.id !== id));
  };

  const clearHistory = () => {
    persistHistory([]);
    toast.success("History cleared");
  };

  return (
    <DevHubPage title="Money Split Calculator" subtitle="Divide every dollar: CriderGPT, emergency, fun, and savings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Income
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>How much did you make?</Label>
              <Input
                type="number"
                value={income}
                onChange={e => setIncome(Math.max(0, +e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["daily", "weekly", "biweekly", "monthly", "yearly"] as Period[]).map(p => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="sm"
                  className="capitalize text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Yearly equivalent: <span className="font-mono font-bold text-foreground">{fmt(yearlyIncome)}</span>
            </div>
            <Button onClick={saveToHistory} className="w-full" size="sm">
              <Save className="w-4 h-4 mr-2" /> Save This Calculation
            </Button>
          </CardContent>
        </Card>

        {/* Quick Presets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Quick Presets
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESETS.map(preset => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left flex-col items-start gap-1"
                onClick={() => applyPreset(preset.values)}
              >
                <span className="font-semibold text-sm">{preset.name}</span>
                <span className="text-xs text-muted-foreground">{preset.desc}</span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-auto py-3 px-4 justify-start text-left flex-col items-start gap-1"
              onClick={reset}
            >
              <span className="font-semibold text-sm flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset to Default</span>
              <span className="text-xs text-muted-foreground">20% CriderGPT / 35% Living / 15% Savings</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sliders */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Split Your {period === "daily" ? "Day" : period === "weekly" ? "Paycheck" : period === "biweekly" ? "2 Weeks" : period === "monthly" ? "Month" : "Year"}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={overBudget ? "destructive" : underBudget ? "secondary" : "default"}>
                {totalPct}% allocated
              </Badge>
              {overBudget && <span className="text-xs text-destructive font-medium">You’re {totalPct - 100}% over budget</span>}
              {underBudget && <span className="text-xs text-muted-foreground font-medium">{100 - totalPct}% unallocated</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {BUCKETS.map(bucket => {
            const val = pct[bucket.key] ?? 0;
            const dollar = yearlyIncome * periodMultiplier * (val / 100);
            const Icon = bucket.icon;
            return (
              <div key={bucket.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-md ${bucket.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${bucket.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{bucket.emoji} {bucket.label}</div>
                      <div className="text-[11px] text-muted-foreground">{bucket.desc}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm">{val}%</div>
                    <div className="text-xs text-muted-foreground">{fmt(dollar)} / {period}</div>
                  </div>
                </div>
                <Slider
                  value={[val]}
                  onValueChange={([v]) => setPct(prev => ({ ...prev, [bucket.key]: v }))}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {BUCKETS.map(bucket => {
          const val = pct[bucket.key] ?? 0;
          const dollarYear = yearlyIncome * (val / 100);
          const dollarPeriod = dollarYear * periodMultiplier;
          const Icon = bucket.icon;
          return (
            <Card key={bucket.key} className="overflow-hidden">
              <div className={`h-1 ${bucket.bg.replace("/10", "")}`} />
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${bucket.color}`} />
                  <span className="text-sm font-medium">{bucket.label}</span>
                </div>
                <div className="text-2xl font-mono font-bold">{fmt(dollarPeriod)}</div>
                <div className="text-xs text-muted-foreground">{fmt(dollarYear)} / year</div>
                <div className="text-xs font-medium">{val}% of income</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Virtual Lockbox / Envelopes */}
      <Card className="mt-4 border-amber-400/40">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" /> Virtual Lockbox
              <Badge variant="secondary" className="ml-1">{fmt(totalLockbox)} total</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={depositPaycheck} disabled={income <= 0 || totalPct === 0}>
                <ArrowDownToLine className="w-4 h-4 mr-1" /> Deposit {fmt(income)} paycheck
              </Button>
              <Button size="sm" variant="outline" onClick={resetEnvelopes}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Each envelope holds real money you've set aside. Hit <b>Deposit paycheck</b> to auto-split your income using the percentages above, or move money in/out of any envelope by hand.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BUCKETS.map(bucket => {
            const bal = envelopes[bucket.key] ?? 0;
            const Icon = bucket.icon;
            const amtStr = manualAmt[bucket.key] ?? "";
            const amt = parseFloat(amtStr) || 0;
            return (
              <div key={bucket.key} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-md ${bucket.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${bucket.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{bucket.emoji} {bucket.label}</div>
                      <div className="text-[11px] text-muted-foreground">{pct[bucket.key] ?? 0}% allocation</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-lg">{fmt(bal)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amtStr}
                    onChange={e => setManualAmt(prev => ({ ...prev, [bucket.key]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2"
                    onClick={() => adjustEnvelope(bucket.key, amt, "Manual deposit")}
                    disabled={amt <= 0}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2"
                    onClick={() => adjustEnvelope(bucket.key, -amt, "Manual withdraw")}
                    disabled={amt <= 0}>
                    <Minus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Lockbox transactions */}
      {txns.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" /> Envelope Activity
              <Badge variant="secondary" className="ml-1">{txns.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {txns.map(t => {
                const b = BUCKETS.find(x => x.key === t.bucket);
                const positive = t.amount >= 0;
                return (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{b?.emoji ?? "•"}</span>
                      <span className="truncate">{b?.label ?? t.bucket}</span>
                      <span className="text-muted-foreground truncate hidden sm:inline">— {t.note}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-mono font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                        {positive ? "+" : ""}{fmt(t.amount)}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(t.ts).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Suggested Add-Ons
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Suggestion
            title="📱 CriderGPT Pro Subscription"
            desc={`At $12/mo, that's just ${((12 / (yearlyIncome / 12)) * 100).toFixed(1)}% of a monthly paycheck. Upgrade when your CriderGPT bucket hits $15/mo.`}
          />
          <Suggestion
            title="🛡️ High-Yield Savings"
            desc="Park your emergency fund in a HYSA (4–5% APY). $1,000 sitting there earns ~$50/yr free."
          />
          <Suggestion
            title="📊 Separate Business Account"
            desc="Open a free business checking. Route all CriderGPT/ad revenue there so taxes are clean."
          />
          <Suggestion
            title="🎯 Weekly Check-In Habit"
            desc="Every Friday, open this calculator, punch in what you made, and move the money immediately."
          />
          <Suggestion
            title="💳 Auto-Transfer Rules"
            desc="Set up bank auto-transfers: 10% to emergency, 20% to CriderGPT the day you get paid."
          />
          <Suggestion
            title="📦 Bulk Buy Savings"
            desc="Use the ‘Fun’ bucket for bulk welding supplies once/quarter instead of weekly runs."
          />
        </CardContent>
      </Card>

      {/* History */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" /> Calculation History
              <Badge variant="secondary" className="ml-1">{history.length}</Badge>
            </CardTitle>
            {history.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearHistory}>
                <Trash2 className="w-4 h-4 mr-1" /> Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Hit <span className="font-medium text-foreground">Save This Calculation</span> to keep a record of every paycheck you split.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map(h => {
                const top = BUCKETS
                  .map(b => ({ label: b.label, emoji: b.emoji, val: h.pct[b.key] ?? 0 }))
                  .sort((a, b) => b.val - a.val)
                  .slice(0, 3);
                return (
                  <div key={h.id} className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold">{fmt(h.income)}</span>
                        <Badge variant="outline" className="capitalize text-[10px]">{h.period}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.ts).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {top.map(t => `${t.emoji} ${t.val}%`).join(" · ")}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => loadEntry(h)}>
                        Load
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeEntry(h.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DevHubPage>
  );
}

function Suggestion({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-muted-foreground leading-relaxed">{desc}</div>
    </div>
  );
}
