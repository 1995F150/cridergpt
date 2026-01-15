import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, X, Share, Plus, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';
import { APP_VERSION } from '@/config/appVersion';

interface PWAInstallPromptProps {
  variant?: 'banner' | 'card' | 'button';
  onInstalled?: () => void;
}

export function PWAInstallPrompt({ variant = 'banner', onInstalled }: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, isIOS, isAndroid, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Check if user previously dismissed the banner
  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      onInstalled?.();
    }
  };

  // Already installed - show success state for card variant
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              App Installed
            </CardTitle>
            <CardDescription>
              CriderGPT v{APP_VERSION} is installed on your device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You can access CriderGPT from your home screen or app launcher. 
              The app works offline and will receive automatic updates.
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  // iOS-specific instructions
  if (isIOS) {
    if (variant === 'button') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowIOSInstructions(true)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Install App
        </Button>
      );
    }

    if (variant === 'card' || showIOSInstructions) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install CriderGPT
            </CardTitle>
            <CardDescription>
              Add to your home screen for the best experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Share className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">1. Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">
                    Located at the bottom of Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">2. Tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Scroll down in the share menu to find it
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">3. Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    CriderGPT will appear on your home screen
                  </p>
                </div>
              </div>
            </div>
            {showIOSInstructions && (
              <Button variant="outline" onClick={() => setShowIOSInstructions(false)} className="w-full">
                Got it
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    // Banner variant for iOS
    if (variant === 'banner' && !dismissed) {
      return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
          <Card className="border-primary/20 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full p-2 shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Install CriderGPT</p>
                  <p className="text-sm text-muted-foreground">
                    Tap <Share className="h-3 w-3 inline mx-1" /> then "Add to Home Screen"
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleDismiss} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  }

  // Not installable (already installed or not supported)
  if (!isInstallable) {
    if (variant === 'card') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Install CriderGPT
            </CardTitle>
            <CardDescription>
              Install as a desktop or mobile app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Open CriderGPT in Chrome, Edge, or another supported browser to enable installation.
              The install option will appear automatically when available.
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  // Installable - show install UI
  if (variant === 'button') {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleInstall}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Install App
      </Button>
    );
  }

  if (variant === 'card') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isAndroid ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            Install CriderGPT
          </CardTitle>
          <CardDescription>
            Get the full app experience with offline support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Works offline
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Faster loading
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Home screen icon
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Push notifications
            </li>
          </ul>
          <Button onClick={handleInstall} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Install CriderGPT v{APP_VERSION}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Banner variant
  if (dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <Card className="border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2 shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Install CriderGPT</p>
              <p className="text-sm text-muted-foreground truncate">
                Get offline access & faster loading
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
