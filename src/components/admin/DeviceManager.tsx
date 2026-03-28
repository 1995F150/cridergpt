import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Cpu, Plus, RefreshCw, Wifi, WifiOff, Loader2, Copy,
  CheckCircle2, Trash2, Activity, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  device_token: string;
  status: string;
  last_heartbeat: string | null;
  metadata: any;
  created_at: string;
}

interface DeviceLog {
  id: string;
  device_id: string;
  event_type: string;
  payload: any;
  created_at: string;
}

export function DeviceManager() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<DeviceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('raspberry_pi');
  const [creating, setCreating] = useState(false);
  const [showTokenFor, setShowTokenFor] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => { fetchDevices(); }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('livestock_devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (deviceId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('livestock_device_logs')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setLogs(data || []);
      setSelectedDevice(deviceId);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const generateToken = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'cgpt_dev_';
    for (let i = 0; i < 48; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    return token;
  };

  const createDevice = async () => {
    if (!newName.trim()) { toast.error('Enter a device name'); return; }
    if (!user) return;
    setCreating(true);

    try {
      const plainToken = generateToken();
      // Store a simple hash for lookup — real hashing would be done server-side
      const tokenHash = btoa(plainToken);

      const { data, error } = await (supabase as any)
        .from('livestock_devices')
        .insert({
          owner_id: user.id,
          device_name: newName.trim(),
          device_type: newType,
          device_token: tokenHash,
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedToken(plainToken);
      setShowTokenFor(data.id);
      setNewName('');
      toast.success('Device registered!');
      fetchDevices();
    } catch (err: any) {
      console.error('Error creating device:', err);
      toast.error('Failed to register device');
    } finally {
      setCreating(false);
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      await (supabase as any).from('livestock_devices').delete().eq('id', id);
      toast.success('Device removed');
      fetchDevices();
      if (selectedDevice === id) { setSelectedDevice(null); setLogs([]); }
    } catch (err) {
      toast.error('Failed to delete device');
    }
  };

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      toast.success('Token copied to clipboard');
    }
  };

  const getTimeSince = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Cpu className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Device Manager</h2>
              <p className="text-muted-foreground text-sm">Register and monitor Raspberry Pi scanners & edge devices</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDevices} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Register New Device */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-primary" /> Register Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input placeholder="e.g. Barn Scanner #1" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Device Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="raspberry_pi">Raspberry Pi</SelectItem>
                  <SelectItem value="arduino">Arduino</SelectItem>
                  <SelectItem value="esp32">ESP32</SelectItem>
                  <SelectItem value="custom">Custom Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createDevice} disabled={creating || !newName.trim()} className="w-full gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Register Device
            </Button>

            {generatedToken && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <p className="text-sm font-medium text-primary">🔑 Device API Token (shown once)</p>
                <p className="text-xs text-muted-foreground">Copy this token now. It won't be displayed again.</p>
                <div className="flex gap-2">
                  <Input value={generatedToken} readOnly className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={copyToken}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Registered Devices
              <Badge variant="secondary" className="ml-auto text-xs">{devices.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No devices registered yet.</div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {devices.map(device => (
                    <div key={device.id} className={`rounded-lg border p-3 space-y-2 ${selectedDevice === device.id ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-muted/30'}`}>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm flex-1">{device.device_name}</span>
                        {device.status === 'online' ? (
                          <Badge className="gap-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                            <Wifi className="h-3 w-3" /> Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <WifiOff className="h-3 w-3" /> Offline
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{device.device_type.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>Heartbeat: {getTimeSince(device.last_heartbeat)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => fetchLogs(device.id)}>
                          View Logs
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={() => deleteDevice(device.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Logs */}
      {selectedDevice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Device Logs — {devices.find(d => d.id === selectedDevice)?.device_name}
              <Badge variant="secondary" className="ml-auto text-xs">{logs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No logs yet for this device.</div>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      {log.event_type === 'scan' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                      {log.event_type === 'heartbeat' && <Activity className="h-4 w-4 text-blue-500 shrink-0" />}
                      {log.event_type === 'error' && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{log.event_type}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.payload?.tag_id || log.payload?.message || JSON.stringify(log.payload).slice(0, 60)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
