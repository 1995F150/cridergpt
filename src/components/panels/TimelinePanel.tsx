
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle, AlertCircle, Info, Zap, Megaphone, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'system';
  category: string;
  source: 'user' | 'system';
}

export function TimelinePanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    loadTimelineEvents();
  }, [user]);

  const loadTimelineEvents = async () => {
    try {
      setLoading(true);
      setConnectionError(null);

      // Load user activity and system updates in parallel
      const [userActivityResult, systemUpdatesResult] = await Promise.all([
        loadUserActivity(),
        loadSystemUpdates()
      ]);

      const allEvents = [...userActivityResult, ...systemUpdatesResult];
      
      // Sort by timestamp descending
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setEvents(allEvents);
    } catch (error: any) {
      console.error('Timeline loading error:', error);
      setConnectionError(error.message);
      setEvents(getSampleTimelineEvents());
      
      toast({
        title: "Connection Issue",
        description: "Using offline timeline data. Check your connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivity = async (): Promise<TimelineEvent[]> => {
    if (!user) return [];

    const { data, error } = await (supabase as any)
      .from('usage_log')
      .select('*')
      .eq('user_id', user.id)
      .order('used_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data || []).map((log, index) => ({
      id: log.id || index.toString(),
      title: `Used ${log.tokens_used} tokens`,
      description: 'AI interaction completed',
      timestamp: log.used_at,
      type: 'info' as const,
      category: 'Usage',
      source: 'user' as const
    }));
  };

  const loadSystemUpdates = async (): Promise<TimelineEvent[]> => {
    const { data, error } = await (supabase as any)
      .from('system_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map(update => ({
      id: update.id,
      title: update.title,
      description: update.message,
      timestamp: update.created_at,
      type: getSystemUpdateType(update.type, update.priority),
      category: `${update.type.charAt(0).toUpperCase() + update.type.slice(1)} Update`,
      source: 'system' as const
    }));
  };

  const getSystemUpdateType = (type: string, priority: string): 'success' | 'info' | 'warning' | 'error' | 'system' => {
    if (priority === 'critical') return 'error';
    if (priority === 'high') return 'warning';
    if (type === 'feature') return 'success';
    if (type === 'security') return 'warning';
    return 'system';
  };

  const getSampleTimelineEvents = (): TimelineEvent[] => [
    {
      id: '1',
      title: 'Welcome to CriderGPT',
      description: 'Your account has been created and you have access to all features.',
      timestamp: new Date().toISOString(),
      type: 'success',
      category: 'Account',
      source: 'system'
    },
    {
      id: '2', 
      title: 'System Update v2.1.0',
      description: 'Added Timeline feature and improved connection monitoring.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'system',
      category: 'Feature Update',
      source: 'system'
    },
    {
      id: '3',
      title: 'First Activity',
      description: 'Started exploring CriderGPT features.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'info',
      category: 'Usage',
      source: 'user'
    }
  ];

  const getEventIcon = (type: string, source: string) => {
    if (source === 'system') {
      return <Megaphone className="h-4 w-4 text-purple-500" />;
    }
    
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'system': return <Megaphone className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 animate-spin text-primary" />
          <span>Loading timeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">CriderGPT Timeline</h2>
          <p className="text-muted-foreground">System updates and your activity history</p>
        </div>
      </div>

      {connectionError && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Connection Issue</p>
                <p className="text-sm text-yellow-700">Showing cached timeline data. {connectionError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recent Activity & Updates
          </CardTitle>
          <CardDescription>
            CriderGPT system changes and your personal activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.type, event.source)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {event.category}
                          </Badge>
                          <Badge 
                            variant={event.source === 'system' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {event.source === 'system' ? (
                              <><Megaphone className="h-3 w-3 mr-1" />System</>
                            ) : (
                              <><User className="h-3 w-3 mr-1" />Personal</>
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timeline events yet.</p>
                  <p className="text-sm">Start using CriderGPT to see your activity!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
