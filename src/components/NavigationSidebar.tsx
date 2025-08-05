
import { Bot, FolderOpen, Upload, Volume2, BarChart3, CreditCard, Activity, Crown, Palette, Megaphone, Code, Star, Heart, Monitor, Sheet, MapPin, User } from "lucide-react";

interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'chat', icon: Monitor, label: 'CriderGPT' },
  { id: 'projects', icon: FolderOpen, label: 'Projects' },
  { id: 'files', icon: Upload, label: 'Files' },
  { id: 'code', icon: Code, label: 'Code Generator' },
  { id: 'tts', icon: Volume2, label: 'Text to Speech' },
  { id: 'media', icon: Palette, label: 'Media Generator' },
  { id: 'maps', icon: MapPin, label: 'Map Builder', badge: 'Soon' },
  { id: 'origin', icon: User, label: 'Origin Story' },
  { id: 'memorial', icon: Heart, label: 'Memorial' },
  { id: 'reviews', icon: Star, label: 'Reviews' },
  { id: 'updates', icon: Megaphone, label: 'System Updates' },
  { id: 'plan', icon: Crown, label: 'Current Plan' },
  { id: 'payments', icon: CreditCard, label: 'Payments' },
  { id: 'sheets', icon: Sheet, label: 'Google Sheets' },
  { id: 'status', icon: BarChart3, label: 'Status' },
];

export function NavigationSidebar({ activeTab, onTabChange }: NavigationSidebarProps) {
  return (
    <div className="w-48 sm:w-56 md:w-64 bg-card border-r-2 border-border flex flex-col">
      <div className="flex flex-col gap-1 sm:gap-2 p-2 sm:p-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-left relative ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="font-medium text-xs sm:text-sm md:text-base truncate">{tab.label}</span>
              {tab.badge && (
                <span className="ml-auto bg-green-100 text-green-700 text-xs px-1 sm:px-2 py-1 rounded-full flex-shrink-0">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
