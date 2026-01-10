import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileDropdown } from "@/components/ProfileDropdown";

interface HeaderProps {
  onMobileMenuClick?: () => void;
  isMobile?: boolean;
}

export function Header({ onMobileMenuClick, isMobile = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-2 md:px-4 py-2 md:py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Hamburger menu for mobile */}
          {isMobile && onMobileMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileMenuClick}
              className="h-10 w-10 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          )}
          
          <div className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png" 
              alt="CriderGPT Logo" 
              className="h-8 md:h-12 w-auto"
            />
          </div>
          <Badge variant="secondary" className="bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20 hidden sm:flex">
            AI Assistant
          </Badge>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 p-0"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          {user ? (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.open('/tts-policy', '_blank')}
                className="hidden md:flex"
              >
                TTS Policy
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Upload className="h-4 w-4 mr-2" />
                Files
              </Button>
              <ProfileDropdown />
            </>
          ) : (
            <Button onClick={handleAuthAction} className="bg-cyber-blue hover:bg-cyber-blue/90 text-sm px-3 md:px-4">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
