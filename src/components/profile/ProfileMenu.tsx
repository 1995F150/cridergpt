
import { User, Settings, LogOut, UserCircle, File, MessageCircle, Folder, Cpu, Activity } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileMenuProps {
  onAccountClick: () => void;
  onSettingsClick: () => void;
  onFilesClick: () => void;
  onAISettingsClick: () => void;
  onUsageStatsClick: () => void;
  onTokensClick: () => void;
}

export function ProfileMenu({ 
  onAccountClick,
  onSettingsClick, 
  onFilesClick,
  onAISettingsClick,
  onUsageStatsClick,
  onTokensClick
}: ProfileMenuProps) {
  const { signOut } = useAuth();

  return (
    <>
      <DropdownMenuItem className="cursor-pointer" onClick={onAccountClick}>
        <User className="mr-2 h-4 w-4" />
        <span>My Account</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem className="cursor-pointer" onClick={onSettingsClick}>
        <Settings className="mr-2 h-4 w-4" />
        <span>Settings</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem className="cursor-pointer" onClick={onFilesClick}>
        <Folder className="mr-2 h-4 w-4" />
        <span>My Files</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem className="cursor-pointer" onClick={onAISettingsClick}>
        <Cpu className="mr-2 h-4 w-4" />
        <span>AI Settings</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem className="cursor-pointer" onClick={onUsageStatsClick}>
        <Activity className="mr-2 h-4 w-4" />
        <span>Usage Stats</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem className="cursor-pointer" onClick={onTokensClick}>
        <File className="mr-2 h-4 w-4" />
        <span>Tokens & Credits</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem asChild>
        <a
          href={`mailto:jessiecrider3@gmail.com?subject=Feedback from CriderGPT&body=Hey Jessie, here's my feedback:`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center cursor-pointer"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          <span>Feedback / Help</span>
        </a>
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuItem disabled>
        <span className="text-xs text-muted-foreground">CriderGPT — Built by Jessie Crider</span>
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuItem 
        className="cursor-pointer text-destructive focus:text-destructive"
        onClick={signOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Logout</span>
      </DropdownMenuItem>
    </>
  );
}
