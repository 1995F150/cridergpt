import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDigestPreferences } from "@/hooks/useDigestPreferences";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function NotificationsPanel() {
  const push = usePushNotifications();
  const { prefs, save } = useDigestPreferences();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Push notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!push.supported ? (
            <p className="text-sm text-muted-foreground">Not supported on this device.</p>
          ) : push.permission === "granted" || push.subscribed ? (
            <Button variant="outline" onClick={push.disable}>Disable notifications</Button>
          ) : (
            <Button onClick={push.enable}>Enable notifications</Button>
          )}
          <p className="text-xs text-muted-foreground">
            Streak reminders, FFA event alerts, livestock check-ins.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Weekly digest email</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Send me a weekly recap</Label>
            <Switch checked={prefs.weekly_enabled} onCheckedChange={(v) => save({ ...prefs, weekly_enabled: v })} />
          </div>
          <div>
            <Label className="text-sm">Day of week</Label>
            <div className="flex gap-1 mt-1">
              {DAYS.map((d, i) => (
                <Button key={d} size="sm" variant={prefs.day_of_week === i ? "default" : "outline"}
                  onClick={() => save({ ...prefs, day_of_week: i })}>{d}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
