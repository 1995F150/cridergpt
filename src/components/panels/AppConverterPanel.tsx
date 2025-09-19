import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, Code, Download, Zap, Lock, ArrowRight } from 'lucide-react';
import { useFeatureGating } from '@/hooks/useFeatureGating';

export function AppConverterPanel() {
  const [sourceCode, setSourceCode] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('');
  const [convertedCode, setConvertedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentPlan, isPlan } = useFeatureGating();

  const maxFreeUses = 5;
  const canUse = isPlan('free') ? usageCount < maxFreeUses : true;

  const convertCode = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the app converter.",
        variant: "destructive"
      });
      return;
    }

    if (!canUse) {
      toast({
        title: "Usage Limit Reached",
        description: "Upgrade to Pro or Plus to continue using the app converter.",
        variant: "destructive"
      });
      return;
    }

    if (!sourceCode.trim() || !targetPlatform) {
      toast({
        title: "Missing Information",
        description: "Please provide source code and select a target platform.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const prompt = `Convert the following ${targetPlatform === 'android' ? 'React/TypeScript web' : 'React/TypeScript web'} code to a fully functional ${targetPlatform === 'android' ? 'Android (Kotlin/Java)' : 'iOS (Swift)'} application. Include all necessary files, dependencies, and configuration:

Source Code:
${sourceCode}

Requirements:
- Create a complete, production-ready ${targetPlatform} app
- Include all necessary dependencies and configuration files
- Maintain the same functionality as the original web code
- Add proper error handling and user interface
- Include build instructions and app packaging details
- Make sure the app is ready for deployment to ${targetPlatform === 'android' ? 'Google Play Store' : 'Apple App Store'}

Please provide:
1. Complete source code files
2. Dependencies/requirements file
3. Build configuration
4. Installation and build instructions
5. App packaging details for store submission`;

      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: prompt,
          model: 'gpt-5-2025-08-07'
        }
      });

      if (error) throw error;

      setConvertedCode(data.response);
      
      // Update usage count for free users
      if (isPlan('free')) {
        setUsageCount(prev => prev + 1);
      }

      toast({
        title: "Code Converted Successfully",
        description: `Your web code has been converted to ${targetPlatform === 'android' ? 'Android' : 'iOS'} format.`
      });

    } catch (error) {
      console.error('Error converting code:', error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(convertedCode);
      toast({
        title: "Copied to Clipboard",
        description: "Converted code copied successfully."
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Smartphone className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI App Converter</h1>
        </div>
        <p className="text-muted-foreground">
          Convert your website code to Android or iOS apps using AI
        </p>
        
        {isPlan('free') && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">
                Free Plan: {usageCount}/{maxFreeUses} conversions used
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Source Code
            </CardTitle>
            <CardDescription>
              Paste your website code (React, TypeScript, HTML, CSS, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your website source code here..."
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Platform</label>
              <Select value={targetPlatform} onValueChange={setTargetPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">Android (Kotlin/Java)</SelectItem>
                  <SelectItem value="ios">iOS (Swift)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={convertCode} 
              disabled={loading || !canUse || !sourceCode.trim() || !targetPlatform}
              className="w-full"
            >
              {loading ? (
                <>Converting...</>
              ) : !canUse ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Upgrade Required
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convert to {targetPlatform === 'android' ? 'Android' : 'iOS'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Converted App Code
            </CardTitle>
            <CardDescription>
              Complete app code ready for development and deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={convertedCode}
              readOnly
              placeholder="Converted code will appear here..."
              className="min-h-[200px] font-mono text-sm"
            />
            
            {convertedCode && (
              <Button onClick={copyToClipboard} variant="outline" className="w-full">
                Copy Converted Code
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features Section */}
      <Card>
        <CardHeader>
          <CardTitle>What You Get</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <Badge className="mt-1">📱</Badge>
              <div>
                <h4 className="font-medium">Native App Code</h4>
                <p className="text-sm text-muted-foreground">Complete native application code</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="mt-1">📦</Badge>
              <div>
                <h4 className="font-medium">Dependencies</h4>
                <p className="text-sm text-muted-foreground">All required packages and libraries</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="mt-1">⚙️</Badge>
              <div>
                <h4 className="font-medium">Build Config</h4>
                <p className="text-sm text-muted-foreground">Ready-to-use build configuration</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="mt-1">🚀</Badge>
              <div>
                <h4 className="font-medium">Store Ready</h4>
                <p className="text-sm text-muted-foreground">App store deployment guide</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}