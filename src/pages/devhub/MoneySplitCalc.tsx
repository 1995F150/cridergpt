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
  History, Trash2, Save, Lock, Plus, Minus, ArrowDownToLine, FileDown, FileSpreadsheet, Banknote,
  UtensilsCrossed, Wrench, BookOpen, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { addPDFHeader, addPDFFooter, addCornerWatermark } from "@/utils/pdfWatermark";

type Period = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

interface HistoryEntry {
  id: string;
  ts: number;
  income: number;
  period: Period;
  pct: Record<string, number>;
  cashBills?: CashBills;
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
const CASH_BILLS_KEY = "money-split-cash-bills";

type BillValue = 20 | 10 | 5 | 1;
type CashBills = Record<BillValue, number>;

const BILL_VALUES: BillValue[] = [20, 10, 5, 1];
const makeEmptyCashBills = (): CashBills => ({ 20: 0, 10: 0, 5: 0, 1: 0 });

interface Bucket {
  key: string;
  label: string;
  emoji: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  desc: string;
  covers: string[];
}

const BUCKETS: Bucket[] = [
  { key: "cridergpt", label: "CriderGPT / Business", emoji: "🚀", icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10", desc: "Reinvest into the app, ads, new builds",
    covers: ["Google Play Console fee ($25 one-time)", "Supabase / backend hosting", "Domain renewal (cridergpt.com)", "Wi-Fi router upgrade for dev box", "Ad spend (TikTok / Snapchat lenses)"] },
  { key: "emergency", label: "Emergency Fund", emoji: "🛡️", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", desc: "3–6 months expenses, do not touch",
    covers: ["Truck breakdown / tire blowout", "Medical / dental surprise", "Lost income week (sick days)", "Livestock vet emergency", "DO NOT spend on wants"] },
  { key: "living", label: "Bills / Living", emoji: "🏠", icon: Home, color: "text-blue-400", bg: "bg-blue-400/10", desc: "Rent, utilities, phone, gas",
    covers: ["Phone bill", "Gas in the truck", "Electric / water share", "Internet", "Household basics (toothpaste, soap)"] },
  { key: "food", label: "Food / Groceries", emoji: "🍽️", icon: UtensilsCrossed, color: "text-orange-400", bg: "bg-orange-400/10", desc: "Weekly groceries, no eating out",
    covers: ["Weekly grocery run", "Lunch meat / eggs / milk staples", "Bulk meat from livestock buddy", "Coffee + drinks", "Eating out ONLY if leftover at week end"] },
  { key: "bathhouse", label: "Bath House Remodel", emoji: "🔧", icon: Wrench, color: "text-cyan-400", bg: "bg-cyan-400/10", desc: "Materials for pump house / bath house rebuild with Dad",
    covers: ["Metal roofing panels + screws", "2x4s / framing lumber", "Wall sheathing + insulation", "Roof leak patch / sealant", "Plumbing fittings for pump house"] },
  { key: "fun", label: "Personal / Fun", emoji: "🎮", icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-400/10", desc: "Gaming, going out, treats for yourself",
    covers: ["Game / DLC purchase", "Snacks / energy drinks", "Movie or hangout night", "New shirt / boots", "Anything you just want"] },
  { key: "savings", label: "Savings / Invest", emoji: "📈", icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-400/10", desc: "Stocks, crypto, long-term wealth",
    covers: ["High-yield savings (4–5% APY)", "Index fund / brokerage deposit", "Long-term truck / land fund", "Money counter machine fund", "Do not touch for 12+ months"] },
  { key: "taxes", label: "Taxes (set-aside)", emoji: "📝", icon: PiggyBank, color: "text-slate-400", bg: "bg-slate-400/10", desc: "Self-employment tax reserve",
    covers: ["Quarterly estimated tax (IRS)", "State income tax", "1099 self-employment 15.3% bite", "CPA filing fee in April", "Never spend, this is the IRS's money"] },
];

const PRESETS = [
  { name: "4-Slot Cash Lockbox", desc: "Jessie's real box: CriderGPT 20% / Emergency 35% / Bills 35% / Fun 10%", values: { cridergpt: 20, emergency: 35, living: 35, fun: 10, food: 0, bathhouse: 0, savings: 0, taxes: 0 } },
  { name: "Friday $500 Plan", desc: "Bills 30 / Food 20 / CriderGPT 15 / Emergency 15 / Bath House 10 / Fun 10", values: { living: 30, food: 20, cridergpt: 15, emergency: 15, bathhouse: 10, fun: 10, savings: 0, taxes: 0 } },
  { name: "50/30/20 Classic", desc: "Living 50% / Fun 30% / Savings 20%", values: { living: 50, fun: 30, savings: 20, cridergpt: 0, emergency: 0, food: 0, bathhouse: 0, taxes: 0 } },
  { name: "Business First", desc: "Aggressive reinvestment mode", values: { cridergpt: 40, emergency: 10, living: 20, food: 10, fun: 10, savings: 5, bathhouse: 0, taxes: 5 } },
  { name: "Bath House Sprint", desc: "Stack remodel cash fast", values: { bathhouse: 35, living: 25, food: 15, emergency: 10, cridergpt: 10, fun: 5, savings: 0, taxes: 0 } },
];

const DEFAULTS: Record<string, number> = {
  cridergpt: 15,
  emergency: 15,
  living: 25,
  food: 15,
  bathhouse: 10,
  fun: 10,
  savings: 5,
  taxes: 5,
};

type RoundMode = "off" | "1" | "5" | "10" | "20";
const ROUND_KEY = "money-split-round-mode";

interface CashPlanRow {
  key: string;
  label: string;
  emoji: string;
  target: number;
  amount: number;
  percent: number;
  bills: CashBills;
  isUnallocated?: boolean;
}

const sanitizeCashBills = (raw: unknown): CashBills => {
  const source = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
  return BILL_VALUES.reduce((acc, value) => {
    const parsed = Number(source[String(value)] ?? source[value]);
    acc[value] = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    return acc;
  }, makeEmptyCashBills());
};

const getCashBillTotal = (bills: CashBills) =>
  BILL_VALUES.reduce((sum, value) => sum + value * (bills[value] ?? 0), 0);

const billSummary = (bills: CashBills) =>
  BILL_VALUES
    .filter(value => (bills[value] ?? 0) > 0)
    .map(value => `$${value}×${bills[value]}`)
    .join("  ") || "—";

const buildCashPlan = (pct: Record<string, number>, cashBills: CashBills): CashPlanRow[] => {
  const totalCash = getCashBillTotal(cashBills);
  if (totalCash <= 0) return [];

  const totalPct = Object.values(pct).reduce((sum, value) => sum + Math.max(0, value || 0), 0);
  const rows: CashPlanRow[] = BUCKETS
    .filter(bucket => (pct[bucket.key] ?? 0) > 0)
    .map(bucket => {
      const percent = totalPct > 100 ? ((pct[bucket.key] ?? 0) / totalPct) * 100 : (pct[bucket.key] ?? 0);
      return {
        key: bucket.key,
        label: bucket.label,
        emoji: bucket.emoji,
        percent,
        target: totalCash * (percent / 100),
        amount: 0,
        bills: makeEmptyCashBills(),
      };
    });

  if (totalPct < 100) {
    rows.push({
      key: "unallocated",
      label: "Not stuffed / keep loose",
      emoji: "💵",
      percent: 100 - totalPct,
      target: totalCash * ((100 - totalPct) / 100),
      amount: 0,
      bills: makeEmptyCashBills(),
      isUnallocated: true,
    });
  }

  if (rows.length === 0) {
    rows.push({
      key: "unallocated",
      label: "Not stuffed / keep loose",
      emoji: "💵",
      percent: 100,
      target: totalCash,
      amount: 0,
      bills: makeEmptyCashBills(),
      isUnallocated: true,
    });
  }

  const looseBills = BILL_VALUES.flatMap(value =>
    Array.from({ length: cashBills[value] ?? 0 }, () => value)
  );

  looseBills.forEach(bill => {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    rows.forEach((row, candidateIndex) => {
      const score = rows.reduce((sum, candidateRow, index) => {
        const nextAmount = candidateRow.amount + (index === candidateIndex ? bill : 0);
        return sum + Math.abs(candidateRow.target - nextAmount);
      }, 0) + (row.isUnallocated ? 0.01 : 0);

      if (score < bestScore) {
        bestScore = score;
        bestIndex = candidateIndex;
      }
    });

    rows[bestIndex].amount += bill;
    rows[bestIndex].bills[bill] = (rows[bestIndex].bills[bill] ?? 0) + 1;
  });

  return rows.filter(row => row.amount > 0 || row.target > 0);
};

export default function MoneySplitCalc() {
  const [income, setIncome] = useState(1000);
  const [period, setPeriod] = useState<Period>("weekly");
  const [pct, setPct] = useState<Record<string, number>>({ ...DEFAULTS });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [envelopes, setEnvelopes] = useState<Record<string, number>>({});
  const [txns, setTxns] = useState<Txn[]>([]);
  const [manualAmt, setManualAmt] = useState<Record<string, string>>({});
  const [cashBills, setCashBills] = useState<CashBills>(() => makeEmptyCashBills());
  const [roundMode, setRoundMode] = useState<RoundMode>("off");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
      const env = localStorage.getItem(ENVELOPE_KEY);
      if (env) setEnvelopes(JSON.parse(env));
      const tx = localStorage.getItem(TXN_KEY);
      if (tx) setTxns(JSON.parse(tx));
      const bills = localStorage.getItem(CASH_BILLS_KEY);
      if (bills) setCashBills(sanitizeCashBills(JSON.parse(bills)));
      const rm = localStorage.getItem(ROUND_KEY);
      if (rm === "1" || rm === "5" || rm === "10" || rm === "20" || rm === "off") setRoundMode(rm);
    } catch (error) {
      console.warn("Could not load money split data", error);
    }
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

  const updateCashBills = (value: BillValue, count: number) => {
    setCashBills(prev => {
      const next = { ...prev, [value]: Math.max(0, Math.floor(count || 0)) };
      localStorage.setItem(CASH_BILLS_KEY, JSON.stringify(next));
      return next;
    });
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

  const depositCashPlan = () => {
    if (cashPlan.length === 0 || totalCash <= 0) return;
    const nextEnv = { ...envelopes };
    let nextTx = [...txns];
    cashPlan.forEach(row => {
      if (row.isUnallocated || row.amount <= 0) return;
      nextEnv[row.key] = (nextEnv[row.key] ?? 0) + row.amount;
      nextTx = logTxn(row.key, row.amount, `Physical cash stuffed: ${billSummary(row.bills)}`, nextTx);
    });
    persistEnvelopes(nextEnv);
    persistTxns(nextTx);
    toast.success(`Deposited ${fmt(totalCash)} physical cash plan`);
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
  const totalCash = useMemo(() => getCashBillTotal(cashBills), [cashBills]);
  const cashPlan = useMemo(() => buildCashPlan(pct, cashBills), [pct, cashBills]);
  const activeLockboxSlots = useMemo(
    () => BUCKETS.filter(bucket => (pct[bucket.key] ?? 0) > 0).length,
    [pct]
  );

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

  const roundStep = roundMode === "off" ? 0 : Number(roundMode);
  const roundCash = (n: number) => roundStep > 0 ? Math.round(n / roundStep) * roundStep : n;
  const updateRoundMode = (mode: RoundMode) => {
    setRoundMode(mode);
    localStorage.setItem(ROUND_KEY, mode);
  };

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
      cashBills: { ...cashBills },
    };
    const next = [entry, ...history].slice(0, 50);
    persistHistory(next);
    toast.success("Saved to history");
  };

  const loadEntry = (e: HistoryEntry) => {
    setIncome(e.income);
    setPeriod(e.period);
    setPct({ ...e.pct });
    if (e.cashBills) setCashBills(sanitizeCashBills(e.cashBills));
    toast.success("Loaded from history");
  };

  const removeEntry = (id: string) => {
    persistHistory(history.filter(h => h.id !== id));
  };

  const clearHistory = () => {
    persistHistory([]);
    toast.success("History cleared");
  };

  const slug = (s: string) =>
    s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();

  const buildFilename = (ext: string, label = "money-split") => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `CriderGPT_${slug(label)}_${stamp}.${ext}`;
  };

  type Snapshot = { income: number; period: Period; pct: Record<string, number>; ts: number; cashBills?: CashBills };

  const currentSnapshot = (): Snapshot => ({ income, period, pct, cashBills, ts: Date.now() });

  const exportPDF = async (snap: Snapshot = currentSnapshot()) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let y = await addPDFHeader(doc);

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Money Split Breakdown", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date(snap.ts).toLocaleString()}`, margin, y);
      y += 6;
      doc.text(`Income: ${fmt(snap.income)} / ${snap.period}`, margin, y);
      y += 6;
      const yearly =
        snap.period === "daily" ? snap.income * 365 :
        snap.period === "weekly" ? snap.income * 52 :
        snap.period === "biweekly" ? snap.income * 26 :
        snap.period === "monthly" ? snap.income * 12 : snap.income;
      doc.text(`Yearly equivalent: ${fmt(yearly)}`, margin, y);
      y += 10;

      const snapshotBills = snap.cashBills ? sanitizeCashBills(snap.cashBills) : makeEmptyCashBills();
      const snapshotCashTotal = getCashBillTotal(snapshotBills);
      const snapshotCashPlan = buildCashPlan(snap.pct, snapshotBills);

      if (snapshotCashTotal > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Physical Cash Lockbox Plan", margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.text(`Bills entered: ${billSummary(snapshotBills)} (${fmt(snapshotCashTotal)} total)`, margin, y);
        y += 7;

        snapshotCashPlan.forEach(row => {
          if (y > 260) { doc.addPage(); y = 25; }
          doc.setTextColor(0, 0, 0);
          doc.text(`${row.emoji} ${row.label}`, margin, y);
          doc.text(fmt(row.amount), margin + 85, y);
          doc.text(billSummary(row.bills), margin + 120, y);
          y += 5;
          doc.setTextColor(120, 120, 120);
          doc.text(`Target: ${fmt(row.target)} (${row.percent.toFixed(0)}%)`, margin + 5, y);
          y += 6;
        });

        y += 4;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Bucket", margin, y);
      doc.text("%", margin + 80, y);
      doc.text("Per period", margin + 105, y);
      doc.text("Per year", margin + 150, y);
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFontSize(10);
      let totalPctSum = 0;
      let totalPeriod = 0;
      let totalYear = 0;
      BUCKETS.forEach(b => {
        const v = snap.pct[b.key] ?? 0;
        const perYear = yearly * (v / 100);
        const perPeriod = snap.income * (v / 100);
        totalPctSum += v;
        totalYear += perYear;
        totalPeriod += perPeriod;
        if (y > 260) { doc.addPage(); y = 25; }
        doc.text(`${b.emoji} ${b.label}`, margin, y);
        doc.text(`${v}%`, margin + 80, y);
        doc.text(fmt(perPeriod), margin + 105, y);
        doc.text(fmt(perYear), margin + 150, y);
        y += 7;
        doc.setTextColor(120, 120, 120);
        const descLines = doc.splitTextToSize(b.desc, pageWidth - margin * 2 - 5);
        doc.text(descLines, margin + 5, y);
        y += descLines.length * 4 + 3;
        doc.setTextColor(0, 0, 0);
      });

      y += 4;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFont(undefined, "bold");
      doc.text("Totals", margin, y);
      doc.text(`${totalPctSum}%`, margin + 80, y);
      doc.text(fmt(totalPeriod), margin + 105, y);
      doc.text(fmt(totalYear), margin + 150, y);
      doc.setFont(undefined, "normal");

      addPDFFooter(doc);
      await addCornerWatermark(doc);
      doc.save(buildFilename("pdf"));
      toast.success("PDF exported");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF");
    }
  };

  const exportCSV = (snap: Snapshot = currentSnapshot()) => {
    const yearly =
      snap.period === "daily" ? snap.income * 365 :
      snap.period === "weekly" ? snap.income * 52 :
      snap.period === "biweekly" ? snap.income * 26 :
      snap.period === "monthly" ? snap.income * 12 : snap.income;
    const rows: string[] = [];
    rows.push(`CriderGPT Money Split`);
    rows.push(`Generated,${new Date(snap.ts).toLocaleString()}`);
    rows.push(`Income,${snap.income},${snap.period}`);
    rows.push(`Yearly Equivalent,${yearly.toFixed(2)}`);
    rows.push("");
    const snapshotBills = snap.cashBills ? sanitizeCashBills(snap.cashBills) : makeEmptyCashBills();
    const snapshotCashTotal = getCashBillTotal(snapshotBills);
    if (snapshotCashTotal > 0) {
      rows.push("Physical Cash Lockbox Plan");
      rows.push(`Bills,"${billSummary(snapshotBills)}",Total,${snapshotCashTotal.toFixed(2)}`);
      rows.push("Slot,Target,Actual,Bills,Percent");
      buildCashPlan(snap.pct, snapshotBills).forEach(row => {
        rows.push(`"${row.label}",${row.target.toFixed(2)},${row.amount.toFixed(2)},"${billSummary(row.bills)}",${row.percent.toFixed(2)}`);
      });
      rows.push("");
    }
    rows.push("Bucket,Percent,Per Period,Per Year,Description");
    BUCKETS.forEach(b => {
      const v = snap.pct[b.key] ?? 0;
      const perPeriod = snap.income * (v / 100);
      const perYear = yearly * (v / 100);
      const desc = `"${b.desc.replace(/"/g, '""')}"`;
      rows.push(`"${b.label}",${v},${perPeriod.toFixed(2)},${perYear.toFixed(2)},${desc}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildFilename("csv");
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <DevHubPage title="Money Split Calculator" subtitle="Divide every dollar: CriderGPT, emergency, food, fun, savings">
      {/* Hero strip */}
      <div className="mb-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-amber-400/10 to-emerald-400/10 p-4 flex items-center gap-3 shadow-lg shadow-primary/5">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-2xl shadow-inner">
          💰
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold tracking-tight">Lockbox total: <span className="font-mono">{fmt(totalLockbox)}</span></div>
          <div className="text-xs text-muted-foreground truncate">
            {roundStep > 0 ? `Rounding every cut to nearest $${roundStep} bill · ` : "Set round mode below to lock to even bills · "}
            {BUCKETS.filter(b => (pct[b.key] ?? 0) > 0).length} active categories
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => exportPDF()} variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-1" /> PDF
              </Button>
              <Button onClick={() => exportCSV()} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-1" /> CSV
              </Button>
            </div>
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

      {/* Physical Cash Planner */}
      <Card className="mt-4 border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Physical Cash Mode
              <Badge variant="secondary" className="ml-1">{fmt(totalCash)} cash</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIncome(totalCash)} disabled={totalCash <= 0}>
                Use cash total
              </Button>
              <Button size="sm" onClick={depositCashPlan} disabled={totalCash <= 0 || cashPlan.length === 0}>
                <ArrowDownToLine className="w-4 h-4 mr-1" /> Stuff lockbox
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enter the bills you actually have. The calculator will round the split to real $20/$10/$5/$1 bills instead of telling you to make impossible cash amounts.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BILL_VALUES.map(value => (
              <div key={value} className="space-y-1">
                <Label className="text-xs">${value} bills</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={cashBills[value]}
                  onChange={e => updateCashBills(value, Number(e.target.value))}
                  className="h-9 font-mono"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground">Bills entered</div>
              <div className="font-mono font-bold text-sm mt-1">{billSummary(cashBills)}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground">Active lockbox slots</div>
              <div className="font-mono font-bold text-sm mt-1">{activeLockboxSlots} / 4</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground">Cash split rule</div>
              <div className="font-medium mt-1">Nearest real bills wins</div>
            </div>
          </div>

          {activeLockboxSlots > 4 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              You have {activeLockboxSlots} categories turned on but only 4 lockbox slots. Set the lowest-priority sliders to 0 or use the 4-Slot Cash Lockbox preset.
            </div>
          )}

          {totalCash > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Real bill stuffing plan</div>
              {cashPlan.map(row => (
                <div key={row.key} className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{row.emoji} {row.label}</div>
                    <div className="text-xs text-muted-foreground">Target {fmt(row.target)} · {row.percent.toFixed(0)}%</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold">{fmt(row.amount)}</div>
                    <div className="text-xs text-muted-foreground">{billSummary(row.bills)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                    <div className="text-xs text-muted-foreground">
                      {fmt(roundCash(dollar))} / {period}
                      {roundStep > 0 && Math.abs(roundCash(dollar) - dollar) > 0.01 && (
                        <span className="ml-1 text-[10px] opacity-70">(raw {fmt(dollar)})</span>
                      )}
                    </div>
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
                <div className="text-2xl font-mono font-bold">{fmt(roundCash(dollarPeriod))}</div>
                <div className="text-xs text-muted-foreground">{fmt(dollarYear)} / year</div>
                <div className="text-xs font-medium">{val}% of income{roundStep > 0 ? ` · rounded $${roundStep}` : ""}</div>
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
                      <Button variant="ghost" size="sm" title="Export PDF"
                        onClick={() => exportPDF({ income: h.income, period: h.period, pct: h.pct, cashBills: h.cashBills, ts: h.ts })}>
                        <FileDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Export CSV"
                        onClick={() => exportCSV({ income: h.income, period: h.period, pct: h.pct, cashBills: h.cashBills, ts: h.ts })}>
                        <FileSpreadsheet className="w-4 h-4" />
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
