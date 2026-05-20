import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldOff } from "lucide-react";

export function DevHubGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isDeveloper, isLoading } = useDeveloperMode();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isDeveloper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <ShieldOff className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Restricted Zone</h1>
        <p className="text-muted-foreground max-w-md">
          The Dev Hub is locked to the verified system owner (Jessie Crider).
          Even admins don't have access here.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
