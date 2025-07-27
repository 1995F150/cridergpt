import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, RefreshCw, Database, Sheet } from 'lucide-react';

export function GoogleSheetsPanel() {
  const [spreadsheetId, setSpreadsheetId] = useState('1PfbY0fm4cGUA8x6jFUBdu1TBP8ngWnLPJDY92h1vAM0');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!spreadsheetId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Google Sheet ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting sync to Google Sheets...');
      
      const { data, error } = await supabase.functions.invoke('sync-buyers-to-sheets', {
        body: { 
          spreadsheetId: spreadsheetId.trim(),
          action: 'sync'
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to sync data');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed');
      }

      setLastSyncTime(new Date().toLocaleString());
      toast({
        title: "Success!",
        description: data.message || "User data synced to Google Sheets successfully",
      });

    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync data to Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractSheetId = (url: string) => {
    // Extract sheet ID from full Google Sheets URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleUrlChange = (value: string) => {
    const extractedId = extractSheetId(value);
    setSpreadsheetId(extractedId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sheet className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Google Sheets Integration</h2>
          <p className="text-muted-foreground">Sync your user data and tiers to Google Sheets for tracking and analysis</p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to set up Google Sheets integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Step 1: Create a Google Sheet</h4>
              <p className="text-sm text-muted-foreground">
                Create a new Google Sheet or use an existing one where you want to track your buyers.
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Step 2: Make it Public (View Only)</h4>
              <p className="text-sm text-muted-foreground">
                Share your sheet with "Anyone with the link" can view. This allows our system to write data to it.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Step 3: Get the Sheet ID</h4>
              <p className="text-sm text-muted-foreground">
                Copy the Sheet ID from the URL. It's the long string between /d/ and /edit in your Google Sheets URL.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Configuration</CardTitle>
            <CardDescription>
              Enter your Google Sheet details to start syncing user data and tiers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheetUrl">Google Sheet URL or ID</Label>
              <Input
                id="spreadsheetUrl"
                placeholder="Enter Google Sheets URL or ID"
                value={spreadsheetId}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                You can paste the full URL or just the Sheet ID
              </p>
            </div>

            <Button 
              onClick={handleSync} 
              disabled={isLoading || !spreadsheetId.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing to Google Sheets...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Users to Google Sheets
                </>
              )}
            </Button>

            {lastSyncTime && (
              <div className="text-sm text-muted-foreground text-center">
                Last synced: {lastSyncTime}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Gets Synced</CardTitle>
            <CardDescription>
              The following user information and tier data will be synced to your Google Sheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">• User ID</div>
                <div className="font-medium">• Email Address</div>
                <div className="font-medium">• Full Name</div>
                <div className="font-medium">• Username</div>
                <div className="font-medium">• Created At</div>
                <div className="font-medium">• Last Sign In</div>
                <div className="font-medium">• User Tier</div>
                <div className="font-medium">• Tier Created Date</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">• Tokens Used</div>
                <div className="font-medium">• TTS Requests</div>
                <div className="font-medium">• User Plan</div>
                <div className="font-medium">• Pro Access</div>
                <div className="font-medium">• Plus Access</div>
                <div className="font-medium">• Subscription Status</div>
                <div className="font-medium">• Stripe Customer ID</div>
                <div className="font-medium">• Current Plan</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" asChild className="w-full justify-start">
              <a 
                href="https://sheets.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Create New Google Sheet
              </a>
            </Button>
            
            <Button variant="outline" asChild className="w-full justify-start">
              <a 
                href="https://support.google.com/docs/answer/183965" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                How to Share Google Sheets
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}