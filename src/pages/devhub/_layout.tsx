import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";

export function DevHubPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <Link to="/devhub" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" /> Dev Hub
            </Link>
            <div className="border-l border-border pl-3">
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</div>
      </div>
    </DevHubGuard>
  );
}
