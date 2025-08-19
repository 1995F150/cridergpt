
import { supabase } from "@/integrations/supabase/client";

export interface ConnectionStatus {
  isOnline: boolean;
  supabaseConnected: boolean;
  lastChecked: Date;
  error?: string;
}

export class ConnectionHealthMonitor {
  private static instance: ConnectionHealthMonitor;
  private status: ConnectionStatus = {
    isOnline: navigator.onLine,
    supabaseConnected: true,
    lastChecked: new Date()
  };
  private listeners: Array<(status: ConnectionStatus) => void> = [];
  private checkInterval?: NodeJS.Timeout;

  static getInstance(): ConnectionHealthMonitor {
    if (!ConnectionHealthMonitor.instance) {
      ConnectionHealthMonitor.instance = new ConnectionHealthMonitor();
    }
    return ConnectionHealthMonitor.instance;
  }

  private constructor() {
    this.setupEventListeners();
    this.startPeriodicCheck();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.updateStatus({ isOnline: true });
      this.checkSupabaseConnection();
    });

    window.addEventListener('offline', () => {
      this.updateStatus({ isOnline: false });
    });
  }

  private startPeriodicCheck() {
    // Check connection every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkSupabaseConnection();
    }, 30000);
  }

  private async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_info')
        .select('id')
        .limit(1);

      const connected = !error;
      this.updateStatus({ 
        supabaseConnected: connected,
        error: error?.message 
      });

      return connected;
    } catch (error) {
      console.error('Supabase connection check failed:', error);
      this.updateStatus({ 
        supabaseConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private updateStatus(updates: Partial<ConnectionStatus>) {
    this.status = {
      ...this.status,
      ...updates,
      lastChecked: new Date()
    };

    // Notify all listeners
    this.listeners.forEach(listener => listener(this.status));
  }

  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  public addListener(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async forceCheck(): Promise<ConnectionStatus> {
    this.updateStatus({ isOnline: navigator.onLine });
    await this.checkSupabaseConnection();
    return this.getStatus();
  }

  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Export convenience functions
export const getConnectionHealth = () => ConnectionHealthMonitor.getInstance().getStatus();
export const checkConnection = () => ConnectionHealthMonitor.getInstance().forceCheck();
export const onConnectionChange = (listener: (status: ConnectionStatus) => void) => 
  ConnectionHealthMonitor.getInstance().addListener(listener);

// Health check utilities
export const isHealthy = (status: ConnectionStatus): boolean => {
  return status.isOnline && status.supabaseConnected;
};

export const getHealthMessage = (status: ConnectionStatus): string => {
  if (!status.isOnline) {
    return "No internet connection detected";
  }
  
  if (!status.supabaseConnected) {
    return status.error || "Database connection issues";
  }
  
  return "All systems operational";
};

export const getHealthColor = (status: ConnectionStatus): string => {
  if (isHealthy(status)) return "green";
  if (status.isOnline) return "yellow";
  return "red";
};
