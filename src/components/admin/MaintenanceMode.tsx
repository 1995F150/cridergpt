import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Shield, Clock, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MaintenanceConfig {
  id?: string;
  enabled: boolean;
  message: string;
  estimatedDuration: string;
  whitelistIps: string[];
  scheduledEnd: string | null;
}

export function MaintenanceMode() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    enabled: false,
    message: 'We are currently performing scheduled maintenance. Please check back soon!',
    estimatedDuration: '1 hour',
    whitelistIps: [],
    scheduledEnd: null
  });
  const [newIp, setNewIp] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_status')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading maintenance config:', error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          enabled: data.maintenance_mode || false,
          message: data.message || 'We are currently performing scheduled maintenance. Please check back soon!',
          estimatedDuration: data.estimated_duration || '1 hour',
          whitelistIps: data.whitelist_ips || [],
          scheduledEnd: data.scheduled_end
        });
      }
    } catch (error) {
      console.error('Error loading maintenance config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_status')
        .update({
          maintenance_mode: config.enabled,
          message: config.message,
          estimated_duration: config.estimatedDuration,
          whitelist_ips: config.whitelistIps,
          scheduled_end: config.scheduledEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      toast.success('Maintenance settings saved');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleMaintenance = () => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    setHasChanges(true);
  };

  const addWhitelistIp = () => {
    if (!newIp.trim()) return;
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIp.trim())) {
      toast.error('Please enter a valid IP address');
      return;
    }

    if (config.whitelistIps.includes(newIp.trim())) {
      toast.error('IP already in whitelist');
      return;
    }

    setConfig(prev => ({
      ...prev,
      whitelistIps: [...prev.whitelistIps, newIp.trim()]
    }));
    setNewIp('');
    setHasChanges(true);
  };

  const removeWhitelistIp = (ip: string) => {
    setConfig(prev => ({
      ...prev,
      whitelistIps: prev.whitelistIps.filter(i => i !== ip)
    }));
    setHasChanges(true);
  };

  const updateField = (field: keyof MaintenanceConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg ${config.enabled ? 'bg-gradient-to-br from-amber-500 to-red-500' : 'bg-gradient-to-br from-green-500 to-emerald-500'} flex items-center justify-center`}>
          {config.enabled ? (
            <AlertTriangle className="h-5 w-5 text-white" />
          ) : (
            <CheckCircle className="h-5 w-5 text-white" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">Maintenance Mode</h2>
          <p className="text-sm text-muted-foreground">Control system availability</p>
        </div>
        <Badge 
          variant={config.enabled ? 'destructive' : 'default'}
          className="ml-auto"
        >
          {config.enabled ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      </div>

      {/* Main Toggle */}
      <Card className={`border-2 ${config.enabled ? 'border-amber-500/50 bg-amber-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {config.enabled ? (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              ) : (
                <Shield className="h-8 w-8 text-green-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {config.enabled ? 'Maintenance Mode is ON' : 'System is Online'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {config.enabled 
                    ? 'Users will see a maintenance message when accessing the app' 
                    : 'All users can access the application normally'}
                </p>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={toggleMaintenance}
              className="scale-125"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Configuration */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Maintenance Message
            </CardTitle>
            <CardDescription>
              Message shown to users during maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Display Message</Label>
              <Textarea
                id="message"
                value={config.message}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="Enter maintenance message..."
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Input
                id="duration"
                value={config.estimatedDuration}
                onChange={(e) => updateField('estimatedDuration', e.target.value)}
                placeholder="e.g., 2 hours, 30 minutes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-end">Scheduled End Time (Optional)</Label>
              <Input
                id="scheduled-end"
                type="datetime-local"
                value={config.scheduledEnd || ''}
                onChange={(e) => updateField('scheduledEnd', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for manual deactivation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* IP Whitelist */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin IP Whitelist
            </CardTitle>
            <CardDescription>
              IPs that can bypass maintenance mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="Enter IP address..."
                onKeyDown={(e) => e.key === 'Enter' && addWhitelistIp()}
              />
              <Button onClick={addWhitelistIp} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {config.whitelistIps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No IPs whitelisted. Add your IP to maintain access during maintenance.
                </p>
              ) : (
                config.whitelistIps.map(ip => (
                  <div 
                    key={ip}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <code className="text-sm">{ip}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWhitelistIp(ip)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Card */}
      {config.enabled && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>This is what users will see</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-lg bg-background border border-border text-center">
              <AlertTriangle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Under Maintenance</h3>
              <p className="text-muted-foreground mb-4">{config.message}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Estimated duration: {config.estimatedDuration}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={loadConfig}
          disabled={!hasChanges}
        >
          Reset Changes
        </Button>
        <Button 
          onClick={saveConfig}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
