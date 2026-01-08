import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { NotificationSettings } from "@/components/NotificationSettings";
import { useUnifiedMemory } from "@/hooks/useUnifiedMemory";
import { Brain, Loader2 } from "lucide-react";

export function AppSettings() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { isMemoryEnabled, setMemoryEnabled, isLoading } = useUnifiedMemory();
  const [memoryOn, setMemoryOn] = useState(true);
  const [loadingMemory, setLoadingMemory] = useState(true);

  useEffect(() => {
    const checkMemory = async () => {
      const enabled = await isMemoryEnabled();
      setMemoryOn(enabled);
      setLoadingMemory(false);
    };
    checkMemory();
  }, []);

  const handleMemoryToggle = async (checked: boolean) => {
    setMemoryOn(checked);
    const success = await setMemoryEnabled(checked);
    if (success) {
      toast({
        title: checked ? "Memory Enabled" : "Memory Disabled",
        description: checked 
          ? "CriderGPT will remember context from past conversations."
          : "CriderGPT will not use past conversation context.",
      });
    } else {
      setMemoryOn(!checked);
      toast({
        title: "Error",
        description: "Failed to update memory settings.",
        variant: "destructive",
      });
    }
  };

  const handleAutoSaveToggle = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Auto-save preferences will be available soon.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the application looks and feels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use dark theme for better viewing in low light.
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Memory
          </CardTitle>
          <CardDescription>
            Control how CriderGPT remembers your conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="memory">Remember Conversations</Label>
              <p className="text-sm text-muted-foreground">
                Allow CriderGPT to learn from and remember past conversations for better context.
              </p>
            </div>
            {loadingMemory || isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Switch
                id="memory"
                checked={memoryOn}
                onCheckedChange={handleMemoryToggle}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Configure browser notifications for desktop and mobile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Configure your application preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save">Auto Save</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save your work as you type.
              </p>
            </div>
            <Switch
              id="auto-save"
              onCheckedChange={handleAutoSaveToggle}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy & Security</CardTitle>
          <CardDescription>
            Manage your privacy and security settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={() => window.open('/user-agreement', '_blank')}>
            View Terms of Service
          </Button>
          <Button variant="outline" onClick={() => window.open('/tts-policy', '_blank')}>
            View Privacy Policy
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
