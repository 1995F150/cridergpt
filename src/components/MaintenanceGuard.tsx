import { useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaintenanceConfig {
  maintenance_mode: boolean;
  message: string;
  estimated_duration: string;
  whitelist_ips: string[];
  scheduled_end: string | null;
}

interface MaintenanceGuardProps {
  children: ReactNode;
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkMaintenanceStatus();
  }, [user]);

  const checkMaintenanceStatus = async () => {
    try {
      // Fetch system status
      const { data: status, error } = await supabase
        .from('system_status')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching system status:', error);
        setIsLoading(false);
        return;
      }

      if (status && status.maintenance_mode) {
        setConfig(status as MaintenanceConfig);
        
        // Check if user is admin
        if (user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single();

          if (roles) {
            setIsAdmin(true);
            setMaintenanceActive(false);
          } else {
            setMaintenanceActive(true);
          }
        } else {
          setMaintenanceActive(true);
        }
      } else {
        setMaintenanceActive(false);
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (maintenanceActive && config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Under Maintenance</h1>
            <p className="text-muted-foreground">{config.message}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Estimated duration: {config.estimated_duration}</span>
          </div>

          {config.scheduled_end && (
            <p className="text-sm text-muted-foreground">
              Expected back: {new Date(config.scheduled_end).toLocaleString()}
            </p>
          )}

          <Button 
            variant="outline" 
            onClick={checkMaintenanceStatus}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Check Again
          </Button>

          <p className="text-xs text-muted-foreground">
            We apologize for the inconvenience. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
