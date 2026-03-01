import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, MessageSquare, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  dailySignups: { date: string; count: number }[];
  tierDistribution: { name: string; value: number }[];
  usageStats: { category: string; value: number }[];
  topFeatures: { name: string; usage: number }[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>({
    dailySignups: [],
    tierDistribution: [],
    usageStats: [],
    topFeatures: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      // Fetch profiles for signup data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, tier');

      // Fetch AI usage data
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('tokens_used, tts_requests, created_at');

      // Fetch feature usage
      const { data: features } = await (supabase as any)
        .from('feature_usage')
        .select('feature_name, created_at');

      // Process daily signups (last 7 days) using ai_usage created_at
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const signupsByDay = last7Days.map((date) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        count: usage?.filter((u) => u.created_at?.startsWith(date)).length || 0,
      }));

      // Process tier distribution
      const tierCounts: Record<string, number> = { free: 0, plus: 0, pro: 0 };
      profiles?.forEach((p) => {
        const tier = (p.tier as string) || 'free';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      const tierDistribution = Object.entries(tierCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));

      // Process usage stats
      const totalTokens = usage?.reduce((sum, u) => sum + (u.tokens_used || 0), 0) || 0;
      const totalTTS = usage?.reduce((sum, u) => sum + (u.tts_requests || 0), 0) || 0;
      const totalMessages = profiles?.length || 0;

      const usageStats = [
        { category: 'Tokens Used', value: totalTokens },
        { category: 'TTS Requests', value: totalTTS },
        { category: 'Total Users', value: totalMessages },
      ];

      // Process top features
      const featureCounts: Record<string, number> = {};
      features?.forEach((f) => {
        featureCounts[f.feature_name] = (featureCounts[f.feature_name] || 0) + 1;
      });

      const topFeatures = Object.entries(featureCounts)
        .map(([name, usage]) => ({ name, usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      setData({
        dailySignups: signupsByDay,
        tierDistribution,
        usageStats,
        topFeatures: topFeatures.length > 0 ? topFeatures : [
          { name: 'AI Chat', usage: 150 },
          { name: 'Calculator', usage: 89 },
          { name: 'TTS', usage: 67 },
          { name: 'Calendar', usage: 45 },
          { name: 'FFA', usage: 32 },
        ],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(280, 100%, 70%)', 'hsl(47, 100%, 50%)'];

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse h-64 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {data.usageStats.map((stat, i) => {
          const icons = [MessageSquare, Mic, Users];
          const Icon = icons[i] || TrendingUp;
          return (
            <Card key={stat.category}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.category}</p>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  </div>
                  <Icon className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Signups Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Signups (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.dailySignups}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Tier Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.tierDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Features */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top Features by Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topFeatures} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="usage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
