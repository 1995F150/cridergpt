import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Copy, Play, CheckCircle, Clock, AlertCircle, Terminal, RefreshCw } from 'lucide-react';

interface BuildLog {
  id: string;
  build_type: string;
  version_name: string | null;
  version_code: number | null;
  status: string;
  log_output: string | null;
  created_at: string;
  completed_at: string | null;
}

const BUILD_COMMANDS = [
  { label: 'Full Build Pipeline', commands: ['npm run build', 'npx cap sync android', 'npx cap run android'] },
  { label: 'Debug APK', commands: ['cd android && ./gradlew assembleDebug'] },
  { label: 'Release APK', commands: ['cd android && ./gradlew assembleRelease'] },
  { label: 'SHA-1 Fingerprint', commands: ['cd android && ./gradlew signingReport'] },
  { label: 'Quick Rebuild', commands: ['npm run android:build'] },
];

export function AndroidBuildSystem() {
  const [buildLogs, setBuildLogs] = useState<BuildLog[]>([]);
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [buildType, setBuildType] = useState<'debug' | 'release'>('debug');
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBuildLogs();
  }, []);

  const fetchBuildLogs = async () => {
    const { data, error } = await (supabase as any)
      .from('build_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) setBuildLogs(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Command copied to clipboard.' });
  };

  const triggerBuild = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('android-build', {
        body: {
          build_type: buildType,
          version_name: versionName || undefined,
          version_code: versionCode ? parseInt(versionCode) : undefined,
        },
      });

      if (error) throw error;

      toast({ title: 'Build Requested', description: `${buildType} build logged successfully.` });
      fetchBuildLogs();
    } catch (error: any) {
      toast({ title: 'Build Error', description: error.message, variant: 'destructive' });
    } finally {
      setTriggering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" /> Requested</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Android Build System</CardTitle>
              <CardDescription>Manage Capacitor Android builds and deployments</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Build Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5" /> Build Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {BUILD_COMMANDS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{group.label}</p>
              {group.commands.map((cmd) => (
                <div key={cmd} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 font-mono text-sm">
                  <code className="flex-1 text-foreground">{cmd}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(cmd)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trigger Build */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5" /> Trigger Build
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Build Type</Label>
              <div className="flex gap-2">
                <Button variant={buildType === 'debug' ? 'default' : 'outline'} size="sm" onClick={() => setBuildType('debug')}>Debug</Button>
                <Button variant={buildType === 'release' ? 'default' : 'outline'} size="sm" onClick={() => setBuildType('release')}>Release</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Version Name</Label>
              <Input placeholder="e.g. 1.2.0" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Version Code</Label>
              <Input type="number" placeholder="e.g. 12" value={versionCode} onChange={(e) => setVersionCode(e.target.value)} />
            </div>
          </div>
          <Button onClick={triggerBuild} disabled={triggering} className="w-full sm:w-auto">
            {triggering ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {triggering ? 'Logging Build...' : 'Log Build Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Build Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Build History</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchBuildLogs}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {buildLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No builds logged yet.</p>
          ) : (
            <div className="space-y-3">
              {buildLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{log.build_type}</Badge>
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {log.version_name && `v${log.version_name}`}
                      {log.version_code && ` (${log.version_code})`}
                      {' · '}
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
