import { useState, useEffect } from "react";
import { User, Settings, LogOut, UserCircle, File, MessageCircle, Folder, Cpu, Activity, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: number;
  user_id: string;
  username: string | null;
}

export function ProfileDropdown() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);

  const handleComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon!",
      description: `${feature} feature is in development and will be available soon.`,
    });
  };

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

  if (!user) return null;

  return (
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
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => handleComingSoon("My Account")}>
          <User className="mr-2 h-4 w-4" />
          <span>My Account</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => handleComingSoon("Settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => handleComingSoon("My Files")}>
          <Folder className="mr-2 h-4 w-4" />
          <span>My Files</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => handleComingSoon("AI Settings")}>
          <Cpu className="mr-2 h-4 w-4" />
          <span>AI Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => handleComingSoon("Usage Stats")}>
          <Activity className="mr-2 h-4 w-4" />
          <span>Usage Stats</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => handleComingSoon("Tokens & Credits")}>
          <File className="mr-2 h-4 w-4" />
          <span>Tokens & Credits</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <a
            href={`mailto:jessiecrider3@gmail.com?subject=Feedback from CriderOS&body=Hey Jessie, here's my feedback:`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center cursor-pointer"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            <span>Feedback / Help</span>
          </a>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.preventDefault(); toggleTheme(); }}>
          <span className="flex items-center w-full">
            {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
            <span>Dark Mode</span>
            <Switch className="ml-auto" checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem disabled>
          <span className="text-xs text-muted-foreground">CriderRank: Level 3</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem disabled>
          <span className="text-xs text-muted-foreground">Built by Jessie Crider</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}