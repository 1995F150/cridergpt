import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  TestTube, 
  Monitor, 
  Smartphone,
  Image,
  MessageSquare,
  CalendarDays,
  Megaphone,
  CheckSquare,
  Wheat
} from 'lucide-react';
import { useBrowserNotifications, getNotificationSettings, type NotificationSettings as NotificationSettingsType } from '@/hooks/useBrowserNotifications';
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
  
  const [settings, setSettings] = useState<NotificationSettingsType>({
    calendarEvents: true,
    systemUpdates: true,
    projectReminders: true,
    generalNotifications: true,
    imageGeneration: true,
    aiResponses: true,
    taskReminders: true,
    chapterUpdates: true,
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = getNotificationSettings();
    setSettings(saved);
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

  const notificationTypes = [
    {
      id: 'imageGeneration',
      label: 'Image Generation',
      description: 'When AI-generated images are ready',
      icon: Image,
      key: 'imageGeneration' as const,
    },
    {
      id: 'aiResponses',
      label: 'AI Responses',
      description: 'When CriderGPT replies while you\'re away',
      icon: MessageSquare,
      key: 'aiResponses' as const,
    },
    {
      id: 'calendarEvents',
      label: 'Calendar Events',
      description: 'Upcoming events and reminders',
      icon: CalendarDays,
      key: 'calendarEvents' as const,
    },
    {
      id: 'taskReminders',
      label: 'Task Reminders',
      description: 'Pending task notifications',
      icon: CheckSquare,
      key: 'taskReminders' as const,
    },
    {
      id: 'chapterUpdates',
      label: 'FFA Chapter Updates',
      description: 'Chapter news and announcements',
      icon: Wheat,
      key: 'chapterUpdates' as const,
    },
    {
      id: 'systemUpdates',
      label: 'System Updates',
      description: 'Important CriderGPT announcements',
      icon: Megaphone,
      key: 'systemUpdates' as const,
    },
    {
      id: 'projectReminders',
      label: 'Project Reminders',
      description: 'Deadlines and task completions',
      icon: CheckSquare,
      key: 'projectReminders' as const,
    },
    {
      id: 'generalNotifications',
      label: 'General Notifications',
      description: 'Other important updates',
      icon: Bell,
      key: 'generalNotifications' as const,
    },
  ];

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
              {notificationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div key={type.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label htmlFor={type.id} className="font-medium">{type.label}</Label>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={type.id}
                      checked={settings[type.key]}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, [type.key]: checked }))
                      }
                    />
                  </div>
                );
              })}
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

// Re-export for backwards compatibility
export { getNotificationSettings };
