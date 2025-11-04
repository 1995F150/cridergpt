import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, HardDrive, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { useGoogleIntegrations, GoogleService } from '@/hooks/useGoogleIntegrations';

interface GoogleIntegrationsSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleIntegrationsSettings({ open, onOpenChange }: GoogleIntegrationsSettingsProps) {
  const { integrations, loading, toggleIntegration } = useGoogleIntegrations();

  const serviceConfig = {
    gmail: {
      icon: Mail,
      title: 'Gmail',
      description: 'Read and send emails',
      color: 'text-red-500'
    },
    drive: {
      icon: HardDrive,
      title: 'Google Drive',
      description: 'Read and write files',
      color: 'text-blue-500'
    },
    calendar: {
      icon: Calendar,
      title: 'Google Calendar',
      description: 'Read and create events',
      color: 'text-green-500'
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            Google Integrations
          </DialogTitle>
          <DialogDescription>
            Connect your Google services to enable advanced features in CriderGPT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {(Object.keys(serviceConfig) as GoogleService[]).map((service) => {
            const config = serviceConfig[service];
            const integration = integrations[service];
            const Icon = config.icon;

            return (
              <Card key={service}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{config.title}</h4>
                          <Badge 
                            variant={integration.connected ? "default" : "outline"}
                            className="text-xs"
                          >
                            {integration.connected ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {integration.connected ? 'Connected' : 'Not Connected'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                        {integration.connected && integration.last_synced && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last synced: {new Date(integration.last_synced).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={integration.connected}
                      onCheckedChange={(checked) => toggleIntegration(service, checked)}
                      disabled={loading}
                    />
                  </div>

                  {integration.connected && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {integration.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm mb-2">💡 Available Commands</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• <strong>Gmail:</strong> "check my Gmail", "send an email to..."</p>
            <p>• <strong>Drive:</strong> "read from Google Drive", "save this to Drive"</p>
            <p>• <strong>Calendar:</strong> "create event", "check my calendar"</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            🔒 <strong>Privacy:</strong> All actions are logged for transparency. Data is only accessed when integrations are enabled.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
