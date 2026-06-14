import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

const TEMPLATES = [
  { value: "plan-welcome", label: "Plan Welcome", data: '{"planName":"Plus","userName":"Jessie"}' },
  { value: "iap-receipt", label: "IAP Receipt", data: '{"productName":"CriderGPT Plus","amount":"$9.99","orderId":"TEST-123"}' },
  { value: "inactive-reminder", label: "Inactive Reminder", data: '{"userName":"Jessie"}' },
];

export default function EmailTest() {
  const [templateName, setTemplateName] = useState("plan-welcome");
  const [recipient, setRecipient] = useState("");
  const [templateData, setTemplateData] = useState(TEMPLATES[0].data);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");

  const onTemplateChange = (v: string) => {
    setTemplateName(v);
    const t = TEMPLATES.find((x) => x.value === v);
    if (t) setTemplateData(t.data);
  };

  const send = async () => {
    if (!recipient.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    let parsed: Record<string, unknown> = {};
    try {
      parsed = templateData.trim() ? JSON.parse(templateData) : {};
    } catch {
      toast.error("Template data must be valid JSON");
      return;
    }
    setSending(true);
    setLastResult("");
    try {
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName,
          recipientEmail: recipient.trim(),
          idempotencyKey: `devhub-test-${templateName}-${Date.now()}`,
          templateData: parsed,
        },
      });
      if (error) throw error;
      setLastResult(JSON.stringify(data, null, 2));
      toast.success("Queued for send. Check inbox in a few seconds.");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setLastResult(`ERROR: ${msg}`);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <DevHubPage title="Email Test" subtitle="Send a real no-reply email from notify.cridergpt.com">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send test email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateName} onValueChange={onTemplateChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Recipient email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Template data (JSON)</Label>
            <Textarea
              rows={5}
              value={templateData}
              onChange={(e) => setTemplateData(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={send} disabled={sending} className="w-full">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send test
          </Button>
          {lastResult && (
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto whitespace-pre-wrap break-all">{lastResult}</pre>
          )}
          <p className="text-xs text-muted-foreground">
            Emails are queued in pgmq and sent by process-email-queue every ~5s. From: no-reply@cridergpt.com via notify.cridergpt.com.
          </p>
        </CardContent>
      </Card>
    </DevHubPage>
  );
}
