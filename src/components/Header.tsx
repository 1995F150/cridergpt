import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Key, Upload, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
          
          {isLoggedIn ? (
            <>
              <Button variant="ghost" size="sm">
                <Key className="h-4 w-4 mr-2" />
                API Keys
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
              <Button variant="ghost" size="sm" onClick={() => setIsLoggedIn(false)}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsLoggedIn(true)} className="bg-cyber-blue hover:bg-cyber-blue-dark">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}