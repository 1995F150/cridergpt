
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  MessageSquare, 
  Calculator, 
  FileText, 
  Folder,
  Images,
  Code, 
  Volume2, 
  Zap, 
  Map, 
  Sheet, 
  Play, 
  BarChart3, 
  Mail, 
  User, 
  CreditCard, 
  DollarSign, 
  Star, 
  Bell, 
  Clock, 
  Heart, 
  Layers,
  Wheat,
  Radio
} from 'lucide-react';

interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'calculators', label: 'Calculators', icon: Calculator },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'files', label: 'Files', icon: Folder },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'tts', label: 'TTS', icon: Volume2 },
  { id: 'api', label: 'API', icon: Zap },
  { id: 'maps', label: 'Maps', icon: Map },
  { id: 'sheets', label: 'Sheets', icon: Sheet },
  { id: 'media', label: 'Media', icon: Play },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
  { id: 'payment', label: 'Payment', icon: DollarSign },
  { id: 'plan', label: 'Plan', icon: Layers },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'updates', label: 'Updates', icon: Bell },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'memorial', label: 'Memorial', icon: Heart },
  { id: 'ffa', label: 'FFA Center', icon: Wheat },
  { id: 'radio', label: 'Radio & CB Scanner', icon: Radio }
];

export function NavigationSidebar({ activeTab, onTabChange }: NavigationSidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">CriderGPT Dashboard</h2>
      </div>
      
      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="space-y-1 p-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
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
