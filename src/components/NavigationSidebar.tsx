import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Calculator, 
  FileText, 
  Folder,
  Images,
  Code, 
  Map, 
  Play, 
  Mail, 
  User, 
  DollarSign, 
  Star, 
  Bell, 
  Clock, 
  Heart, 
  Layers,
  Wheat,
  Radio,
  ImageIcon,
  Brain,
  Smartphone,
  ExternalLink,
  Calendar,
  Cloud,
  Box
} from 'lucide-react';

interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDeveloper?: boolean;
}

const navigationItems = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'calculators', label: 'Calculators', icon: Calculator },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'files', label: 'Files', icon: Folder },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'maps', label: 'Maps', icon: Map },
  { id: 'media', label: 'Media', icon: Play },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'social', label: 'Crider Chat', icon: MessageSquare },
  { id: 'payment', label: 'Payment', icon: DollarSign },
  { id: 'plan', label: 'Plan', icon: Layers },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'updates', label: 'Updates', icon: Bell },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'memorial', label: 'Memorial', icon: Heart },
  { id: 'ffa', label: 'FFA Center', icon: Wheat },
  { id: 'radio', label: 'Radio & CB Scanner', icon: Radio },
  { id: 'ai-image', label: 'AI Images', icon: ImageIcon },
  { id: 'document-ai', label: 'Document AI', icon: Brain },
  { id: 'app-converter', label: 'App Converter', icon: Smartphone },
  { id: 'cloud-gaming', label: 'Cloud Gaming', icon: Cloud },
  { id: '3d-converter', label: '3D Converter', icon: Box, developerOnly: true },
  { id: 'farming-simulator', label: 'Farming Simulator', icon: Wheat, external: true, url: 'https://farmgenie-studio.lovable.app/' }
];

export function NavigationSidebar({ activeTab, onTabChange, isDeveloper = false }: NavigationSidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">CriderGPT Dashboard</h2>
      </div>
      
      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="space-y-1 p-3">
          {navigationItems.map((item) => {
            // Hide developer-only items from non-developers
            if ((item as any).developerOnly && !isDeveloper) {
              return null;
            }
            
            const Icon = item.icon;
            
            if (item.external) {
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10"
                  onClick={() => window.open(item.url, '_blank')}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              );
            }
            
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  activeTab === item.id && "bg-primary/10 text-primary"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}