
import { supabase } from "@/integrations/supabase/client";

interface ConnectionHealth {
  isOnline: boolean;
  supabaseConnected: boolean;
  latency: number;
  lastChecked: Date;
}

class ConnectionHealthChecker {
  private static instance: ConnectionHealthChecker;
  private healthStatus: ConnectionHealth = {
    isOnline: navigator.onLine,
    supabaseConnected: false,
    latency: 0,
    lastChecked: new Date()
  };
  private listeners: ((health: ConnectionHealth) => void)[] = [];

  static getInstance(): ConnectionHealthChecker {
    if (!ConnectionHealthChecker.instance) {
      ConnectionHealthChecker.instance = new ConnectionHealthChecker();
    }
    return ConnectionHealthChecker.instance;
  }

  constructor() {
    this.setupEventListeners();
    this.performHealthCheck();
    
    // Check health every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored');
      this.updateHealthStatus({ isOnline: true });
      this.performHealthCheck();
    });

    window.addEventListener('offline', () => {
      console.log('🚫 Connection lost');
      this.updateHealthStatus({ 
        isOnline: false, 
        supabaseConnected: false 
      });
    });
  }

  private async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      // Test basic internet connectivity
      if (!navigator.onLine) {
        this.updateHealthStatus({
          isOnline: false,
          supabaseConnected: false,
          latency: 0
        });
        return;
      }

      // Test Supabase connectivity with a lightweight query
      const { error } = await supabase
        .from('system_info')
        .select('id')
        .limit(1)
        .single();

      const latency = Date.now() - startTime;

      this.updateHealthStatus({
        isOnline: true,
        supabaseConnected: !error,
        latency
      });

      if (error) {
        console.warn('⚠️ Supabase connection issue:', error.message);
      }

    } catch (error: any) {
      console.error('❌ Connection health check failed:', error);
      this.updateHealthStatus({
        isOnline: navigator.onLine,
        supabaseConnected: false,
        latency: Date.now() - startTime
      });
    }
  }

  private updateHealthStatus(updates: Partial<ConnectionHealth>) {
    this.healthStatus = {
      ...this.healthStatus,
      ...updates,
      lastChecked: new Date()
    };

    // Notify all listeners
    this.listeners.forEach(listener => listener(this.healthStatus));
  }

  public getHealthStatus(): ConnectionHealth {
    return { ...this.healthStatus };
  }

  public addListener(callback: (health: ConnectionHealth) => void) {
    this.listeners.push(callback);
  }

  public removeListener(callback: (health: ConnectionHealth) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public async forceHealthCheck(): Promise<ConnectionHealth> {
    await this.performHealthCheck();
    return this.getHealthStatus();
  }
}

export const connectionHealthChecker = ConnectionHealthChecker.getInstance();

// React hook for using connection health in components
export function useConnectionHealth() {
  const [health, setHealth] = useState<ConnectionHealth>(
    connectionHealthChecker.getHealthStatus()
  );

  useEffect(() => {
    const handleHealthUpdate = (newHealth: ConnectionHealth) => {
      setHealth(newHealth);
    };

    connectionHealthChecker.addListener(handleHealthUpdate);

    return () => {
      connectionHealthChecker.removeListener(handleHealthUpdate);
    };
  }, []);

  return {
    ...health,
    forceCheck: () => connectionHealthChecker.forceHealthCheck()
  };
}
