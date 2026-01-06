import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, CreditCard, AlertTriangle, Activity, TrendingUp, ArrowRight, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  pendingReports: number;
  totalMessages: number;
  todaySignups: number;
  totalTokensUsed: number;
}

interface AdminDashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export function AdminDashboard({ onNavigateToTab }: AdminDashboardProps) {
  const { user } = useAuth();
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
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    { 
      title: 'Active Subscriptions', 
      value: stats.activeSubscriptions, 
      icon: CreditCard, 
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    { 
      title: 'Pending Reports', 
      value: stats.pendingReports, 
      icon: AlertTriangle, 
      gradient: 'from-yellow-500 to-orange-500',
      bgGradient: 'from-yellow-500/10 to-orange-500/10',
      urgent: stats.pendingReports > 0
    },
    { 
      title: 'Total Messages', 
      value: stats.totalMessages.toLocaleString(), 
      icon: MessageSquare, 
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/10 to-pink-500/10'
    },
    { 
      title: "Today's Signups", 
      value: stats.todaySignups, 
      icon: TrendingUp, 
      gradient: 'from-cyan-500 to-blue-500',
      bgGradient: 'from-cyan-500/10 to-blue-500/10'
    },
    { 
      title: 'Total Tokens Used', 
      value: stats.totalTokensUsed.toLocaleString(), 
      icon: Activity, 
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/10 to-red-500/10'
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Welcome skeleton */}
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
        
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Welcome back, Admin</h2>
              <p className="text-muted-foreground">
                {stats.pendingReports > 0 
                  ? `You have ${stats.pendingReports} pending report${stats.pendingReports > 1 ? 's' : ''} to review.`
                  : 'All systems running smoothly. No pending reports.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className={`relative overflow-hidden transition-all hover:shadow-lg ${stat.urgent ? 'ring-2 ring-yellow-500/50' : ''}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Quick Actions
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2 bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
            onClick={() => {
              // Find the tabs and click the users tab
              const usersTab = document.querySelector('[value="users"]') as HTMLElement;
              usersTab?.click();
            }}
          >
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">View All Users</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2 bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
            onClick={() => {
              const modTab = document.querySelector('[value="moderation"]') as HTMLElement;
              modTab?.click();
            }}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">Review Reports</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2 bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
            onClick={() => {
              const settingsTab = document.querySelector('[value="settings"]') as HTMLElement;
              settingsTab?.click();
            }}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm font-medium">Create Announcement</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2 bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"
            onClick={() => {
              const logsTab = document.querySelector('[value="logs"]') as HTMLElement;
              logsTab?.click();
            }}
          >
            <Activity className="h-5 w-5" />
            <span className="text-sm font-medium">View Logs</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
