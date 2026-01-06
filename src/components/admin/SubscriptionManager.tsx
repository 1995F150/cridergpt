import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Search, Crown, Zap, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserSubscription {
  user_id: string;
  username: string | null;
  tier: string | null;
  stripe_subscription_status: string | null;
  current_plan: string | null;
  tokens_used?: number;
  tts_requests?: number;
}

export function SubscriptionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    try {
      // Fetch profiles with subscription info
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, username, tier, stripe_subscription_status, current_plan')
        .order('tier', { ascending: false });

      if (error) throw error;

      // Fetch usage data
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('user_id, tokens_used, tts_requests');

      const usageMap = new Map(usage?.map((u) => [u.user_id, u]) || []);

      const combined = profiles?.map((p) => ({
        ...p,
        tokens_used: usageMap.get(p.user_id)?.tokens_used || 0,
        tts_requests: usageMap.get(p.user_id)?.tts_requests || 0,
      })) || [];

      setSubscriptions(combined);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserTier(userId: string, newTier: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tier: newTier, current_plan: newTier })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: 'update_user_tier',
        target_type: 'user',
        target_id: userId,
        details: { new_tier: newTier },
      });

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.user_id === userId ? { ...s, tier: newTier, current_plan: newTier } : s
        )
      );

      toast({
        title: 'Tier Updated',
        description: `User tier changed to ${newTier}`,
      });
    } catch (error) {
      console.error('Error updating tier:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user tier',
        variant: 'destructive',
      });
    }
  }

  async function resetUserUsage(userId: string) {
    try {
      const { error } = await supabase
        .from('ai_usage')
        .update({ tokens_used: 0, tts_requests: 0 })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: 'reset_user_usage',
        target_type: 'user',
        target_id: userId,
        details: { action: 'reset_tokens_and_tts' },
      });

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.user_id === userId ? { ...s, tokens_used: 0, tts_requests: 0 } : s
        )
      );

      toast({
        title: 'Usage Reset',
        description: 'User tokens and TTS requests have been reset',
      });
    } catch (error) {
      console.error('Error resetting usage:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset user usage',
        variant: 'destructive',
      });
    }
  }

  const getTierIcon = (tier: string | null) => {
    switch (tier) {
      case 'pro':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'plus':
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return <Gift className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTierBadge = (tier: string | null) => {
    const t = tier || 'free';
    const colors: Record<string, string> = {
      pro: 'bg-yellow-500/10 text-yellow-500',
      plus: 'bg-purple-500/10 text-purple-500',
      free: 'bg-gray-500/10 text-gray-500',
    };
    return (
      <Badge className={`${colors[t] || colors.free} gap-1`}>
        {getTierIcon(tier)}
        {t}
      </Badge>
    );
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || 'none';
    const colors: Record<string, string> = {
      active: 'bg-green-500/10 text-green-500',
      trialing: 'bg-blue-500/10 text-blue-500',
      canceled: 'bg-red-500/10 text-red-500',
      none: 'bg-gray-500/10 text-gray-500',
    };
    return <Badge className={colors[s] || colors.none}>{s}</Badge>;
  };

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.username?.toLowerCase().includes(search.toLowerCase()) ||
      sub.user_id.toLowerCase().includes(search.toLowerCase());
    
    if (tierFilter === 'all') return matchesSearch;
    return matchesSearch && (sub.tier || 'free') === tierFilter;
  });

  // Stats
  const tierCounts = subscriptions.reduce(
    (acc, s) => {
      const tier = s.tier || 'free';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{subscriptions.length}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{tierCounts['pro'] || 0}</div>
            <div className="text-sm text-muted-foreground">Pro Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-500">{tierCounts['plus'] || 0}</div>
            <div className="text-sm text-muted-foreground">Plus Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-500">{tierCounts['free'] || 0}</div>
            <div className="text-sm text-muted-foreground">Free Users</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="plus">Plus</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tokens Used</TableHead>
                  <TableHead>TTS Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubs.slice(0, 50).map((sub) => (
                  <TableRow key={sub.user_id}>
                    <TableCell className="font-medium">
                      {sub.username || 'No username'}
                      <div className="text-xs text-muted-foreground truncate max-w-32">
                        {sub.user_id}
                      </div>
                    </TableCell>
                    <TableCell>{getTierBadge(sub.tier)}</TableCell>
                    <TableCell>{getStatusBadge(sub.stripe_subscription_status)}</TableCell>
                    <TableCell>{(sub.tokens_used || 0).toLocaleString()}</TableCell>
                    <TableCell>{sub.tts_requests || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select
                          value={sub.tier || 'free'}
                          onValueChange={(value) => updateUserTier(sub.user_id, value)}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="plus">Plus</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetUserUsage(sub.user_id)}
                        >
                          Reset
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
