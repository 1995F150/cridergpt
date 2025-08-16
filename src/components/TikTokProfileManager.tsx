
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function TikTokProfileManager() {
  const [tiktokUsername, setTiktokUsername] = useState("1stgendodge52ldairyfarm");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleUpdateUsername = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      // Update system info with TikTok username
      const { error } = await supabase
        .from('system_info')
        .upsert({
          key: 'tiktok_username',
          value: { username: tiktokUsername }
        });

      if (error) throw error;

      toast({
        title: "TikTok Username Updated",
        description: `Your TikTok username has been set to @${tiktokUsername}`,
      });

      // Trigger notifications to users about following your TikTok
      await triggerTikTokFollowNotifications();

    } catch (error) {
      console.error('Error updating TikTok username:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update TikTok username. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const triggerTikTokFollowNotifications = async () => {
    try {
      // Create notifications for all users to follow TikTok
      const { error } = await supabase.functions.invoke('send-tiktok-follow-notification', {
        body: { username: tiktokUsername }
      });

      if (error) throw error;

      toast({
        title: "Notifications Sent",
        description: "Follow notifications have been sent to all users!",
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>TikTok Profile Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tiktok-username">TikTok Username</Label>
          <Input
            id="tiktok-username"
            value={tiktokUsername}
            onChange={(e) => setTiktokUsername(e.target.value)}
            placeholder="Enter your TikTok username"
          />
        </div>
        
        <Button 
          onClick={handleUpdateUsername}
          disabled={isUpdating || !tiktokUsername.trim()}
          className="w-full"
        >
          {isUpdating ? "Updating..." : "Update & Notify Users"}
        </Button>

        <div className="text-sm text-muted-foreground">
          Current username: @{tiktokUsername}
        </div>
      </CardContent>
    </Card>
  );
}
