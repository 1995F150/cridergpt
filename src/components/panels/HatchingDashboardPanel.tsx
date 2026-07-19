import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Egg, RefreshCw, Thermometer, Droplets, Bird, ShoppingCart, HeartPulse, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;
const today = () => new Date().toISOString().slice(0, 10);
const localInputNow = () => {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};
const num = (v: string) => (v === "" ? null : Number(v));
const dateOnly = (v?: string | null) => {
  if (!v) return "Not recorded";
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const dateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString("en-US", { timeZone: "America/New_York" }) : "Not recorded";
const weeksOld = (v: string) => Math.max(0, Math.floor((Date.now() - new Date(v + "T12:00:00").getTime()) / 604800000));

type Batch = {
  id: string;
  batch_code: string;
  status: string;
  breed: string | null;
  eggs_set: number | null;
  set_date: string | null;
  expected_hatch_date: string | null;
};
type Check = {
  id?: string;
  batch_id: string;
  checked_at: string;
  incubation_day: number | null;
  temperature_f: number | null;
  humidity_percent: number | null;
  observed_humidity_range?: string | null;
  water_type?: string | null;
  water_reservoir_status?: string | null;
  egg_turner_status?: string | null;
  candling_status?: string | null;
  vent_status?: string | null;
  next_action?: string | null;
  notes?: string | null;
};
type Supply = {
  id: string;
  batch_id: string | null;
  item_name: string;
  category: string;
  quantity: number;
  unit: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  priority: string;
  needed_by: string | null;
  purchased: boolean;
  purchased_at: string | null;
  notes: string | null;
};
type Group = {
  id: string;
  batch_id: string;
  group_name: string | null;
  breed: string | null;
  hatch_date: string;
  initial_count: number;
  current_count: number;
  brooder_location: string | null;
  status: string;
  notes: string | null;
};
type Health = {
  id: string;
  chick_group_id: string;
  batch_id: string;
  log_date: string;
  health_status: string;
  symptoms: string | null;
  treatment: string | null;
  medication: string | null;
  mortality_count: number;
  average_weight_oz: number | null;
  brooder_temperature_f: number | null;
  notes: string | null;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="space-y-1 text-sm">
    <span className="font-medium text-foreground">{label}</span>
    {children}
  </label>
);
const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const areaClass = inputClass + " min-h-20";

export function HatchingDashboardPanel() {
  const { user, loading: authLoading } = useAuth();
  const [owner, setOwner] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [supplyFilter, setSupplyFilter] = useState("all");

  const loadAll = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const access = await db.rpc("is_hatching_owner");
      if (access.error) throw access.error;
      const allowed = access.data === true;
      setOwner(allowed);
      if (!allowed) return;
      const [b, c, s, g, h] = await Promise.all([
        db
          .from("hatch_batches")
          .select("id,batch_code,status,breed,eggs_set,set_date,expected_hatch_date")
          .order("set_date", { ascending: false, nullsFirst: false }),
        db.from("hatch_incubation_checks").select("*").order("checked_at", { ascending: false }).limit(200),
        db
          .from("hatch_supply_items")
          .select("*")
          .order("purchased", { ascending: true })
          .order("needed_by", { ascending: true, nullsFirst: false }),
        db.from("hatch_chick_groups").select("*").order("hatch_date", { ascending: false }),
        db.from("hatch_health_logs").select("*").order("log_date", { ascending: false }).limit(200),
      ]);
      for (const r of [b, c, s, g, h]) if (r.error) throw r.error;
      setBatches(b.data || []);
      setChecks(c.data || []);
      setSupplies(s.data || []);
      setGroups(g.data || []);
      setHealth(h.data || []);
    } catch (e: any) {
      console.error("[HatchingDashboard]", e);
      setError(e?.message || "Failed to load hatching data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setOwner(false);
      return;
    }
    loadAll();
  }, [authLoading, user, loadAll]);

  const refresh = () => {
    setRefreshing(true);
    loadAll();
  };
  const batchName = (id: string | null) => batches.find((b) => b.id === id)?.batch_code || "No batch";
  const groupName = (id: string) => groups.find((g) => g.id === id)?.group_name || "Chick group";
  const active = batches.filter((b) => b.status.toLowerCase().includes("incubat")).length;
  const planned = batches.filter((b) => b.status.toLowerCase().includes("plan")).length;
  const eggs = batches
    .filter((b) => b.status.toLowerCase().includes("incubat"))
    .reduce((n, b) => n + (b.eggs_set || 0), 0);
  const filteredSupplies = supplies.filter(
    (s) => supplyFilter === "all" || (supplyFilter === "needed" ? !s.purchased : s.purchased),
  );
  const estimate = supplies.reduce((n, s) => n + Number(s.estimated_cost || 0), 0);
  const spent = supplies.reduce((n, s) => n + Number(s.actual_cost || 0), 0);

  const insertRow = async (table: string, payload: any, success: string) => {
    const r = await db.from(table).insert({ ...payload, owner_id: user!.id });
    if (r.error) {
      toast.error(r.error.message);
      return false;
    }
    toast.success(success);
    await loadAll();
    return true;
  };

  if (authLoading || (user && owner === null && loading))
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!user)
    return (
      <Centered
        title="Chicken Hatching Dashboard"
        text="Sign in to use this private DevHub tool."
        action={<Button onClick={() => (location.href = "/auth")}>Sign in</Button>}
      />
    );
  if (owner === false)
    return <Centered title="Owner-only DevHub tool" text="This dashboard is available only to the CriderGPT owner." />;
  if (error && batches.length === 0) return <Centered title="Could not load dashboard" text={error} />;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Egg className="h-7 w-7 text-primary" />
            Chicken Hatching Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Private DevHub operations for incubation, supplies, chicks, and health.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={"h-4 w-4 mr-2 " + (refreshing ? "animate-spin" : "")} />
          Refresh
        </Button>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checks">Daily Log</TabsTrigger>
          <TabsTrigger value="supplies">Supplies</TabsTrigger>
          <TabsTrigger value="health">Chicks & Health</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric title="Active batches" value={active} icon={Egg} />
            <Metric title="Planned batches" value={planned} icon={RefreshCw} />
            <Metric title="Eggs incubating" value={eggs} icon={Bird} />
            <Metric title="Chicks tracked" value={groups.reduce((n, g) => n + g.current_count, 0)} icon={HeartPulse} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Batches</CardTitle>
              <CardDescription>BATCH-001 remains active; BATCH-002 remains planned.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {batches.map((b) => (
                <div key={b.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between">
                    <strong>{b.batch_code}</strong>
                    <Badge variant="outline">{b.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{b.breed || "Breed not recorded"}</p>
                  <div className="grid grid-cols-3 text-sm">
                    <span>Eggs: {b.eggs_set ?? "—"}</span>
                    <span>Set: {dateOnly(b.set_date)}</span>
                    <span>Hatch: {dateOnly(b.expected_hatch_date)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2">
                <Thermometer className="h-5 w-5" />
                Recent readings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {checks.slice(0, 8).map((c, i) => (
                <div key={c.id || i} className="grid grid-cols-2 md:grid-cols-5 gap-2 rounded-md border p-3 text-sm">
                  <strong>{batchName(c.batch_id)}</strong>
                  <span>Day {c.incubation_day ?? "—"}</span>
                  <span>{c.temperature_f ?? "—"}°F</span>
                  <span>{c.humidity_percent ?? "—"}%</span>
                  <span className="text-muted-foreground">{dateTime(c.checked_at)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="checks">
          <DailyLog
            batches={batches}
            checks={checks}
            submit={(p: any) => insertRow("hatch_incubation_checks", p, "Incubator reading saved")}
          />
        </TabsContent>
        <TabsContent value="supplies" className="space-y-4">
          <SupplyForm batches={batches} submit={(p: any) => insertRow("hatch_supply_items", p, "Supply item added")} />
          <div className="grid grid-cols-2 gap-3">
            <Metric title="Estimated" value={"$" + estimate.toFixed(2)} icon={ShoppingCart} />
            <Metric title="Purchased" value={"$" + spent.toFixed(2)} icon={ShoppingCart} />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={supplyFilter === "all" ? "default" : "outline"}
              onClick={() => setSupplyFilter("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={supplyFilter === "needed" ? "default" : "outline"}
              onClick={() => setSupplyFilter("needed")}
            >
              Still needed
            </Button>
            <Button
              size="sm"
              variant={supplyFilter === "purchased" ? "default" : "outline"}
              onClick={() => setSupplyFilter("purchased")}
            >
              Purchased
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {filteredSupplies.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <strong>{s.item_name}</strong>
                    <Badge variant={s.purchased ? "secondary" : "outline"}>
                      {s.purchased ? "Purchased" : s.priority}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {s.quantity} {s.unit || ""} · {s.category} · {batchName(s.batch_id)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Needed {dateOnly(s.needed_by)} · Est.{" "}
                    {s.estimated_cost == null ? "—" : "$" + Number(s.estimated_cost).toFixed(2)}
                  </p>
                  {!s.purchased && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const cost = window.prompt("Actual cost (optional)") || "";
                        const r = await db
                          .from("hatch_supply_items")
                          .update({ purchased: true, purchased_at: new Date().toISOString(), actual_cost: num(cost) })
                          .eq("id", s.id);
                        if (r.error) toast.error(r.error.message);
                        else {
                          toast.success("Marked purchased");
                          loadAll();
                        }
                      }}
                    >
                      Mark purchased
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="health" className="space-y-4">
          <ChickForm batches={batches} submit={(p: any) => insertRow("hatch_chick_groups", p, "Chick group added")} />
          <div className="grid md:grid-cols-2 gap-3">
            {groups.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <strong>{g.group_name || batchName(g.batch_id)}</strong>
                    <Badge variant="outline">{g.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {g.breed || "Breed not recorded"} · Hatched {dateOnly(g.hatch_date)}
                  </p>
                  <p className="mt-2 font-medium">
                    {weeksOld(g.hatch_date)} weeks old · {g.current_count}/{g.initial_count} chicks
                  </p>
                  <p className="text-sm">{g.brooder_location || "Brooder location not recorded"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <HealthForm groups={groups} submit={(p: any) => insertRow("hatch_health_logs", p, "Health log saved")} />
          <Card>
            <CardHeader>
              <CardTitle>Recent health timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {health.map((h) => (
                <div key={h.id} className="border-l-2 border-primary pl-3 py-1">
                  <div className="flex justify-between gap-2">
                    <strong>{groupName(h.chick_group_id)}</strong>
                    <span className="text-xs text-muted-foreground">{dateOnly(h.log_date)}</span>
                  </div>
                  <p className="text-sm">
                    <Badge variant="outline">{h.health_status}</Badge> Mortality: {h.mortality_count} · Weight:{" "}
                    {h.average_weight_oz ?? "—"} oz · Brooder: {h.brooder_temperature_f ?? "—"}°F
                  </p>
                  {(h.symptoms || h.treatment || h.medication || h.notes) && (
                    <p className="text-sm text-muted-foreground">
                      {[h.symptoms, h.treatment, h.medication, h.notes].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Centered({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="min-h-[420px] grid place-items-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{text}</CardDescription>
        </CardHeader>
        {action && <CardContent>{action}</CardContent>}
      </Card>
    </div>
  );
}
function Metric({ title, value, icon: Icon }: { title: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{title}</span>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}

function DailyLog({
  batches,
  checks,
  submit,
}: {
  batches: Batch[];
  checks: Check[];
  submit: (p: any) => Promise<boolean>;
}) {
  const [f, setF] = useState<any>({
    batch_id: batches[0]?.id || "",
    checked_at: localInputNow(),
    incubation_day: "",
    temperature_f: "",
    humidity_percent: "",
    observed_humidity_range: "",
    water_type: "",
    water_reservoir_status: "",
    egg_turner_status: "",
    candling_status: "",
    vent_status: "",
    next_action: "",
    notes: "",
  });
  useEffect(() => {
    if (!f.batch_id && batches[0]) setF((x: any) => ({ ...x, batch_id: batches[0].id }));
  }, [batches, f.batch_id]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Log incubator conditions</CardTitle>
          <CardDescription>
            Record daily temperature, humidity, water, turner, candling, and vent status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid sm:grid-cols-2 gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await submit({
                  ...f,
                  checked_at: new Date(f.checked_at).toISOString(),
                  incubation_day: num(f.incubation_day),
                  temperature_f: num(f.temperature_f),
                  humidity_percent: num(f.humidity_percent),
                  recorded_by: null,
                })
              )
                setF({ ...f, checked_at: localInputNow(), temperature_f: "", humidity_percent: "", notes: "" });
            }}
          >
            <Field label="Batch">
              <select className={inputClass} required value={f.batch_id} onChange={set("batch_id")}>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Checked at">
              <input
                className={inputClass}
                type="datetime-local"
                required
                value={f.checked_at}
                onChange={set("checked_at")}
              />
            </Field>
            <Field label="Incubation day">
              <input
                className={inputClass}
                type="number"
                min="0"
                max="40"
                value={f.incubation_day}
                onChange={set("incubation_day")}
              />
            </Field>
            <Field label="Temperature °F">
              <input
                className={inputClass}
                type="number"
                step="0.1"
                value={f.temperature_f}
                onChange={set("temperature_f")}
              />
            </Field>
            <Field label="Humidity %">
              <input
                className={inputClass}
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={f.humidity_percent}
                onChange={set("humidity_percent")}
              />
            </Field>
            <Field label="Observed humidity range">
              <input
                className={inputClass}
                value={f.observed_humidity_range}
                onChange={set("observed_humidity_range")}
              />
            </Field>
            {[
              "water_type",
              "water_reservoir_status",
              "egg_turner_status",
              "candling_status",
              "vent_status",
              "next_action",
            ].map((k) => (
              <Field key={k} label={k.split("_").join(" ")}>
                <input className={inputClass} value={f[k]} onChange={set(k)} />
              </Field>
            ))}
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea className={areaClass} value={f.notes} onChange={set("notes")} />
              </Field>
            </div>
            <Button className="sm:col-span-2" type="submit">
              Save daily reading
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reading history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[650px] overflow-auto">
          {checks.map((c, i) => (
            <div key={c.id || i} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <strong>{batches.find((b) => b.id === c.batch_id)?.batch_code}</strong>
                <span>{dateTime(c.checked_at)}</span>
              </div>
              <p>
                <Thermometer className="inline h-4 w-4" /> {c.temperature_f ?? "—"}°F ·{" "}
                <Droplets className="inline h-4 w-4" /> {c.humidity_percent ?? "—"}% · Day {c.incubation_day ?? "—"}
              </p>
              <p className="text-muted-foreground">
                {[c.egg_turner_status, c.candling_status, c.vent_status, c.next_action, c.notes]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SupplyForm({ batches, submit }: { batches: Batch[]; submit: (p: any) => Promise<boolean> }) {
  const [f, setF] = useState<any>({
    batch_id: "",
    item_name: "",
    category: "feed",
    quantity: "1",
    unit: "",
    estimated_cost: "",
    priority: "normal",
    needed_by: "",
    notes: "",
  });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add supply item</CardTitle>
        <CardDescription>Track feed, brooder, bedding, health, and equipment purchases.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await submit({
                ...f,
                batch_id: f.batch_id || null,
                quantity: Number(f.quantity),
                estimated_cost: num(f.estimated_cost),
                needed_by: f.needed_by || null,
                purchased: false,
              })
            )
              setF({ ...f, item_name: "", notes: "" });
          }}
        >
          <Field label="Item">
            <input className={inputClass} required value={f.item_name} onChange={set("item_name")} />
          </Field>
          <Field label="Batch (optional)">
            <select className={inputClass} value={f.batch_id} onChange={set("batch_id")}>
              <option value="">All chicks</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputClass} value={f.category} onChange={set("category")}>
              {["feed", "brooder", "water", "bedding", "health", "equipment", "other"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputClass} value={f.priority} onChange={set("priority")}>
              {["low", "normal", "high", "urgent"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input
              className={inputClass}
              required
              type="number"
              step="0.01"
              min="0.01"
              value={f.quantity}
              onChange={set("quantity")}
            />
          </Field>
          <Field label="Unit">
            <input className={inputClass} value={f.unit} onChange={set("unit")} />
          </Field>
          <Field label="Estimated cost">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              value={f.estimated_cost}
              onChange={set("estimated_cost")}
            />
          </Field>
          <Field label="Needed by">
            <input className={inputClass} type="date" value={f.needed_by} onChange={set("needed_by")} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Notes">
              <textarea className={areaClass} value={f.notes} onChange={set("notes")} />
            </Field>
          </div>
          <Button className="sm:col-span-2 lg:col-span-4" type="submit">
            Add to shopping list
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChickForm({ batches, submit }: { batches: Batch[]; submit: (p: any) => Promise<boolean> }) {
  const [f, setF] = useState<any>({
    batch_id: batches[0]?.id || "",
    group_name: "",
    breed: "",
    hatch_date: today(),
    initial_count: "1",
    current_count: "1",
    brooder_location: "",
    status: "active",
    notes: "",
  });
  useEffect(() => {
    if (!f.batch_id && batches[0]) setF((x: any) => ({ ...x, batch_id: batches[0].id }));
  }, [batches, f.batch_id]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add hatched chick group</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await submit({ ...f, initial_count: Number(f.initial_count), current_count: Number(f.current_count) });
          }}
        >
          <Field label="Batch">
            <select className={inputClass} required value={f.batch_id} onChange={set("batch_id")}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Group name">
            <input className={inputClass} value={f.group_name} onChange={set("group_name")} />
          </Field>
          <Field label="Breed">
            <input className={inputClass} value={f.breed} onChange={set("breed")} />
          </Field>
          <Field label="Hatch date">
            <input className={inputClass} required type="date" value={f.hatch_date} onChange={set("hatch_date")} />
          </Field>
          <Field label="Initial count">
            <input
              className={inputClass}
              required
              type="number"
              min="0"
              value={f.initial_count}
              onChange={set("initial_count")}
            />
          </Field>
          <Field label="Current count">
            <input
              className={inputClass}
              required
              type="number"
              min="0"
              value={f.current_count}
              onChange={set("current_count")}
            />
          </Field>
          <Field label="Brooder location">
            <input className={inputClass} value={f.brooder_location} onChange={set("brooder_location")} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={f.status} onChange={set("status")}>
              {["active", "sold", "moved", "complete"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Notes">
              <textarea className={areaClass} value={f.notes} onChange={set("notes")} />
            </Field>
          </div>
          <Button className="sm:col-span-2 lg:col-span-4" type="submit">
            Add chick group
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function HealthForm({ groups, submit }: { groups: Group[]; submit: (p: any) => Promise<boolean> }) {
  const [f, setF] = useState<any>({
    chick_group_id: groups[0]?.id || "",
    log_date: today(),
    health_status: "healthy",
    symptoms: "",
    treatment: "",
    medication: "",
    mortality_count: "0",
    average_weight_oz: "",
    brooder_temperature_f: "",
    notes: "",
  });
  useEffect(() => {
    if (!f.chick_group_id && groups[0]) setF((x: any) => ({ ...x, chick_group_id: groups[0].id }));
  }, [groups, f.chick_group_id]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log chick health</CardTitle>
        <CardDescription>Daily wellness, weights, treatments, medication, and mortality.</CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a chick group before creating health logs.</p>
        ) : (
          <form
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const g = groups.find((x) => x.id === f.chick_group_id)!;
              await submit({
                ...f,
                batch_id: g.batch_id,
                mortality_count: Number(f.mortality_count),
                average_weight_oz: num(f.average_weight_oz),
                brooder_temperature_f: num(f.brooder_temperature_f),
              });
            }}
          >
            <Field label="Chick group">
              <select className={inputClass} required value={f.chick_group_id} onChange={set("chick_group_id")}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.group_name || g.breed || "Chicks"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Log date">
              <input className={inputClass} required type="date" value={f.log_date} onChange={set("log_date")} />
            </Field>
            <Field label="Health status">
              <select className={inputClass} value={f.health_status} onChange={set("health_status")}>
                {["healthy", "watch", "sick", "recovering"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Mortality count">
              <input
                className={inputClass}
                type="number"
                min="0"
                value={f.mortality_count}
                onChange={set("mortality_count")}
              />
            </Field>
            <Field label="Average weight (oz)">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                min="0"
                value={f.average_weight_oz}
                onChange={set("average_weight_oz")}
              />
            </Field>
            <Field label="Brooder temp °F">
              <input
                className={inputClass}
                type="number"
                step="0.1"
                value={f.brooder_temperature_f}
                onChange={set("brooder_temperature_f")}
              />
            </Field>
            <Field label="Symptoms">
              <input className={inputClass} value={f.symptoms} onChange={set("symptoms")} />
            </Field>
            <Field label="Treatment">
              <input className={inputClass} value={f.treatment} onChange={set("treatment")} />
            </Field>
            <Field label="Medication">
              <input className={inputClass} value={f.medication} onChange={set("medication")} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Notes">
                <textarea className={areaClass} value={f.notes} onChange={set("notes")} />
              </Field>
            </div>
            <Button className="sm:col-span-2 lg:col-span-4" type="submit">
              Save health log
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default HatchingDashboardPanel;
