import { Bot, FolderOpen, Upload, Volume2, BarChart3, CreditCard, Activity, Crown, Palette, Megaphone, Code, Star, Heart } from "lucide-react";

interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'assistant', icon: Bot, label: 'AI Assistant' },
  { id: 'projects', icon: FolderOpen, label: 'Projects' },
  { id: 'files', icon: Upload, label: 'Files' },
  { id: 'code', icon: Code, label: 'Code Generator' },
  { id: 'tts', icon: Volume2, label: 'Text to Speech' },
  { id: 'media', icon: Palette, label: 'Media Generator' },
  { id: 'memorial', icon: Heart, label: 'Memorial' },
  { id: 'reviews', icon: Star, label: 'Reviews' },
  { id: 'updates', icon: Megaphone, label: 'System Updates' },
  { id: 'plan', icon: Crown, label: 'Current Plan' },
  { id: 'payments', icon: CreditCard, label: 'Payments' },
  { id: 'status', icon: BarChart3, label: 'Status' },
];

export function NavigationSidebar({ activeTab, onTabChange }: NavigationSidebarProps) {
  return (
    <div className="w-16 bg-card border-r-2 border-border flex flex-col">
      <div className="flex flex-col gap-2 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
              title={tab.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}