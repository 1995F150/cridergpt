// Central error logging utility
export interface ErrorLog {
  id: string;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
  component?: string;
  message: string;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;

  log(
    type: ErrorLog['type'],
    message: string,
    component?: string,
    error?: Error
  ) {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      component,
      message,
      stack: error?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.unshift(errorLog);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console output with proper formatting
    const logMethod = type === 'error' ? console.error : 
                     type === 'warning' ? console.warn : console.info;
    
    logMethod(
      `🚨 [${type.toUpperCase()}] ${component ? `[${component}] ` : ''}${message}`,
      error || ''
    );

    // Store in localStorage for persistence
    try {
      localStorage.setItem('crider-error-logs', JSON.stringify(this.logs.slice(0, 20)));
    } catch (e) {
      console.warn('Failed to store error logs in localStorage');
    }
  }

  error(message: string, component?: string, error?: Error) {
    this.log('error', message, component, error);
  }

  warning(message: string, component?: string) {
    this.log('warning', message, component);
  }

  info(message: string, component?: string) {
    this.log('info', message, component);
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  getRecentLogs(count: number = 10): ErrorLog[] {
    return this.logs.slice(0, count);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('crider-error-logs');
  }

  // Load logs from localStorage on init
  init() {
    try {
      const stored = localStorage.getItem('crider-error-logs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (e) {
      console.warn('Failed to load stored error logs');
    }
  }
}

export const errorLogger = new ErrorLogger();

// Initialize on module load
errorLogger.init();

// Global error handlers
window.addEventListener('error', (event) => {
  errorLogger.error(
    `Uncaught error: ${event.message}`,
    'Global',
    event.error
  );
});

window.addEventListener('unhandledrejection', (event) => {
  errorLogger.error(
    `Unhandled promise rejection: ${event.reason}`,
    'Global',
    event.reason instanceof Error ? event.reason : undefined
  );
});
