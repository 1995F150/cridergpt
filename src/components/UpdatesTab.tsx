import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Megaphone, AlertTriangle, Shield, Bug, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface SystemUpdate {
  id: string;
  title: string;
  message: string;
  date: string;
  version?: string;
  type: 'feature' | 'bugfix' | 'security' | 'general';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
}

const getUpdateIcon = (type: string) => {
  switch (type) {
    case 'feature':
      return <Sparkles className="w-4 h-4" />;
    case 'security':
      return <Shield className="w-4 h-4" />;
    case 'bugfix':
      return <Bug className="w-4 h-4" />;
    default:
      return <Megaphone className="w-4 h-4" />;
  }
};

const getUpdateColor = (type: string, priority: string) => {
  if (priority === 'critical') return 'bg-red-500/10 text-red-700 border-red-200';
  if (priority === 'high') return 'bg-orange-500/10 text-orange-700 border-orange-200';
  
  switch (type) {
    case 'feature':
      return 'bg-green-500/10 text-green-700 border-green-200';
    case 'security':
      return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'bugfix':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-500/10 text-red-700 border-red-200';
    case 'high':
      return 'bg-orange-500/10 text-orange-700 border-orange-200';
    case 'normal':
      return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'low':
      return 'bg-gray-500/10 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-200';
  }
};

const UpdatesTab = () => {
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdates();

    // Set up real-time subscription for new system updates
    const channel = supabase
      .channel('system_updates_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'system_updates'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Add new update to the beginning of the list
            setUpdates(prev => [payload.new as SystemUpdate, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing update
            setUpdates(prev => prev.map(update => 
              update.id === payload.new.id ? payload.new as SystemUpdate : update
            ));
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted update
            setUpdates(prev => prev.filter(update => update.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUpdates = async () => {
    try {
      console.log('Fetching system updates...');
      const { data, error } = await (supabase as any)
        .from('system_updates')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('System updates response:', { data, error });
      if (error) throw error;
      setUpdates((data || []) as SystemUpdate[]);
      console.log('System updates set:', data);
    } catch (error) {
      console.error('Error fetching system updates:', error);
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" />
          CriderGPT Updates
        </h2>
        <p className="text-muted-foreground">
          Latest system updates, features, and announcements
        </p>
      </div>

      {updates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No updates yet</h3>
            <p className="text-muted-foreground">
              Check back soon for system updates and announcements!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              System Updates ({updates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                  >
                    <div className="mt-1">
                      {getUpdateIcon(update.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-medium text-sm">{update.title}</h4>
                        {update.version && (
                          <Badge variant="outline" className="text-xs">
                            {update.version}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getUpdateColor(update.type, update.priority)}`}
                        >
                          {update.type.charAt(0).toUpperCase() + update.type.slice(1)}
                        </Badge>
                        {update.priority !== 'normal' && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(update.priority)}`}
                          >
                            {update.priority.charAt(0).toUpperCase() + update.priority.slice(1)} Priority
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {update.message}
                      </p>
                      
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(update.date), 'MMMM d, yyyy')}
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
};

export default UpdatesTab;