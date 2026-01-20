import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GuardianRelationship, ChildActivityLog } from '@/hooks/useGuardianData';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Activity, 
  Clock, 
  Shield, 
  ShieldOff,
  ChevronRight,
  MessageSquare,
  Upload,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChildActivityCardProps {
  relationship: GuardianRelationship;
  onToggleMonitoring: (id: string, enabled: boolean) => void;
  onViewDetails: (relationship: GuardianRelationship) => void;
}

export function ChildActivityCard({ 
  relationship, 
  onToggleMonitoring, 
  onViewDetails 
}: ChildActivityCardProps) {
  const [recentActivity, setRecentActivity] = useState<ChildActivityLog | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const [avgSafetyScore, setAvgSafetyScore] = useState<number | null>(null);

  useEffect(() => {
    if (!relationship.child_id || relationship.status !== 'accepted') return;

    const fetchActivitySummary = async () => {
      // Get most recent activity
      const { data: recent } = await supabase
        .from('child_activity_logs')
        .select('*')
        .eq('child_id', relationship.child_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recent) {
        setRecentActivity(recent as ChildActivityLog);
      }

      // Get today's activity count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from('child_activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', relationship.child_id)
        .gte('created_at', today.toISOString());

      setActivityCount(count || 0);

      // Get average safety score
      const { data: scores } = await supabase
        .from('child_activity_logs')
        .select('ai_safety_score')
        .eq('child_id', relationship.child_id)
        .not('ai_safety_score', 'is', null)
        .limit(20);

      if (scores && scores.length > 0) {
        const avg = scores.reduce((sum, s) => sum + (s.ai_safety_score || 0), 0) / scores.length;
        setAvgSafetyScore(Math.round(avg));
      }
    };

    fetchActivitySummary();
  }, [relationship.child_id, relationship.status]);

  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'chat_message': return <MessageSquare className="h-3 w-3" />;
      case 'file_upload': return <Upload className="h-3 w-3" />;
      case 'ai_interaction': return <Sparkles className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getSafetyColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isPending = relationship.status === 'pending';
  const isActive = relationship.status === 'accepted' && relationship.monitoring_enabled;

  return (
    <Card className={`transition-all ${isPending ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {relationship.child_email || 'Unknown'}
                </p>
                <Badge 
                  variant={isPending ? 'secondary' : isActive ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {isPending ? 'Pending' : isActive ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {relationship.relationship_label}
              </p>
            </div>
          </div>

          {relationship.status === 'accepted' && (
            <div className="flex items-center gap-2">
              {relationship.monitoring_enabled ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <ShieldOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Switch
                checked={relationship.monitoring_enabled}
                onCheckedChange={(checked) => onToggleMonitoring(relationship.id, checked)}
              />
            </div>
          )}
        </div>

        {relationship.status === 'accepted' && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{activityCount}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {recentActivity 
                    ? formatDistanceToNow(new Date(recentActivity.created_at), { addSuffix: true })
                    : 'No activity'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Last Active</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className={`h-4 w-4 mx-auto mb-1 rounded-full ${getSafetyColor(avgSafetyScore)}`} />
                <p className="text-lg font-semibold">
                  {avgSafetyScore !== null ? `${avgSafetyScore}%` : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">Safety</p>
              </div>
            </div>

            {recentActivity && (
              <div className="mt-3 p-2 rounded-lg bg-muted/30 flex items-center gap-2 text-sm">
                {getActivityIcon(recentActivity.activity_type)}
                <span className="text-muted-foreground truncate flex-1">
                  {recentActivity.activity_content?.slice(0, 50) || 'Activity logged'}
                </span>
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full mt-3"
              onClick={() => onViewDetails(relationship)}
            >
              View Full Activity
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        )}

        {isPending && (
          <p className="mt-3 text-sm text-muted-foreground text-center">
            Waiting for child to accept invite
          </p>
        )}
      </CardContent>
    </Card>
  );
}
