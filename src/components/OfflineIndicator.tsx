import React from 'react';
import { useOffline, FeatureOfflineStatus } from '@/contexts/OfflineContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  WifiOff, 
  Wifi, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Compact offline indicator for header
export function OfflineStatusBadge() {
  const { isOnline, pendingSyncCount } = useOffline();

  if (isOnline && pendingSyncCount === 0) {
    return null; // Don't show when online with no pending syncs
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={isOnline ? "secondary" : "destructive"}
          className={cn(
            "flex items-center gap-1.5 cursor-default",
            !isOnline && "animate-pulse"
          )}
        >
          {isOnline ? (
            <>
              <Cloud className="h-3 w-3" />
              <span className="text-xs">Syncing {pendingSyncCount}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span className="text-xs">Offline</span>
            </>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {isOnline 
          ? `${pendingSyncCount} items pending sync` 
          : 'No internet connection. Some features are limited.'
        }
      </TooltipContent>
    </Tooltip>
  );
}

// Full banner for offline mode
export function OfflineBanner() {
  const { isOnline, pendingSyncCount, lastOnlineTime } = useOffline();

  if (isOnline) return null;

  const timeSinceOnline = lastOnlineTime 
    ? Math.floor((Date.now() - lastOnlineTime.getTime()) / 1000 / 60)
    : null;

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <WifiOff className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        You're Offline
        {pendingSyncCount > 0 && (
          <Badge variant="outline" className="ml-2">
            {pendingSyncCount} pending
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Some features are unavailable. Your changes will sync when you reconnect.
          {timeSinceOnline !== null && timeSinceOnline > 0 && (
            <span className="text-muted-foreground ml-2">
              (offline for {timeSinceOnline}m)
            </span>
          )}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
          className="ml-4"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Feature-specific offline indicator
interface FeatureOfflineIndicatorProps {
  featureId: string;
  className?: string;
}

export function FeatureOfflineIndicator({ featureId, className }: FeatureOfflineIndicatorProps) {
  const { isOnline, getFeatureStatus, canUseFeature } = useOffline();
  
  const status = getFeatureStatus(featureId);
  const canUse = canUseFeature(featureId);

  if (isOnline || !status) return null;

  const getStatusIcon = () => {
    switch (status.status) {
      case 'fully-offline':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partially-offline':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'online-only':
        return <CloudOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (): string => {
    switch (status.status) {
      case 'fully-offline':
        return 'border-green-500/50 bg-green-500/10';
      case 'partially-offline':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'online-only':
        return 'border-red-500/50 bg-red-500/10';
    }
  };

  if (canUse && status.status === 'fully-offline') {
    return null; // Don't show indicator for fully offline features
  }

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg border text-sm",
      getStatusColor(),
      className
    )}>
      {getStatusIcon()}
      <span className="text-muted-foreground">
        {status.fallbackMessage || `${status.name} - ${status.description}`}
      </span>
    </div>
  );
}

// Wrapper component that disables features when offline
interface OfflineFeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showIndicator?: boolean;
}

export function OfflineFeatureGate({ 
  featureId, 
  children, 
  fallback,
  showIndicator = true 
}: OfflineFeatureGateProps) {
  const { canUseFeature, getFeatureStatus, getOfflineMessage } = useOffline();
  
  const canUse = canUseFeature(featureId);
  const status = getFeatureStatus(featureId);
  const offlineMessage = getOfflineMessage(featureId);

  if (canUse) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <CloudOff className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {status?.name || 'Feature'} Unavailable Offline
      </h3>
      <p className="text-muted-foreground max-w-md">
        {offlineMessage || 'This feature requires an internet connection to work.'}
      </p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Check Connection
      </Button>
    </div>
  );
}

// Status dot for feature list
interface OfflineStatusDotProps {
  status: FeatureOfflineStatus;
  size?: 'sm' | 'md';
}

export function OfflineStatusDot({ status, size = 'sm' }: OfflineStatusDotProps) {
  const sizeClass = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';
  
  const colorClass = {
    'fully-offline': 'bg-green-500',
    'partially-offline': 'bg-yellow-500',
    'online-only': 'bg-red-500'
  }[status];

  return (
    <Tooltip>
      <TooltipTrigger>
        <Circle className={cn(sizeClass, colorClass, 'fill-current')} />
      </TooltipTrigger>
      <TooltipContent>
        {status === 'fully-offline' && 'Works offline'}
        {status === 'partially-offline' && 'Partial offline support'}
        {status === 'online-only' && 'Requires internet'}
      </TooltipContent>
    </Tooltip>
  );
}
