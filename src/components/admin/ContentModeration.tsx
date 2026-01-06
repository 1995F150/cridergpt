import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle, XCircle, Clock, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  reporter_id: string | null;
  reported_user_id: string;
  report_type: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export function ContentModeration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId: string, newStatus: 'reviewed' | 'resolved' | 'dismissed') {
    setProcessingId(reportId);
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes[reportId] || null,
        })
        .eq('id', reportId);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: 'update_report_status',
        target_type: 'report',
        target_id: reportId,
        details: { new_status: newStatus, notes: adminNotes[reportId] },
      });

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: newStatus, admin_notes: adminNotes[reportId] || null }
            : r
        )
      );

      toast({
        title: 'Report Updated',
        description: `Report marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update report',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500', icon: <Clock className="h-3 w-3" /> },
      reviewed: { color: 'bg-blue-500/10 text-blue-500', icon: <Flag className="h-3 w-3" /> },
      resolved: { color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" /> },
      dismissed: { color: 'bg-gray-500/10 text-gray-500', icon: <XCircle className="h-3 w-3" /> },
    };
    const c = config[status] || config.pending;
    return (
      <Badge className={`${c.color} gap-1`}>
        {c.icon}
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      spam: 'bg-blue-500/10 text-blue-500',
      harassment: 'bg-red-500/10 text-red-500',
      inappropriate: 'bg-orange-500/10 text-orange-500',
      other: 'bg-gray-500/10 text-gray-500',
    };
    return <Badge className={colors[type] || colors.other}>{type}</Badge>;
  };

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const processedReports = reports.filter((r) => r.status !== 'pending');

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Pending Reports ({pendingReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingReports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending reports to review
            </p>
          ) : (
            pendingReports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      {getTypeBadge(report.report_type)}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reported user: {report.reported_user_id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {report.description && (
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    {report.description}
                  </div>
                )}

                <Textarea
                  placeholder="Admin notes..."
                  value={adminNotes[report.id] || ''}
                  onChange={(e) =>
                    setAdminNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                  }
                  className="text-sm"
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateReportStatus(report.id, 'resolved')}
                    disabled={processingId === report.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReportStatus(report.id, 'reviewed')}
                    disabled={processingId === report.id}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    Mark Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateReportStatus(report.id, 'dismissed')}
                    disabled={processingId === report.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Reports ({processedReports.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {processedReports.slice(0, 10).map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex gap-2 items-center">
                {getTypeBadge(report.report_type)}
                {getStatusBadge(report.status)}
                <span className="text-sm text-muted-foreground">
                  {report.reported_user_id.slice(0, 8)}...
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
