
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function TikTokFollowNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [tiktokUsername, setTiktokUsername] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkForTikTokNotification();
    }
  }, [user]);

  const checkForTikTokNotification = async () => {
    try {
      // Get TikTok username from system info
      const { data: systemInfo } = await supabase
        .from('system_info')
        .select('value')
        .eq('key', 'tiktok_username')
        .single();

      if (systemInfo?.value?.username) {
        setTiktokUsername(systemInfo.value.username);
        
        // Check if user has already been notified recently
        const { data: notifications } = await supabase
          .from('feature_notifications')
          .select('*')
          .eq('user_id', user?.id)
          .eq('notification_type', 'tiktok_follow')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .order('created_at', { ascending: false })
          .limit(1);

        if (!notifications || notifications.length === 0) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error checking TikTok notification:', error);
    }
  };

  const handleFollowClick = () => {
    // Open TikTok profile
    window.open(`https://www.tiktok.com/@${tiktokUsername}`, '_blank');
    markNotificationAsRead();
  };

  const markNotificationAsRead = async () => {
    try {
      // Mark notification as read
      await supabase
        .from('feature_notifications')
        .insert({
          user_id: user?.id,
          notification_type: 'tiktok_follow',
          data: { username: tiktokUsername, action: 'clicked' },
          read: true
        });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    setIsVisible(false);
  };

  const handleDismiss = async () => {
    try {
      // Mark as dismissed
      await supabase
        .from('feature_notifications')
        .insert({
          user_id: user?.id,
          notification_type: 'tiktok_follow',
          data: { username: tiktokUsername, action: 'dismissed' },
          read: true
        });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
    setIsVisible(false);
  };

  if (!isVisible || !tiktokUsername) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 border border-primary/20 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Follow on TikTok! 🎵</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Hey! Follow @{tiktokUsername} on TikTok for behind-the-scenes content and updates!
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button onClick={handleFollowClick} className="w-full" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" />
          Follow @{tiktokUsername}
        </Button>
      </CardContent>
    </Card>
  );
}
