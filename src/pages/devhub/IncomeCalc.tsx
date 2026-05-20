import { useMemo, useState } from "react";
import { DevHubPage } from "./_layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function IncomeCalc() {
  const [rate, setRate] = useState(25);
  const [hoursPerDay, setHpd] = useState(14);
  const [daysPerWeek, setDpw] = useState(7);
  const [adRev, setAd] = useState(0);
  const [iapRev, setIap] = useState(0);
  const [stripeRev, setStripe] = useState(0);
  const [taxPct, setTax] = useState(22);

  const calc = useMemo(() => {
    const weekly = rate * hoursPerDay * daysPerWeek;
    const monthly = weekly * 4.333 + adRev + iapRev + stripeRev;
    const yearly = monthly * 12;
    const taxYear = yearly * (taxPct / 100);
    const netYear = yearly - taxYear;
    return { weekly, monthly, yearly, taxYear, netYear };
  }, [rate, hoursPerDay, daysPerWeek, adRev, iapRev, stripeRev, taxPct]);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <DevHubPage title="Income & Business Calculator" subtitle="Welding + apps + ads + IAP, with tax projection">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div><Label>Hourly rate ($)</Label><Input type="number" value={rate} onChange={e => setRate(+e.target.value)} /></div>
            <div><Label>Hours / day</Label><Input type="number" value={hoursPerDay} onChange={e => setHpd(+e.target.value)} /></div>
            <div><Label>Days / week</Label><Input type="number" value={daysPerWeek} onChange={e => setDpw(+e.target.value)} /></div>
            <div><Label>Tax %</Label><Input type="number" value={taxPct} onChange={e => setTax(+e.target.value)} /></div>
            <div><Label>Ad revenue / mo</Label><Input type="number" value={adRev} onChange={e => setAd(+e.target.value)} /></div>
            <div><Label>IAP / mo</Label><Input type="number" value={iapRev} onChange={e => setIap(+e.target.value)} /></div>
            <div className="col-span-2"><Label>Stripe / mo</Label><Input type="number" value={stripeRev} onChange={e => setStripe(+e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Projection</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Weekly (welding only)" value={fmt(calc.weekly)} />
            <Row label="Monthly (all sources)" value={fmt(calc.monthly)} />
            <Row label="Yearly gross" value={fmt(calc.yearly)} highlight />
            <Row label={`Tax (${taxPct}%)`} value={`- ${fmt(calc.taxYear)}`} />
            <Row label="Net take-home / year" value={fmt(calc.netYear)} highlight />
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center p-3 rounded ${highlight ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
      <span className="text-sm">{label}</span>
      <span className={`font-mono font-bold ${highlight ? "text-primary text-lg" : ""}`}>{value}</span>
    </div>
  );
}
