import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <div className="text-sm text-muted-foreground">
              © 2025 Jessie Crider — All Rights Reserved.
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              This AI system (CriderGPT) is original work. Do not copy, modify, or redistribute without permission.
            </div>
          </div>
          
          <div className="flex gap-4 text-xs">
            <Link 
              to="/tts-policy" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              TTS Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Early Release Version</span>
          </div>
        </div>
      </div>
    </footer>
  );
}