import { useFeatureNotifications } from '@/hooks/useFeatureNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Star, Zap, Upload, MessageSquare, Headphones, Shield } from 'lucide-react';

const featureIcons = {
  basic_chat: MessageSquare,
  limited_tts: Headphones,
  unlimited_tts: Headphones,
  premium_chat: MessageSquare,
  file_upload: Upload,
  advanced_ai: Zap,
  priority_support: Shield
};

const featureLabels = {
  basic_chat: 'Basic Chat',
  limited_tts: 'Limited TTS',
  unlimited_tts: 'Unlimited TTS',
  premium_chat: 'Premium Chat',
  file_upload: 'File Upload',
  advanced_ai: 'Advanced AI',
  priority_support: 'Priority Support'
};

export function FeatureNotifications() {
  const { featureStatus, notifications, hasFeature, isPlan, refreshFeatureStatus } = useFeatureNotifications();

  if (!featureStatus) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-4 text-center">
          <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading feature status...</p>
        </CardContent>
      </Card>
    );
  }

  const planBadgeColor = isPlan('pro') ? 'default' : isPlan('plu') ? 'secondary' : 'outline';
  const planName = isPlan('pro') ? 'Pro' : isPlan('plu') ? 'Plus' : 'Free';

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="space-y-4">
      {/* Current Plan Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="font-medium">Current Plan</span>
            </div>
            <Badge variant={planBadgeColor}>{planName}</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {featureStatus.featuresUnlocked.map(feature => {
              const Icon = featureIcons[feature as keyof typeof featureIcons];
              return (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  {Icon && <Icon className="h-4 w-4 text-green-500" />}
                  <span className="text-muted-foreground">
                    {featureLabels[feature as keyof typeof featureLabels]}
                  </span>
                </div>
              );
            })}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshFeatureStatus}
            className="mt-3 w-full"
          >
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-5 w-5 text-primary" />
              <span className="font-medium">Recent Updates</span>
              <Badge variant="destructive">{unreadNotifications.length}</Badge>
            </div>
            
            <div className="space-y-2">
              {unreadNotifications.slice(0, 3).map(notification => (
                <div key={notification.id} className="text-sm p-2 bg-muted rounded">
                  <div className="font-medium text-primary">
                    {notification.notification_type === 'subscription_updated' && 'Subscription Updated'}
                  </div>
                  <div className="text-muted-foreground">
                    Plan changed to {notification.data?.new_plan || 'unknown'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}