import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Key, Upload, LogOut } from "lucide-react";

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyber-blue to-tech-accent rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-background">OS</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
              CriderOS
            </h1>
          </div>
          <Badge variant="secondary" className="bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20">
            AI Assistant
          </Badge>
        </div>

        <div className="flex items-center space-x-4">
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