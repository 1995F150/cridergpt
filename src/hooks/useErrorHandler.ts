import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorLogger } from '@/utils/errorLogger';

export interface UseErrorHandlerOptions {
  component?: string;
  showToast?: boolean;
  logLevel?: 'error' | 'warning' | 'info';
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { toast } = useToast();
  const { 
    component = 'Unknown', 
    showToast = true, 
    logLevel = 'error' 
  } = options;

  const handleError = useCallback((
    error: Error | string,
    userMessage?: string,
    context?: Record<string, any>
  ) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const displayMessage = userMessage || errorMessage;

    // Log the error
    errorLogger.log(
      logLevel,
      `${errorMessage}${context ? ` | Context: ${JSON.stringify(context)}` : ''}`,
      component,
      error instanceof Error ? error : undefined
    );

    // Show toast notification
    if (showToast) {
      toast({
        title: logLevel === 'error' ? "Error" : logLevel === 'warning' ? "Warning" : "Info",
        description: displayMessage,
        variant: logLevel === 'error' ? "destructive" : "default",
      });
    }

    // In development, also throw to help with debugging
    if (process.env.NODE_ENV === 'development' && logLevel === 'error') {
      console.error(`[${component}] ${errorMessage}`, error, context);
    }
  }, [component, showToast, logLevel, toast]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    errorMessage?: string,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, errorMessage, context);
      return null;
    }
  }, [handleError]);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    errorMessage?: string
  ) => {
    return (...args: T): R | null => {
      try {
        return fn(...args);
      } catch (error) {
        handleError(error as Error, errorMessage);
        return null;
      }
    };
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    withErrorHandling,
  };
}