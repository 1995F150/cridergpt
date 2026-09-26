import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Server, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDesktopLanBridge } from '@/utils/desktopLan';
import type { DesktopLanProfile, DesktopLanTestResult } from '@/types/desktop';

const DEFAULT_LAN_URL = 'http://10.42.0.1:8000';

export function DesktopLanSettings() {
  const bridge = getDesktopLanBridge();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<DesktopLanProfile | null>(null);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_LAN_URL);
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [fallbackToCloud, setFallbackToCloud] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DesktopLanTestResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bridge) return;
    bridge.getLanProfile().then((nextProfile) => {
      setProfile(nextProfile);
      setBaseUrl(nextProfile.baseUrl || DEFAULT_LAN_URL);
      setEnabled(nextProfile.enabled);
      setFallbackToCloud(nextProfile.fallbackToCloud);
    }).catch(() => setError('Unable to read the desktop LAN configuration.'));
  }, [bridge]);

  if (!bridge) return null;

  const loadProfileIntoForm = (nextProfile: DesktopLanProfile) => {
    setProfile(nextProfile);
    setBaseUrl(nextProfile.baseUrl || DEFAULT_LAN_URL);
    setEnabled(nextProfile.enabled);
    setFallbackToCloud(nextProfile.fallbackToCloud);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setTestResult(null);
    try {
      const nextProfile = await bridge.saveLanProfile({
        baseUrl,
        apiKey: apiKey.trim() || undefined,
        enabled,
        fallbackToCloud,
      });
      loadProfileIntoForm(nextProfile);
      setApiKey('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the LAN configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    try {
      setTestResult(await bridge.testLanConnection());
    } catch (testError) {
      setTestResult(null);
      setError(testError instanceof Error ? testError.message : 'Unable to test the LAN Engine.');
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setError('');
    try {
      const nextProfile = await bridge.clearLanProfile();
      loadProfileIntoForm(nextProfile);
      setApiKey('');
      setTestResult(null);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear the LAN configuration.');
    } finally {
      setSaving(false);
    }
  };

  const statusReady = profile?.enabled && profile.hasApiKey;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {statusReady ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4" />}
          <span className="hidden sm:inline">LAN</span>
          <Badge variant="outline" className="hidden md:inline-flex text-[10px]">
            {statusReady ? 'READY' : 'SETUP'}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Desktop LAN Engine
          </DialogTitle>
          <DialogDescription>
            Chat can go directly to your CriderGPT Engine over Ethernet. Supabase does not need the Engine URL or API key for this path.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>The API key is encrypted by Windows secure storage and used only by the desktop process for LAN requests.</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desktop-lan-url">Engine address</Label>
            <Input
              id="desktop-lan-url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={DEFAULT_LAN_URL}
              autoComplete="url"
            />
            <p className="text-xs text-muted-foreground">Use the Engine base URL, for example http://10.42.0.1:8000.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desktop-lan-key" className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5" /> Engine API key
            </Label>
            <Input
              id="desktop-lan-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={profile?.hasApiKey ? 'Saved in Windows secure storage' : 'Paste the Engine key'}
              autoComplete="off"
            />
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span>
              <span className="block font-medium">Use LAN Engine for chat</span>
              <span className="block text-xs text-muted-foreground">When enabled, normal text chat uses the server directly.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={fallbackToCloud}
              onChange={(event) => setFallbackToCloud(event.target.checked)}
            />
            <span>
              <span className="block font-medium">Allow cloud fallback</span>
              <span className="block text-xs text-muted-foreground">If disabled, LAN failure is shown instead of sending the chat to Supabase.</span>
            </span>
          </label>

          {testResult && (
            <div className={`rounded-md border p-3 text-sm ${testResult.ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-destructive/30 bg-destructive/10'}`}>
              <div className="flex items-center gap-2 font-medium">
                {testResult.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                {testResult.ok ? 'LAN Engine ready' : 'LAN Engine test failed'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Health: {testResult.healthStatus ?? '—'} · Auth: {testResult.authStatus ?? 'not checked'} · {testResult.latencyMs} ms
              </p>
              {testResult.error && <p className="mt-1 text-xs text-destructive">{testResult.error}</p>}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={handleClear} disabled={saving || testing}>
            Clear
          </Button>
          <Button type="button" variant="outline" onClick={handleTest} disabled={saving || testing}>
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test connection
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || testing}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save LAN settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
