import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Terminal, 
  Copy, 
  Check, 
  Smartphone, 
  Wrench, 
  GitBranch, 
  Database,
  Shield,
  X,
  Loader2
} from 'lucide-react';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useToast } from '@/components/ui/use-toast';

interface DeveloperCommandPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeveloperCommandPanel: React.FC<DeveloperCommandPanelProps> = ({ isOpen, onClose }) => {
  const { isDeveloper, isLoading, verification, commands, error, verifyDeveloper } = useDeveloperMode();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (command: string, name: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      toast({
        title: "Command Copied",
        description: `"${name}" copied to clipboard`,
      });
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Developer Command Center</CardTitle>
              <CardDescription>
                Secure access for verified developers only
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDeveloper && (
              <Badge variant="default" className="bg-primary text-primary-foreground">
                <Shield className="w-3 h-3 mr-1" />
                Verified Owner
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Verifying developer identity...</span>
            </div>
          ) : !isDeveloper ? (
            <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
              <Shield className="w-16 h-16 text-destructive mb-4" />
              <h3 className="text-xl font-bold mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-4">
                {error || 'Only the verified owner (Jessie Crider) can access developer commands.'}
              </p>
              {verification && (
                <div className="text-sm text-muted-foreground">
                  <p>Founder: {verification.is_founder ? '✓' : '✗'}</p>
                  <p>System Owner: {verification.is_system_owner ? '✓' : '✗'}</p>
                  <p>Admin: {verification.is_admin ? '✓' : '✗'}</p>
                </div>
              )}
              <Button onClick={verifyDeveloper} className="mt-4">
                Retry Verification
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="android" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-4 grid grid-cols-4">
                <TabsTrigger value="android" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Android Build
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Maintenance
                </TabsTrigger>
                <TabsTrigger value="git" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Git
                </TabsTrigger>
                <TabsTrigger value="supabase" className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Supabase
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-4">
                <TabsContent value="android" className="mt-0 space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Step-by-step commands to build the Android version of CriderGPT.
                  </p>
                  {commands?.android_build.map((cmd, index) => (
                    <CommandCard 
                      key={index}
                      step={cmd.step}
                      name={cmd.name}
                      command={cmd.command}
                      onCopy={copyToClipboard}
                      isCopied={copiedCommand === cmd.command}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="maintenance" className="mt-0 space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Useful commands for maintaining and debugging the project.
                  </p>
                  {commands?.maintenance.map((cmd, index) => (
                    <CommandCard 
                      key={index}
                      name={cmd.name}
                      command={cmd.command}
                      onCopy={copyToClipboard}
                      isCopied={copiedCommand === cmd.command}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="git" className="mt-0 space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Git commands for version control.
                  </p>
                  {commands?.git.map((cmd, index) => (
                    <CommandCard 
                      key={index}
                      name={cmd.name}
                      command={cmd.command}
                      onCopy={copyToClipboard}
                      isCopied={copiedCommand === cmd.command}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="supabase" className="mt-0 space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Supabase CLI commands for database and functions.
                  </p>
                  {commands?.supabase.map((cmd, index) => (
                    <CommandCard 
                      key={index}
                      name={cmd.name}
                      command={cmd.command}
                      onCopy={copyToClipboard}
                      isCopied={copiedCommand === cmd.command}
                    />
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </CardContent>

        {isDeveloper && verification && (
          <div className="border-t p-3 text-xs text-muted-foreground text-center">
            Verified: {verification.email} • Role: {verification.role} • 
            Last verified: {verification.verified_at ? new Date(verification.verified_at).toLocaleString() : 'Just now'}
          </div>
        )}
      </Card>
    </div>
  );
};

interface CommandCardProps {
  step?: number;
  name: string;
  command: string;
  onCopy: (command: string, name: string) => void;
  isCopied: boolean;
}

const CommandCard: React.FC<CommandCardProps> = ({ step, name, command, onCopy, isCopied }) => {
  return (
    <div className="bg-muted rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {step && (
            <Badge variant="outline" className="text-xs">
              Step {step}
            </Badge>
          )}
          <span className="font-medium text-sm">{name}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onCopy(command, name)}
          className={`h-8 px-2 ${isCopied ? 'text-primary' : ''}`}
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      <code className="text-xs bg-background p-2 rounded block overflow-x-auto whitespace-pre-wrap break-all font-mono">
        {command}
      </code>
    </div>
  );
};

export default DeveloperCommandPanel;
