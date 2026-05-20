import { useEffect, useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Plus, Trash2, Download } from "lucide-react";

interface Job { id: string; date: string; hours: number; rate: number; note: string; }
const KEY = "cridergpt-weld-jobs-v1";

export default function WeldJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState(14);
  const [rate, setRate] = useState(25);
  const [note, setNote] = useState("");

  useEffect(() => { try { setJobs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {} }, []);
  const save = (next: Job[]) => { setJobs(next); localStorage.setItem(KEY, JSON.stringify(next)); };

  const add = () => {
    save([{ id: crypto.randomUUID(), date, hours, rate, note }, ...jobs]);
    setNote("");
  };
  const del = (id: string) => save(jobs.filter(j => j.id !== id));

  const total = jobs.reduce((s, j) => s + j.hours * j.rate, 0);
  const totalHours = jobs.reduce((s, j) => s + j.hours, 0);

  const exportCsv = () => {
    const csv = ["date,hours,rate,total,note", ...jobs.map(j => `${j.date},${j.hours},${j.rate},${j.hours * j.rate},"${j.note.replace(/"/g, '""')}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "weld-timesheet.csv"; a.click();
  };

  return (
    <DevHubPage title="Welding Job Tracker" subtitle="Log hours, export weekly timesheet">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" /> Log Hours</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Hours</Label><Input type="number" value={hours} onChange={e => setHours(+e.target.value)} /></div>
              <div><Label>Rate $</Label><Input type="number" value={rate} onChange={e => setRate(+e.target.value)} /></div>
            </div>
            <div><Label>Note</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Job description" /></div>
            <Button onClick={add} className="w-full"><Plus className="w-4 h-4 mr-2" /> Add</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Jobs · {totalHours}h · ${total.toLocaleString()}</CardTitle>
            <Button size="sm" variant="ghost" onClick={exportCsv}><Download className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {jobs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No jobs logged.</p>}
            {jobs.map(j => (
              <div key={j.id} className="flex justify-between items-center border border-border rounded p-2 text-sm">
                <div>
                  <div className="font-mono">{j.date} · {j.hours}h × ${j.rate}</div>
                  {j.note && <div className="text-xs text-muted-foreground">{j.note}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">${(j.hours * j.rate).toLocaleString()}</span>
                  <Button size="sm" variant="ghost" onClick={() => del(j.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
