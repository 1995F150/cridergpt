import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { ProfileMenu } from "./profile/ProfileMenu";
import { ProfileSheet } from "./profile/ProfileSheet";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
}

export function ProfileDropdown() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    if (user) {
      fetchProfile();
      syncGoogleProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create profile if it doesn't exist
        await createProfile();
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const username = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User';

      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: user.id,
            username: username,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in createProfile:', error);
    }
  };

  const syncGoogleProfile = async () => {
    if (!user || !user.user_metadata) return;

    // Check if this is a Google OAuth user
    const isGoogleUser = user.app_metadata?.provider === 'google' || 
                         user.user_metadata?.iss?.includes('accounts.google.com');

    if (isGoogleUser && user.user_metadata.full_name) {
      try {
        // Update profile with Google data if it exists
        const { error } = await supabase
          .from('profiles')
          .update({
            username: user.user_metadata.full_name
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error syncing Google profile:', error);
        }
      } catch (error) {
        console.error('Error in syncGoogleProfile:', error);
      }
    }
  };

  const getDisplayName = () => {
    if (profile?.username) return profile.username;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getAvatarUrl = () => {
    // Prioritize Snapchat Bitmoji if connected
    const snapBitmoji = localStorage.getItem('snap_bitmoji_url');
    if (snapBitmoji) return snapBitmoji;
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMenuClick = (tab: string) => {
    setActiveTab(tab);
    setSheetOpen(true);
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
            <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2 bg-card/95 backdrop-blur-sm border-border" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <ProfileMenu 
            onAccountClick={() => handleMenuClick("account")}
            onSettingsClick={() => handleMenuClick("settings")}
            onFilesClick={() => handleMenuClick("files")}
            onAISettingsClick={() => handleMenuClick("ai")}
            onUsageStatsClick={() => handleMenuClick("usage")}
            onTokensClick={() => handleMenuClick("tokens")}
          />
          
          <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.preventDefault(); toggleTheme(); }}>
            <span className="flex items-center w-full">
              {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              <span>Dark Mode</span>
              <Switch className="ml-auto" checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen}
        defaultTab={activeTab}
      />
    </>
  );
}
