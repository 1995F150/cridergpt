import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Calculator, 
  Folder,
  Images,
  Play, 
  Mail, 
  User, 
  DollarSign, 
  Bell, 
  Clock, 
  Heart, 
  Layers,
  Wheat,
  ImageIcon,
  Smartphone,
  ExternalLink,
  Calendar,
  Box,
  Cuboid,
  Wrench,
  Package,
  Eye,
  FileCode,
  Shield,
  Gamepad2,
  ShieldCheck,
  Beef,
  Receipt,
  Brain,
  AudioLines,
  HandCoins,
  Usb,
  Radar
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDeveloper?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  developerOnly?: boolean;
  adminOnly?: boolean;
  emailRestricted?: string[];
  external?: boolean;
  url?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'MAIN',
    items: [
      { id: 'chat', label: 'Chat', icon: MessageSquare },
      { id: 'vision-memory', label: 'Vision Memory', icon: Eye },
    ]
  },
  {
    label: 'PRODUCTIVITY',
    items: [
      { id: 'livestock', label: 'Livestock ID', icon: Beef },
      { id: 'receipts', label: 'Receipts', icon: Receipt },
      { id: 'agent-swarm', label: 'Agent Swarm', icon: Brain },
      { id: 'voice-studio', label: 'Voice Studio', icon: AudioLines },
      { id: 'shared-spending', label: 'Shared Spending', icon: HandCoins },
      { id: 'ffa', label: 'FFA Center', icon: Wheat },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'calculators', label: 'Calculators', icon: Calculator },
      { id: 'files', label: 'Files', icon: Folder },
      { id: 'gallery', label: 'Gallery', icon: Images },
      { id: 'projects', label: 'Projects', icon: Folder },
    ]
  },
  {
    label: 'CREATIVE',
    items: [
      { id: 'media', label: 'Media', icon: Play, emailRestricted: ['jessiecrider3@gmail.com'] },
      { id: 'ai-image', label: 'AI Images', icon: ImageIcon },
      { id: 'studio', label: '3D Studio', icon: Cuboid },
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { id: 'guardian', label: 'Guardian', icon: ShieldCheck },
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'plan', label: 'Plan', icon: Layers },
      { id: 'payment', label: 'Payment', icon: DollarSign },
    ]
  },
  {
    label: 'TOOLS',
    items: [
      { id: 'code-editor', label: 'Code Editor', icon: FileCode, emailRestricted: ['jessiecrider3@gmail.com'] },
      { id: 'app-converter', label: 'App Converter', icon: Smartphone },
      { id: 'zip-to-exe', label: 'ZIP-to-EXE Builder', icon: Package },
      { id: 'mod-tools', label: 'Mod Creation Tools', icon: Wrench },
      { id: 'cloud-gaming', label: 'Cloud Gaming', icon: Gamepad2 },
      { id: 'rdr2-guide', label: 'RDR2 Guide', icon: Gamepad2 },
      { id: 'usb-hub', label: 'USB Hub', icon: Usb },
      { id: 'sensors', label: 'Sensors', icon: Radar },
      { id: 'frequency', label: 'Frequency Tools', icon: AudioLines },
      { id: '3d-converter', label: '3D Converter', icon: Box, developerOnly: true },
    ]
  },
  {
    label: 'INFO',
    items: [
      { id: 'updates', label: 'Updates', icon: Bell },
      { id: 'timeline', label: 'Timeline', icon: Clock },
      { id: 'memorial', label: 'Memorial', icon: Heart },
      { id: 'contact', label: 'Contact', icon: Mail },
    ]
  }
];

const externalLinks: NavItem[] = [
  { id: 'farming-simulator', label: 'Farming Simulator', icon: Wheat, external: true, url: 'https://farmgenie-studio.lovable.app/' }
];

export function NavigationSidebar({ activeTab, onTabChange, isDeveloper = false }: NavigationSidebarProps) {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  
  // Fetch pending reports and chapter requests count for admin badge
  useEffect(() => {
    async function fetchPendingCounts() {
      if (!isAdmin) return;
      
      try {
        const [reportsRes, chaptersRes] = await Promise.all([
          (supabase as any).from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('chapter_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);
        
        const total = (reportsRes.count || 0) + (chaptersRes.count || 0);
        setPendingCount(total);
      } catch (error) {
        console.error('Error fetching pending counts:', error);
      }
    }
    
    fetchPendingCounts();
  }, [isAdmin]);

  const renderNavItem = (item: NavItem) => {
    // Hide developer-only items from non-developers
    if (item.developerOnly && !isDeveloper) {
      return null;
    }
    // Hide admin-only items from non-admins
    if (item.adminOnly && !isAdmin) {
      return null;
    }
    // Hide email-restricted items from users not in the allowed list
    if (item.emailRestricted && item.emailRestricted.length > 0) {
      const userEmail = user?.email?.toLowerCase();
      const allowedEmails = item.emailRestricted.map(e => e.toLowerCase());
      if (!userEmail || !allowedEmails.includes(userEmail)) {
        return null;
      }
    }
    
    const Icon = item.icon;
    
    if (item.external) {
      return (
        <Button
          key={item.id}
          variant="ghost"
          className="w-full justify-start gap-3 h-9 text-sm"
          onClick={() => window.open(item.url, '_blank')}
        >
          <Icon className="h-4 w-4" />
          {item.label}
          <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </Button>
      );
    }
    
    return (
      <Button
        key={item.id}
        variant={activeTab === item.id ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-9 text-sm",
          activeTab === item.id && "bg-primary/10 text-primary font-medium"
        )}
        onClick={() => onTabChange(item.id)}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Button>
    );
  };
  
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold text-foreground">CriderGPT Dashboard</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="px-3 pb-4">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.label} className="mb-4">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground tracking-wider">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(renderNavItem)}
              </div>
            </div>
          ))}
          
          {/* External Links */}
          {externalLinks.length > 0 && (
            <div className="mb-4">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground tracking-wider">
                EXTERNAL
              </p>
              <div className="space-y-0.5">
                {externalLinks.map(renderNavItem)}
              </div>
            </div>
          )}
          
          {/* Admin Section - Only visible to admins */}
          {isAdmin && (
            <>
              <Separator className="my-4" />
              <div className="rounded-lg bg-gradient-to-r from-destructive/10 to-orange-500/10 border border-destructive/20 p-3">
                <p className="px-1 mb-2 text-xs font-bold text-destructive tracking-wider flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  ADMIN
                </p>
                <Button
                  variant={activeTab === 'admin' ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10 text-sm",
                    activeTab === 'admin' 
                      ? "bg-destructive/20 text-destructive font-medium border border-destructive/30" 
                      : "hover:bg-destructive/10 hover:text-destructive"
                  )}
                  onClick={() => onTabChange('admin')}
                >
                  <Shield className="h-4 w-4" />
                  Admin Panel
                  {pendingCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
