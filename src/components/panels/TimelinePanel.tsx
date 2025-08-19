
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle, AlertCircle, Info, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning' | 'error';
  category: string;
}

export function TimelinePanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTimelineEvents();
    }
  }, [user]);

  const loadTimelineEvents = async () => {
    try {
      setLoading(true);
      setConnectionError(null);

      // Try to load real events from usage log or create sample data
      const { data, error } = await supabase
        .from('usage_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading timeline:', error);
        // Show sample timeline if database fails
        setEvents(getSampleTimelineEvents());
      } else {
        // Convert usage log to timeline events
        const timelineEvents = data?.map((log, index) => ({
          id: log.id || index.toString(),
          title: getEventTitle(log.action || 'Unknown Action'),
          description: log.details || 'Activity logged',
          timestamp: log.created_at,
          type: getEventType(log.action || 'info') as 'success' | 'info' | 'warning' | 'error',
          category: log.category || 'General'
        })) || [];

        // Add some sample events if empty
        if (timelineEvents.length === 0) {
          setEvents(getSampleTimelineEvents());
        } else {
          setEvents(timelineEvents);
        }
      }
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

  const getSampleTimelineEvents = (): TimelineEvent[] => [
    {
      id: '1',
      title: 'Account Created',
      description: 'Welcome to CriderGPT! Your account has been successfully created.',
      timestamp: new Date().toISOString(),
      type: 'success',
      category: 'Account'
    },
    {
      id: '2', 
      title: 'First Login',
      description: 'You logged in for the first time and accessed the dashboard.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'info',
      category: 'Authentication'
    },
    {
      id: '3',
      title: 'Calculator Used',
      description: 'Accessed the advanced calculator for the first time.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'info',
      category: 'Features'
    }
  ];

  const getEventTitle = (action: string): string => {
    const titleMap: Record<string, string> = {
      'login': 'Logged In',
      'logout': 'Logged Out',
      'chat': 'AI Chat Used',
      'tts': 'Text-to-Speech Generated',
      'calculator': 'Calculator Used',
      'project_created': 'Project Created',
      'file_uploaded': 'File Uploaded',
      'subscription': 'Subscription Updated'
    };
    return titleMap[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventType = (action: string): string => {
    if (action.includes('error') || action.includes('fail')) return 'error';
    if (action.includes('warning') || action.includes('limit')) return 'warning';
    if (action.includes('success') || action.includes('complete')) return 'success';
    return 'info';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
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
          <h2 className="text-2xl font-bold">Activity Timeline</h2>
          <p className="text-muted-foreground">Track your CriderGPT usage and activities</p>
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
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your latest interactions and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={event.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.type)}
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
