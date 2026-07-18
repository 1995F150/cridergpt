import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Egg,
  RefreshCw,
  Thermometer,
  Droplets,
  Calendar,
  TrendingUp,
  AlertCircle,
  Bird,
  DollarSign,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const NR = 'Not recorded';
const NA = 'Not available';
const EM_DASH = '—';

type Summary = {
  active_batches: number | null;
  planned_batches: number | null;
  eggs_in_incubation: number | null;
  chicks_available: number | null;
  next_expected_hatch: string | null;
};

type Batch = {
  id: string;
  batch_code: string;
  status: string;
  breed: string | null;
  eggs_set: number | null;
  eggs_shipped: number | null;
  set_date: string | null;
  expected_hatch_date: string | null;
  lockdown_date: string | null;
  actual_hatch_date: string | null;
};

type LatestCheck = {
  batch_id: string | null;
  incubation_day: number | null;
  checked_at: string | null;
  temperature_f: number | null;
  humidity_percent: number | null;
  observed_humidity_range: string | null;
  water_type: string | null;
  water_reservoir_status: string | null;
  egg_turner_status: string | null;
  candling_status: string | null;
  vent_status: string | null;
  next_action: string | null;
};

type Candling = {
  batch_id: string;
  candling_day: number;
  scheduled_date?: string | null;
  event_date?: string | null;
};

type Financial = {
  batch_id: string | null;
  batch_code: string | null;
  total_expenses: number | null;
  savings: number | null;
  total_revenue: number | null;
  profit: number | null;
  break_even_per_chick: number | null;
};

type Check = {
  batch_id: string;
  checked_at: string;
  incubation_day: number | null;
  temperature_f: number | null;
  humidity_percent: number | null;
};

// Format date-only (YYYY-MM-DD) without TZ shift
function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return NR;
  const dateOnly = iso.slice(0, 10);
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (!y || !m || !d) return NR;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return NR;
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return NR;
  }
}

function orNR(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return NR;
  return String(v);
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status?.toLowerCase() ?? '';
  if (s.includes('incubat') || s === 'active') return 'default';
  if (s.includes('plan')) return 'secondary';
  if (s.includes('fail') || s.includes('cancel')) return 'destructive';
  return 'outline';
}

function daysBetween(from: string | null, to: Date = new Date()): number | null {
  if (!from) return null;
  const [y, m, d] = from.slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const start = new Date(y, m - 1, d);
  const diff = Math.floor((to.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function HatchingDashboardPanel() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [latestChecks, setLatestChecks] = useState<LatestCheck[]>([]);
  const [candling, setCandling] = useState<Candling[]>([]);
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [sumRes, batchRes, latestRes, candRes, finRes, chkRes] = await Promise.all([
        supabase.from('hatch_dashboard_summary').select('*').maybeSingle(),
        supabase
          .from('hatch_batches')
          .select(
            'id,batch_code,status,breed,eggs_set,eggs_shipped,set_date,expected_hatch_date,lockdown_date,actual_hatch_date'
          )
          .order('set_date', { ascending: false, nullsFirst: false })
          .limit(50),
        supabase.from('hatch_latest_checks').select('*').limit(50),
        supabase
          .from('hatch_candling_events')
          .select('batch_id,candling_day,scheduled_date,event_date')
          .order('scheduled_date', { ascending: true, nullsFirst: false })
          .limit(50),
        supabase.from('hatch_batch_financials').select('*').limit(50),
        supabase
          .from('hatch_incubation_checks')
          .select('batch_id,checked_at,incubation_day,temperature_f,humidity_percent')
          .order('checked_at', { ascending: true })
          .limit(200),
      ]);

      if (sumRes.error) throw sumRes.error;
      if (batchRes.error) throw batchRes.error;
      if (latestRes.error) throw latestRes.error;
      if (candRes.error) throw candRes.error;
      if (finRes.error) throw finRes.error;
      if (chkRes.error) throw chkRes.error;

      setSummary(sumRes.data as Summary | null);
      setBatches((batchRes.data ?? []) as Batch[]);
      setLatestChecks((latestRes.data ?? []) as LatestCheck[]);
      setCandling((candRes.data ?? []) as Candling[]);
      setFinancials((finRes.data ?? []) as Financial[]);
      setChecks((chkRes.data ?? []) as Check[]);
    } catch (e: any) {
      console.error('[HatchingDashboard] load error', e);
      setError(e?.message ?? 'Failed to load hatching data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      loadAll();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, loadAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const activeBatch = useMemo(
    () =>
      batches.find((b) => b.batch_code === 'BATCH-001') ??
      batches.find((b) => b.status?.toLowerCase().includes('incubat')) ??
      null,
    [batches]
  );

  const activeLatest = useMemo(
    () => (activeBatch ? latestChecks.find((c) => c.batch_id === activeBatch.id) ?? null : null),
    [activeBatch, latestChecks]
  );

  const activeChecks = useMemo(
    () => (activeBatch ? checks.filter((c) => c.batch_id === activeBatch.id) : []),
    [activeBatch, checks]
  );

  const milestones = useMemo(() => {
    const items: { date: string; label: string; batch: string }[] = [];
    for (const b of batches) {
      if (['failed', 'cancelled', 'complete', 'completed'].includes(b.status?.toLowerCase() ?? '')) continue;
      if (b.expected_hatch_date) items.push({ date: b.expected_hatch_date, label: 'Expected hatch', batch: b.batch_code });
      if (b.lockdown_date) items.push({ date: b.lockdown_date, label: 'Lockdown', batch: b.batch_code });
    }
    for (const c of candling) {
      const d = c.scheduled_date ?? c.event_date;
      const b = batches.find((x) => x.id === c.batch_id);
      if (!b) continue;
      if (['failed', 'cancelled', 'complete', 'completed'].includes(b.status?.toLowerCase() ?? '')) continue;
      if (d) items.push({ date: d, label: `Candling day ${c.candling_day}`, batch: b.batch_code });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [batches, candling]);

  // ===== Render states =====
  if (authLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Egg className="h-5 w-5 text-primary" />
              Chicken Hatching Dashboard
            </CardTitle>
            <CardDescription>Sign in to track incubation, candling, hatch dates, and profitability.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = '/auth')} className="w-full">
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Egg className="h-7 w-7 text-primary" />
            Chicken Hatching Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track incubation, candling, hatch dates, inventory, and profitability.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing || loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Failed to load</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard label="Active Batches" value={summary?.active_batches ?? 0} icon={Activity} />
            <SummaryCard label="Planned Batches" value={summary?.planned_batches ?? 0} icon={Calendar} />
            <SummaryCard label="Eggs Incubating" value={summary?.eggs_in_incubation ?? 0} icon={Egg} />
            <SummaryCard label="Chicks Available" value={summary?.chicks_available ?? 0} icon={Bird} />
            <SummaryCard
              label="Next Expected Hatch"
              value={summary?.next_expected_hatch ? fmtDateOnly(summary.next_expected_hatch) : NR}
              icon={TrendingUp}
              small
            />
          </div>

          {/* Active Incubation Spotlight */}
          <ActiveSpotlight batch={activeBatch} latest={activeLatest} />

          {/* Milestones + Monitoring */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Upcoming Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming milestones scheduled.</p>
                ) : (
                  <ul className="space-y-2">
                    {milestones.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.batch}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {fmtDateOnly(m.date)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-primary" />
                  Monitoring
                </CardTitle>
                <CardDescription>
                  {activeBatch ? `Trends for ${activeBatch.batch_code}` : 'Select an active batch'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MonitorCharts checks={activeChecks} />
              </CardContent>
            </Card>
          </div>

          {/* Batches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batches</CardTitle>
              <CardDescription>All incubation batches</CardDescription>
            </CardHeader>
            <CardContent>
              <BatchesList batches={batches} />
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Financial Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FinancialsTable rows={financials} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============ Sub-components ============

function SummaryCard({
  label,
  value,
  icon: Icon,
  small,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={small ? 'text-sm font-semibold text-foreground' : 'text-2xl font-bold text-foreground'}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ActiveSpotlight({ batch, latest }: { batch: Batch | null; latest: LatestCheck | null }) {
  if (!batch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Incubation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active incubating batch found.</p>
        </CardContent>
      </Card>
    );
  }

  const setDay = daysBetween(batch.set_date);
  const totalDays = 21;
  const progress =
    setDay !== null && setDay >= 0 ? Math.min(100, Math.round((setDay / totalDays) * 100)) : null;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Egg className="h-5 w-5 text-primary" />
              {batch.batch_code}
            </CardTitle>
            <CardDescription>{batch.breed ?? NR}</CardDescription>
          </div>
          <Badge variant={statusVariant(batch.status)}>{batch.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="Eggs Set" value={batch.eggs_set ?? NR} />
          <Info label="Eggs Shipped" value={batch.eggs_shipped ?? NR} />
          <Info label="Set Date" value={fmtDateOnly(batch.set_date)} />
          <Info label="Expected Hatch" value={fmtDateOnly(batch.expected_hatch_date)} />
        </div>

        <div>
          <div className="flex justify-between mb-1 text-xs text-muted-foreground">
            <span>
              Incubation Day {setDay !== null && setDay >= 0 ? setDay : NR} / {totalDays}
            </span>
            <span>{progress !== null ? `${progress}%` : NR}</span>
          </div>
          <Progress value={progress ?? 0} className="h-2" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm pt-2 border-t border-border">
          <Info
            label="Temperature"
            value={latest?.temperature_f != null ? `${latest.temperature_f}°F` : NR}
            icon={Thermometer}
          />
          <Info
            label="Humidity"
            value={latest?.humidity_percent != null ? `${latest.humidity_percent}%` : NR}
            icon={Droplets}
          />
          <Info label="Observed Humidity Range" value={orNR(latest?.observed_humidity_range)} />
          <Info label="Water Type" value={orNR(latest?.water_type)} />
          <Info label="Reservoir" value={orNR(latest?.water_reservoir_status)} />
          <Info label="Egg Turner" value={orNR(latest?.egg_turner_status)} />
          <Info label="Candling" value={orNR(latest?.candling_status)} />
          <Info label="Vent" value={orNR(latest?.vent_status)} />
          <Info label="Next Action" value={orNR(latest?.next_action)} />
        </div>

        {latest?.checked_at && (
          <p className="text-xs text-muted-foreground">Last check: {fmtDateTime(latest.checked_at)}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function MonitorCharts({ checks }: { checks: Check[] }) {
  if (checks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No incubation checks recorded yet. Once you log readings, trends will appear here.
      </p>
    );
  }

  const data = checks.map((c) => ({
    day: c.incubation_day ?? '',
    time: new Date(c.checked_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    temp: c.temperature_f,
    humidity: c.humidity_percent,
  }));

  const single = checks.length === 1;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Temperature (°F)</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: single ? 4 : 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Humidity (%)</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="humidity"
                stroke="hsl(var(--chart-2, var(--primary)))"
                strokeWidth={2}
                dot={{ r: single ? 4 : 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {single && (
        <p className="text-xs text-muted-foreground">
          Only one reading logged so far — add more checks to build a trend.
        </p>
      )}
    </div>
  );
}

function BatchesList({ batches }: { batches: Batch[] }) {
  const visible = batches.filter((b) => !!b.batch_code);
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">No batches yet.</p>;
  }
  return (
    <ScrollArea className="w-full">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-6 gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
          <div>Batch</div>
          <div>Status</div>
          <div>Set</div>
          <div>Expected</div>
          <div className="text-right">Eggs Set</div>
          <div>Progress</div>
        </div>
        {visible.map((b) => {
          const day = daysBetween(b.set_date);
          const progress = day !== null && day >= 0 ? Math.min(100, Math.round((day / 21) * 100)) : null;
          return (
            <div
              key={b.id}
              className="grid grid-cols-6 gap-3 px-3 py-3 text-sm border-b border-border/50 last:border-0 items-center"
            >
              <div className="font-medium text-foreground">{b.batch_code}</div>
              <div>
                <Badge variant={statusVariant(b.status)} className="text-xs">
                  {b.status}
                </Badge>
              </div>
              <div className="text-muted-foreground">{fmtDateOnly(b.set_date)}</div>
              <div className="text-muted-foreground">{fmtDateOnly(b.expected_hatch_date)}</div>
              <div className="text-right">{b.eggs_set ?? NR}</div>
              <div>
                {progress !== null ? (
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{NR}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function FinancialsTable({ rows }: { rows: Financial[] }) {
  const visible = rows.filter((r) => !!r.batch_code);
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">No financial data yet.</p>;
  }
  const fmt = (n: number | null) =>
    n === null || n === undefined ? EM_DASH : `$${Number(n).toFixed(2)}`;
  return (
    <ScrollArea className="w-full">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-6 gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
          <div>Batch</div>
          <div className="text-right">Expenses</div>
          <div className="text-right">Savings</div>
          <div className="text-right">Revenue</div>
          <div className="text-right">Profit</div>
          <div className="text-right">Break-even/chick</div>
        </div>
        {visible.map((r) => (
          <div
            key={r.batch_id ?? r.batch_code!}
            className="grid grid-cols-6 gap-3 px-3 py-3 text-sm border-b border-border/50 last:border-0"
          >
            <div className="font-medium text-foreground">{r.batch_code}</div>
            <div className="text-right">{fmt(r.total_expenses)}</div>
            <div className="text-right">{fmt(r.savings)}</div>
            <div className="text-right">{fmt(r.total_revenue)}</div>
            <div
              className={`text-right font-medium ${
                r.profit !== null && r.profit >= 0 ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {fmt(r.profit)}
            </div>
            <div className="text-right text-muted-foreground">
              {r.break_even_per_chick === null || r.break_even_per_chick === undefined
                ? `${EM_DASH} ${NA}`
                : fmt(r.break_even_per_chick)}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default HatchingDashboardPanel;
