import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChildActivityLog } from '@/hooks/useGuardianData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Upload, 
  LogIn, 
  Sparkles, 
  Layout,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityTimelineProps {
  childId: string;
  limit?: number;
}

export function ActivityTimeline({ childId, limit = 50 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ChildActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('child_activity_logs')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        setActivities(data as ChildActivityLog[]);
      }
      setLoading(false);
    };

    fetchActivities();

    // Real-time subscription
    const channel = supabase
      .channel(`child_activity_${childId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'child_activity_logs',
          filter: `child_id=eq.${childId}`
        },
        (payload) => {
          setActivities(prev => [payload.new as ChildActivityLog, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, limit]);

  const getActivityIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'chat_message': return <MessageSquare className={iconClass} />;
      case 'file_upload': return <Upload className={iconClass} />;
      case 'login': return <LogIn className={iconClass} />;
      case 'ai_interaction': return <Sparkles className={iconClass} />;
      case 'feature_access': return <Layout className={iconClass} />;
      default: return <MessageSquare className={iconClass} />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'chat_message': return 'Chat Message';
      case 'file_upload': return 'File Upload';
      case 'login': return 'Login';
      case 'ai_interaction': return 'AI Interaction';
      case 'feature_access': return 'Feature Access';
      default: return 'Activity';
    }
  };

  const getSafetyBadge = (score: number | null, flags: string[]) => {
    if (score === null) return null;
    
    if (score >= 80) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          Safe
        </Badge>
      );
    }
    
    if (score >= 60) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Review
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Concern ({flags.length})
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity recorded yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              {getActivityIcon(activity.activity_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {getActivityLabel(activity.activity_type)}
                </span>
                {getSafetyBadge(activity.ai_safety_score, activity.ai_flags || [])}
              </div>
              {activity.activity_content && (
                <p className="text-sm text-muted-foreground truncate">
                  {activity.activity_content}
                </p>
              )}
              {activity.ai_flags && activity.ai_flags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {activity.ai_flags.map((flag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {flag}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
