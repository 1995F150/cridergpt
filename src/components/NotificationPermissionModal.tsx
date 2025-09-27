import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Smartphone, Monitor, Check, X } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

interface NotificationPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionGranted?: () => void;
}

export function NotificationPermissionModal({
  open,
  onOpenChange,
  onPermissionGranted,
}: NotificationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const { requestPermission, sendTestNotification, isSupported, permission } = useBrowserNotifications();

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        // Send a test notification
        setTimeout(() => {
          sendTestNotification();
        }, 500);
        
        onPermissionGranted?.();
        onOpenChange(false);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              Notifications Not Available
            </DialogTitle>
            <DialogDescription>
              Your browser or device doesn't support notifications. You'll still receive in-app notifications within CriderGPT.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleSkip}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (permission === 'granted') {
    return null; // Don't show if already granted
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Enable Notifications
          </DialogTitle>
          <DialogDescription>
            Get important reminders and updates from CriderGPT, even when you're not actively using the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Monitor className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Desktop</h3>
                <p className="text-sm text-muted-foreground">
                  Notifications appear in your system tray
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Mobile</h3>
                <p className="text-sm text-muted-foreground">
                  Push notifications to your phone
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                You'll receive notifications for:
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Calendar</Badge>
                  <span className="text-sm">Upcoming events and reminders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Updates</Badge>
                  <span className="text-sm">Important CriderGPT announcements</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Tasks</Badge>
                  <span className="text-sm">Project deadlines and completions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {permission === 'denied' && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <X className="h-4 w-4" />
                  <span className="font-semibold">Notifications Blocked</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You've previously blocked notifications. To enable them, click the bell icon in your browser's address bar or check your browser settings.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleSkip}
          >
            Skip for Now
          </Button>
          
          <Button
            onClick={handleRequestPermission}
            disabled={isRequesting || permission === 'denied'}
            className="flex items-center gap-2"
          >
            {isRequesting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Requesting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Enable Notifications
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}