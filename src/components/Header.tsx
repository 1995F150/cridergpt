import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Upload, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
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
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png" 
              alt="CriderOS Logo" 
              className="h-12 w-auto"
            />
          </div>
          <Badge variant="secondary" className="bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20">
            AI Assistant
          </Badge>
        </div>

        <div className="flex items-center space-x-4">
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
              >
                TTS Policy
              </Button>
              <Button variant="ghost" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Files
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-cyber-blue text-background">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleAuthAction}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={handleAuthAction} className="bg-cyber-blue hover:bg-cyber-blue/90">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}