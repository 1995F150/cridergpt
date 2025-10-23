import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Wrench,
  FileCode,
  AlertTriangle,
  Image,
  Tag,
  Factory,
  Map,
  Shield,
  Settings,
  Package,
  Upload,
  Zap,
  Code,
  Bug,
  Globe,
  Layers,
  Lock,
  Crown
} from "lucide-react";

interface ModTool {
  id: string;
  name: string;
  description: string;
  icon: any;
  tier: 'free' | 'plus' | 'pro';
}

const modTools: ModTool[] = [
  // Free Tools
  { id: 'moddesc', name: 'ModDesc Builder', description: 'Create modDesc.xml files for FS mods', icon: FileCode, tier: 'free' },
  { id: 'placeable', name: 'Placeable XML Wizard', description: 'Generate placeable object configurations', icon: Settings, tier: 'free' },
  { id: 'errorlog', name: 'Error Log Inspector', description: 'Analyze and fix Farming Simulator errors', icon: AlertTriangle, tier: 'free' },
  { id: 'ddsconvert', name: 'DDS Converter', description: 'Convert textures to DDS format', icon: Image, tier: 'free' },
  { id: 'versiontag', name: 'Version Tag Generator', description: 'Generate proper version tags for mods', icon: Tag, tier: 'free' },
  { id: 'mask', name: 'Terrain Mask Converter', description: 'Convert terrain masks for map editing', icon: Layers, tier: 'free' },
  { id: 'filltype', name: 'FillType Creator', description: 'Create custom fill types for your mods', icon: Package, tier: 'free' },
  { id: 'brand', name: 'Custom Brand Creator', description: 'Design custom brand identities', icon: Globe, tier: 'free' },
  
  // Plus Tools
  { id: 'production', name: 'Production Chain Generator', description: 'Create complex production chains', icon: Factory, tier: 'plus' },
  { id: 'farmland', name: 'Farmland XML Creator', description: 'Generate farmland configuration files', icon: Map, tier: 'plus' },
  { id: 'consolesafe', name: 'Console Safety Checker', description: 'Verify console compatibility', icon: Shield, tier: 'plus' },
  { id: 'mapconfig', name: 'Map Config Tool', description: 'Configure map settings and properties', icon: Settings, tier: 'plus' },
  { id: 'zipper', name: 'Auto Mod Zipper', description: 'Package mods automatically', icon: Package, tier: 'plus' },
  
  // Pro Tools
  { id: 'modhub', name: 'ModHub Submission Assistant', description: 'Prepare mods for ModHub submission', icon: Upload, tier: 'pro' },
  { id: 'luatemplate', name: 'LUA Template Generator', description: 'Generate LUA script templates', icon: Code, tier: 'pro' },
  { id: 'aiconfig', name: 'AI Config Builder', description: 'Build AI configurations with CriderGPT', icon: Zap, tier: 'pro' },
  { id: 'multimod', name: 'Multi-Mod Packager', description: 'Package multiple mods together', icon: Package, tier: 'pro' },
  { id: 'debugger', name: 'AI Script Debugger', description: 'Debug LUA scripts with AI assistance', icon: Bug, tier: 'pro' }
];

export function ModToolsPanel() {
  const { currentPlan, loading } = useFeatureGating();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'free' | 'plus' | 'pro'>('free');
  const [processingTool, setProcessingTool] = useState<string | null>(null);

  const canAccessTier = (tier: 'free' | 'plus' | 'pro'): boolean => {
    if (tier === 'free') return true;
    if (tier === 'plus') return currentPlan === 'plus' || currentPlan === 'pro';
    if (tier === 'pro') return currentPlan === 'pro';
    return false;
  };

  const handleToolClick = async (tool: ModTool) => {
    if (!canAccessTier(tool.tier)) {
      toast({
        title: "Upgrade Required",
        description: `This tool requires a ${tool.tier === 'plus' ? 'Plus' : 'Pro'} subscription.`,
        variant: "destructive",
      });
      return;
    }

    setProcessingTool(tool.id);

    try {
      // Log usage to ai_usage table
      if (user) {
        await supabase
          .from('ai_usage')
          .upsert({
            user_id: user.id,
            email: user.email,
            user_plan: currentPlan,
            tokens_used: 0
          }, {
            onConflict: 'user_id'
          });
      }

      toast({
        title: `${tool.name} Activated`,
        description: `Opening ${tool.name}...`,
      });

      // Tool-specific logic would go here
      console.log(`🛠️ Activated: ${tool.name} (${tool.tier})`);
      
    } catch (error) {
      console.error('Error activating tool:', error);
      toast({
        title: "Error",
        description: "Failed to activate tool. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingTool(null);
    }
  };

  const filteredTools = modTools.filter(tool => tool.tier === activeTab);

  const getTierBadge = (tier: 'free' | 'plus' | 'pro') => {
    const badges = {
      free: <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300"><Lock className="h-3 w-3 mr-1" />Free</Badge>,
      plus: <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300"><Crown className="h-3 w-3 mr-1" />Plus</Badge>,
      pro: <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300"><Crown className="h-3 w-3 mr-1" />Pro</Badge>
    };
    return badges[tier];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading mod tools...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-ffa-blue via-ffa-navy to-ffa-gold p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wrench className="h-8 w-8" />
              🧰 Mod Creation Tools
            </h1>
            <p className="text-blue-100 mt-2">
              Professional Farming Simulator mod creation tools powered by CriderGPT
            </p>
            <Badge variant="secondary" className="bg-white/20 text-white mt-2">
              Your Plan: {currentPlan.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Alert className="mb-6 bg-ffa-sky/10 border-ffa-blue">
          <Wrench className="h-4 w-4" />
          <AlertDescription>
            Create professional FS mods with AI-powered tools. Each tool logs to your usage dashboard.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'free' | 'plus' | 'pro')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="free" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Free Tools
            </TabsTrigger>
            <TabsTrigger value="plus" className="flex items-center gap-2" disabled={currentPlan === 'free'}>
              <Crown className="h-4 w-4" />
              Plus Tools
              {currentPlan === 'free' && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="pro" className="flex items-center gap-2" disabled={currentPlan !== 'pro'}>
              <Crown className="h-4 w-4" />
              Pro Tools
              {currentPlan !== 'pro' && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {!canAccessTier(activeTab) && (
              <Alert className="bg-amber-500/10 border-amber-500">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  🔒 Upgrade to {activeTab === 'plus' ? 'Plus' : 'Pro'} to access these tools.
                  <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => window.location.href = '/?tab=plan'}>
                    View Plans →
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => {
                const Icon = tool.icon;
                const isLocked = !canAccessTier(tool.tier);
                const isProcessing = processingTool === tool.id;

                return (
                  <Card 
                    key={tool.id} 
                    className={`transition-all hover:shadow-lg ${isLocked ? 'opacity-60' : ''} border-ffa-blue/20`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Icon className={`h-8 w-8 ${isLocked ? 'text-muted-foreground' : 'text-ffa-blue'}`} />
                        {getTierBadge(tool.tier)}
                      </div>
                      <CardTitle className="text-lg mt-2">{tool.name}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        disabled={isLocked || isProcessing}
                        onClick={() => handleToolClick(tool)}
                      >
                        {isProcessing ? 'Processing...' : isLocked ? '🔒 Upgrade to Access' : 'Open Tool'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground border-t pt-4">
          Built by Jessie Crider — CriderGPT (FFA Historian 2025–2026)
        </div>
      </div>
    </div>
  );
}
