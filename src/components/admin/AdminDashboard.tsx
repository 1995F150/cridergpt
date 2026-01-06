import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, CreditCard, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  pendingReports: number;
  totalMessages: number;
  todaySignups: number;
  totalTokensUsed: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    pendingReports: 0,
    totalMessages: 0,
    todaySignups: 0,
    totalTokensUsed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total users from profiles
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch active subscriptions
        const { count: subCount } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch pending reports
        const { count: reportCount } = await supabase
          .from('user_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch total messages
        const { count: messageCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true });

        // Fetch today's signups
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Fetch total tokens used
        const { data: usageData } = await supabase
          .from('ai_usage')
          .select('tokens_used');
        
        const totalTokens = usageData?.reduce((sum, u) => sum + (u.tokens_used || 0), 0) || 0;

        setStats({
          totalUsers: userCount || 0,
          activeSubscriptions: subCount || 0,
          pendingReports: reportCount || 0,
          totalMessages: messageCount || 0,
          todaySignups: todayCount || 0,
          totalTokensUsed: totalTokens,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'text-green-500' },
    { title: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'text-yellow-500' },
    { title: 'Total Messages', value: stats.totalMessages.toLocaleString(), icon: MessageSquare, color: 'text-purple-500' },
    { title: "Today's Signups", value: stats.todaySignups, icon: TrendingUp, color: 'text-cyan-500' },
    { title: 'Total Tokens Used', value: stats.totalTokensUsed.toLocaleString(), icon: Activity, color: 'text-orange-500' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button className="p-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
            View All Users
          </button>
          <button className="p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-sm font-medium transition-colors">
            Review Reports
          </button>
          <button className="p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 text-sm font-medium transition-colors">
            Create Announcement
          </button>
          <button className="p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 text-sm font-medium transition-colors">
            View Logs
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
