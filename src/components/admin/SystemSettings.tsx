import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Bell, Plus, Trash2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export function SystemSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // New announcement form
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info',
    is_active: true,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('system_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAnnouncement() {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('system_announcements')
        .insert({
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          type: newAnnouncement.type,
          is_active: newAnnouncement.is_active,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: 'create_announcement',
        target_type: 'announcement',
        target_id: data.id,
        details: { title: newAnnouncement.title },
      });

      setAnnouncements((prev) => [data, ...prev]);
      setNewAnnouncement({ title: '', content: '', type: 'info', is_active: true });
      
      toast({
        title: 'Announcement Created',
        description: 'The announcement has been published',
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }

  async function toggleAnnouncement(id: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('system_announcements')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: isActive } : a))
      );

      toast({
        title: isActive ? 'Announcement Activated' : 'Announcement Deactivated',
      });
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  }

  async function deleteAnnouncement(id: string) {
    try {
      const { error } = await supabase
        .from('system_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action: 'delete_announcement',
        target_type: 'announcement',
        target_id: id,
      });

      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      
      toast({
        title: 'Announcement Deleted',
      });
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-500/10 text-blue-500',
      warning: 'bg-yellow-500/10 text-yellow-500',
      error: 'bg-red-500/10 text-red-500',
      success: 'bg-green-500/10 text-green-500',
    };
    return <Badge className={colors[type] || colors.info}>{type}</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Announcement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Create System Announcement
          </CardTitle>
          <CardDescription>
            Announcements will be visible to all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Announcement title..."
                value={newAnnouncement.title}
                onChange={(e) =>
                  setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newAnnouncement.type}
                onValueChange={(value) =>
                  setNewAnnouncement((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              placeholder="Write your announcement..."
              value={newAnnouncement.content}
              onChange={(e) =>
                setNewAnnouncement((prev) => ({ ...prev, content: e.target.value }))
              }
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={newAnnouncement.is_active}
                onCheckedChange={(checked) =>
                  setNewAnnouncement((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <Label>Publish immediately</Label>
            </div>
            <Button onClick={createAnnouncement} disabled={creating}>
              <Send className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Announcement'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Announcements ({announcements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No announcements yet
            </p>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`border rounded-lg p-4 space-y-2 ${
                  announcement.is_active ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{announcement.title}</h4>
                      {getTypeBadge(announcement.type)}
                      {announcement.is_active ? (
                        <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={announcement.is_active}
                      onCheckedChange={(checked) =>
                        toggleAnnouncement(announcement.id, checked)
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
