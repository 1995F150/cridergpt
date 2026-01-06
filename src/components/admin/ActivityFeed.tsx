import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, CreditCard, MessageSquare, Volume2, LogIn, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'signup' | 'subscription' | 'chat' | 'tts' | 'login';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Fetch initial recent activities
    fetchRecentActivities();

    // Set up real-time subscriptions
    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Listen for new user signups (profiles table)
    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          addActivity({
            id: payload.new.id,
            type: 'signup',
            message: `New user signed up: ${payload.new.username || 'Anonymous'}`,
            timestamp: new Date(),
            metadata: payload.new
          });
        }
      )
      .subscribe();
    channels.push(profilesChannel);

    // Listen for subscription changes
    const subscriptionsChannel = supabase
      .channel('admin-subscription-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new.current_plan !== payload.old?.current_plan) {
            addActivity({
              id: `sub-${Date.now()}`,
              type: 'subscription',
              message: `User upgraded to ${payload.new.current_plan || 'free'} plan`,
              timestamp: new Date(),
              metadata: payload.new
            });
          }
        }
      )
      .subscribe();
    channels.push(subscriptionsChannel);

    // Listen for AI chat messages
    const chatChannel = supabase
      .channel('admin-chat-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.new.role === 'user') {
            addActivity({
              id: payload.new.id,
              type: 'chat',
              message: `New AI chat session started`,
              timestamp: new Date(),
              metadata: payload.new
            });
          }
        }
      )
      .subscribe();
    channels.push(chatChannel);

    // Listen for activity logs
    const logsChannel = supabase
      .channel('admin-activity-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          addActivity({
            id: payload.new.id,
            type: 'login',
            message: payload.new.action,
            timestamp: new Date(payload.new.created_at),
            metadata: payload.new
          });
        }
      )
      .subscribe();
    channels.push(logsChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const fetchRecentActivities = async () => {
    try {
      // Fetch recent profiles (signups) - profiles table doesn't have created_at, use id order
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, user_id')
        .order('id', { ascending: false })
        .limit(5);

      // Fetch recent chat messages
      const { data: chats } = await supabase
        .from('chat_messages')
        .select('id, created_at, role')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent activity logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const combined: ActivityItem[] = [];

      profiles?.forEach(p => {
        combined.push({
          id: p.id,
          type: 'signup',
          message: `User signed up: ${p.username || 'Anonymous'}`,
          timestamp: new Date() // No created_at on profiles, use now as approximation
        });
      });

      chats?.forEach(c => {
        combined.push({
          id: c.id,
          type: 'chat',
          message: 'AI chat session',
          timestamp: new Date(c.created_at || Date.now())
        });
      });

      logs?.forEach(l => {
        combined.push({
          id: l.id,
          type: 'login',
          message: l.action,
          timestamp: new Date(l.created_at || Date.now())
        });
      });

      // Sort by timestamp descending and take top 15
      combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(combined.slice(0, 15));
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const addActivity = (activity: ActivityItem) => {
    if (!isLive) return;
    setActivities(prev => [activity, ...prev].slice(0, 20));
  };

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup': return <UserPlus className="h-4 w-4" />;
      case 'subscription': return <CreditCard className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      case 'tts': return <Volume2 className="h-4 w-4" />;
      case 'login': return <LogIn className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'subscription': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'chat': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'tts': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'login': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Real-Time Activity
          </CardTitle>
          <Badge 
            variant={isLive ? "default" : "secondary"} 
            className={`cursor-pointer ${isLive ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? '● LIVE' : 'PAUSED'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Waiting for activity...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={`${activity.id}-${index}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <div className={`p-2 rounded-full ${getTypeColor(activity.type)}`}>
                    {getIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(activity.timestamp, 'MMM d, h:mm:ss a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
