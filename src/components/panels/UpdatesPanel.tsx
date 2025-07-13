import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Activity, Plus, Upload, Key, Mic, Brain, FileText } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface UserUpdate {
  id: string;
  user_id: string;
  update_type: string;
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

const getUpdateIcon = (type: string) => {
  switch (type) {
    case 'api_key_added':
      return <Key className="w-4 h-4" />;
    case 'tts_request':
      return <Mic className="w-4 h-4" />;
    case 'ai_request':
      return <Brain className="w-4 h-4" />;
    case 'file_upload':
      return <Upload className="w-4 h-4" />;
    case 'project_created':
      return <Plus className="w-4 h-4" />;
    case 'feature_unlocked':
      return <Activity className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getUpdateColor = (type: string) => {
  switch (type) {
    case 'api_key_added':
      return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'tts_request':
      return 'bg-purple-500/10 text-purple-700 border-purple-200';
    case 'ai_request':
      return 'bg-green-500/10 text-green-700 border-green-200';
    case 'file_upload':
      return 'bg-orange-500/10 text-orange-700 border-orange-200';
    case 'project_created':
      return 'bg-cyan-500/10 text-cyan-700 border-cyan-200';
    case 'feature_unlocked':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-200';
  }
};

export function UpdatesPanel() {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<UserUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchUpdates();

    // Set up real-time subscription
    const channel = supabase
      .channel('user-updates-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_updates',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Double-check the user_id matches before adding to state
          const newUpdate = payload.new as UserUpdate;
          if (newUpdate.user_id === user.id) {
            setUpdates(prev => [newUpdate, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUpdates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_updates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUpdateType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Activity Updates</h2>
        <p className="text-muted-foreground">
          Track all your recent activities and changes
        </p>
      </div>

      {updates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No updates yet</h3>
            <p className="text-muted-foreground">
              Your activity updates will appear here as you use the system
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity ({updates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-1">
                      {getUpdateIcon(update.update_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{update.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getUpdateColor(update.update_type)}`}
                        >
                          {formatUpdateType(update.update_type)}
                        </Badge>
                      </div>
                      
                      {update.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {update.description}
                        </p>
                      )}
                      
                      {update.metadata && (
                        <div className="text-xs text-muted-foreground mb-2">
                          {Object.entries(update.metadata).map(([key, value]) => (
                            <span key={key} className="inline-block mr-4">
                              <strong>{key}:</strong> {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </span>
                        <span>
                          {format(new Date(update.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}