import { Bot, FolderOpen, Upload, Volume2, BarChart3, CreditCard, Activity, Crown, Palette, Megaphone, Code, Star, Heart, Monitor } from "lucide-react";

interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'chat', icon: Monitor, label: 'CriderOS' },
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
    <div className="w-64 bg-card border-r-2 border-border flex flex-col">
      <div className="flex flex-col gap-2 p-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}