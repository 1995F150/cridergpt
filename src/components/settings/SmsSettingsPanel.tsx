import { useState, useEffect } from "react";
import { useSmsSettings } from "@/hooks/useSmsSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

export function SmsSettingsPanel() {
  const { settings, loading, saving, save, sendTest } = useSmsSettings();
  const [phone, setPhone] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (settings) {
      setPhone(settings.phone_number || "");
      setEnabled(settings.notifications_enabled);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!/^\+\d{8,15}$/.test(phone)) {
      toast.error("Use E.164 format, e.g. +15555551234");
      return;
    }
    const { error } = await save({ phone_number: phone, notifications_enabled: enabled });
    if (error) toast.error(error); else toast.success("SMS settings saved");
  };

  const handleTest = async () => {
    setSending(true);
    const { data, error } = await sendTest();
    setSending(false);
    if (error) { toast.error(error); return; }
    const status = (data as any)?.status;
    if (status === "pending_config") {
      toast.warning("Wired up — connect Twilio to actually send.");
    } else {
      toast.success(`Sent! ${(data as any)?.sid ? `SID: ${(data as any).sid}` : ""}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          CriderGPT can text you
        </CardTitle>
        <CardDescription>
          Save your phone number so CriderGPT can send important updates over SMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sms-phone">Phone number (E.164)</Label>
          <Input
            id="sms-phone"
            placeholder="+15555551234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sms-enabled">SMS notifications enabled</Label>
          <Switch id="sms-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" onClick={handleTest} disabled={sending || !settings?.phone_number}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending…" : "Send test SMS"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Twilio connector + a verified FROM number are required to actually send. Until then,
          messages log as <code>pending_config</code>.
        </p>
      </CardContent>
    </Card>
  );
}
