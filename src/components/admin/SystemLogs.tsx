import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Search, Shield, UserCog, CreditCard, Flag, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: unknown;
  created_at: string;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('role')) return <Shield className="h-4 w-4 text-purple-500" />;
    if (action.includes('user') || action.includes('ban')) return <UserCog className="h-4 w-4 text-blue-500" />;
    if (action.includes('tier') || action.includes('subscription')) return <CreditCard className="h-4 w-4 text-green-500" />;
    if (action.includes('report')) return <Flag className="h-4 w-4 text-yellow-500" />;
    return <Settings className="h-4 w-4 text-gray-500" />;
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      update_user_role: 'bg-purple-500/10 text-purple-500',
      ban_user: 'bg-red-500/10 text-red-500',
      update_user_status: 'bg-blue-500/10 text-blue-500',
      update_user_tier: 'bg-green-500/10 text-green-500',
      reset_user_usage: 'bg-orange-500/10 text-orange-500',
      update_report_status: 'bg-yellow-500/10 text-yellow-500',
    };
    return (
      <Badge className={colors[action] || 'bg-gray-500/10 text-gray-500'}>
        {action.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type.toLowerCase().includes(search.toLowerCase());
    
    if (actionFilter === 'all') return matchesSearch;
    return matchesSearch && log.action === actionFilter;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Admin Audit Logs ({logs.length} entries)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[600px] border rounded-lg">
          <div className="space-y-2 p-4">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No audit logs found
              </p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(log.action)}
                      <Badge variant="outline">{log.target_type}</Badge>
                    </div>
                    {log.target_id && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        Target: {log.target_id}
                      </p>
                    )}
                    {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Admin: {log.admin_id?.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
