import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, TestTube, Monitor, Smartphone } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    requestPermission,
    sendTestNotification,
    canSendNotifications,
  } = useBrowserNotifications();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    calendarEvents: true,
    systemUpdates: true,
    projectReminders: true,
    generalNotifications: true,
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('notification-settings', JSON.stringify(settings));
  }, [settings]);

  const handleTestNotification = () => {
    if (canSendNotifications) {
      sendTestNotification();
      toast({
        title: "Test Sent",
        description: "Check for the notification on your device",
      });
    } else {
      toast({
        title: "Cannot Send",
        description: "Please enable notifications first",
        variant: "destructive",
      });
    }
  };

  const getPermissionStatus = () => {
    if (!isSupported) return { text: 'Not Supported', variant: 'secondary' as const, icon: BellOff };
    if (permission === 'granted') return { text: 'Enabled', variant: 'default' as const, icon: Bell };
    if (permission === 'denied') return { text: 'Blocked', variant: 'destructive' as const, icon: BellOff };
    return { text: 'Not Requested', variant: 'secondary' as const, icon: Bell };
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Browser Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Receive notifications on your desktop and mobile devices
        </p>
      </div>

      {/* Permission Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-5 w-5" />
              <div>
                <div className="font-medium">Notification Permission</div>
                <div className="text-sm text-muted-foreground">
                  {isSupported ? 'Browser notifications are supported' : 'Not supported on this device'}
                </div>
              </div>
            </div>
            <Badge variant={status.variant}>
              {status.text}
            </Badge>
          </div>

          {isSupported && permission !== 'granted' && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                onClick={requestPermission}
                disabled={permission === 'denied'}
                className="w-full"
              >
                {permission === 'denied' ? 'Check Browser Settings' : 'Enable Notifications'}
              </Button>
              {permission === 'denied' && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click the bell icon in your browser's address bar to re-enable
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Support */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Monitor className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h4 className="font-semibold">Desktop</h4>
            <p className="text-xs text-muted-foreground">
              System tray notifications
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h4 className="font-semibold">Mobile</h4>
            <p className="text-xs text-muted-foreground">
              Push notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notification Type Settings */}
      {canSendNotifications && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-4">Notification Types</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="calendar-events" className="font-medium">Calendar Events</Label>
                  <p className="text-sm text-muted-foreground">Upcoming events and reminders</p>
                </div>
                <Switch
                  id="calendar-events"
                  checked={settings.calendarEvents}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, calendarEvents: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="system-updates" className="font-medium">System Updates</Label>
                  <p className="text-sm text-muted-foreground">Important CriderGPT announcements</p>
                </div>
                <Switch
                  id="system-updates"
                  checked={settings.systemUpdates}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, systemUpdates: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="project-reminders" className="font-medium">Project Reminders</Label>
                  <p className="text-sm text-muted-foreground">Deadlines and task completions</p>
                </div>
                <Switch
                  id="project-reminders"
                  checked={settings.projectReminders}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, projectReminders: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="general-notifications" className="font-medium">General Notifications</Label>
                  <p className="text-sm text-muted-foreground">Other important updates</p>
                </div>
                <Switch
                  id="general-notifications"
                  checked={settings.generalNotifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, generalNotifications: checked }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Notification */}
      {canSendNotifications && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Test Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Send a test notification to verify everything is working
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function getNotificationSettings() {
  const saved = localStorage.getItem('notification-settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }
  
  return {
    calendarEvents: true,
    systemUpdates: true,
    projectReminders: true,
    generalNotifications: true,
  };
}