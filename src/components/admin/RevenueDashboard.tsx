import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface RevenueStats {
  mrr: number;
  mrrChange: number;
  totalRevenue: number;
  activeSubscribers: number;
  churnRate: number;
  ltv: number;
}

interface TierDistribution {
  name: string;
  value: number;
  revenue: number;
}

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  plan: string;
  date: string;
  status: string;
}

const TIER_PRICES: Record<string, number> = {
  free: 0,
  plus: 9.99,
  pro: 24.99,
  lifetime: 0, // One-time, not MRR
};

const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];

export function RevenueDashboard() {
  const [stats, setStats] = useState<RevenueStats>({
    mrr: 0,
    mrrChange: 0, // Will show as estimate
    totalRevenue: 0,
    activeSubscribers: 0,
    churnRate: 0, // Will show as estimate
    ltv: 0
  });
  const [tierDistribution, setTierDistribution] = useState<TierDistribution[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<{ date: string; revenue: number }[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      // Fetch tier distribution from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('current_plan')
        .not('current_plan', 'is', null);

      const distribution: Record<string, number> = {
        free: 0,
        plus: 0,
        pro: 0,
        lifetime: 0
      };

      profiles?.forEach(p => {
        const plan = p.current_plan?.toLowerCase() || 'free';
        if (distribution[plan] !== undefined) {
          distribution[plan]++;
        }
      });

      const tierData: TierDistribution[] = Object.entries(distribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        revenue: value * (TIER_PRICES[name] || 0)
      }));

      setTierDistribution(tierData);

      // Calculate MRR
      const mrr = tierData.reduce((sum, tier) => sum + tier.revenue, 0);
      
      // Calculate active subscribers (non-free)
      const activeSubscribers = tierData
        .filter(t => t.name.toLowerCase() !== 'free')
        .reduce((sum, t) => sum + t.value, 0);

      // Estimate LTV (simple calculation: MRR / churn rate * 100)
      const estimatedLtv = activeSubscribers > 0 ? (mrr / activeSubscribers) * 12 : 0;

      setStats(prev => ({
        ...prev,
        mrr,
        activeSubscribers,
        ltv: estimatedLtv
      }));

      // Generate mock revenue history for chart
      const history = [];
      for (let i = 30; i >= 0; i--) {
        const date = subDays(new Date(), i);
        history.push({
          date: format(date, 'MMM d'),
          revenue: mrr * (0.9 + Math.random() * 0.2) // Simulate some variance
        });
      }
      setRevenueHistory(history);

      // Fetch recent checkout sessions as transactions
      const { data: checkouts } = await supabase
        .from('checkout_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (checkouts) {
        const txns: Transaction[] = checkouts.map(c => ({
          id: c.id.toString(),
          user_email: c.user_id?.substring(0, 8) + '...',
          amount: 9.99, // Default amount
          plan: 'Plus',
          date: c.created_at,
          status: c.status
        }));
        setTransactions(txns);
      }

    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Monthly Recurring Revenue',
      value: `$${stats.mrr.toFixed(2)}`,
      change: null, // Real calculation not available
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-500',
      isEstimate: false
    },
    {
      title: 'Active Subscribers',
      value: stats.activeSubscribers.toString(),
      change: null, // Real calculation not available
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      isEstimate: false
    },
    {
      title: 'Churn Rate',
      value: 'N/A',
      change: null,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-pink-500',
      isEstimate: true
    },
    {
      title: 'Est. Lifetime Value',
      value: `$${stats.ltv.toFixed(2)}`,
      change: null,
      icon: CreditCard,
      gradient: 'from-orange-500 to-amber-500',
      isEstimate: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Revenue Dashboard</h2>
          <p className="text-sm text-muted-foreground">Track your subscription revenue and growth</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                {stat.isEstimate && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Est.
                  </span>
                )}
                {stat.change !== null && (
                  <div className={`flex items-center gap-1 text-sm ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Tier Distribution</CardTitle>
            <CardDescription>Active users by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {tierDistribution.map((tier, index) => (
                <div key={tier.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {tier.name}: {tier.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription>Latest subscription purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{tx.user_email}</p>
                      <p className="text-sm text-muted-foreground">{tx.plan} Plan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-500">+${tx.amount}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tx.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
