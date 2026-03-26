import { Link } from "react-router-dom";
import { APP_VERSION } from "@/config/appVersion";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
          <div className="text-center md:text-left">
            <div className="text-xs md:text-sm text-muted-foreground">
              © {new Date().getFullYear()} Jessie Crider — All Rights Reserved.
            </div>
            <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
              This AI system (CriderGPT) is original work. Do not copy, modify, or redistribute without permission.
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground/60">v{APP_VERSION}</span>
            <Link 
              to="/snapchat-lens" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Snapchat Lenses
            </Link>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <Link 
              to="/custom-filters" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Custom Filters
            </Link>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <Link 
              to="/user-agreement" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
