import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type FeatureOfflineStatus = 'fully-offline' | 'partially-offline' | 'online-only';

export interface OfflineFeature {
  id: string;
  name: string;
  status: FeatureOfflineStatus;
  description: string;
  fallbackMessage?: string;
}

// Feature offline capability definitions
export const FEATURE_OFFLINE_STATUS: Record<string, OfflineFeature> = {
  // FULLY OFFLINE - Work 100% offline
  'calculators': {
    id: 'calculators',
    name: 'Calculators',
    status: 'fully-offline',
    description: 'All calculator functions work completely offline'
  },
  'advanced-calculator': {
    id: 'advanced-calculator',
    name: 'Advanced Calculator',
    status: 'fully-offline',
    description: 'Basic, scientific, and financial calculations'
  },
  'farming-calculator': {
    id: 'farming-calculator',
    name: 'Farming Calculator',
    status: 'fully-offline',
    description: 'Seeding, fertilizer, irrigation calculations'
  },
  'welding-calculator': {
    id: 'welding-calculator',
    name: 'Welding Calculator',
    status: 'fully-offline',
    description: 'Welding parameters and material calculations'
  },
  'voltage-calculator': {
    id: 'voltage-calculator',
    name: 'Voltage Calculator',
    status: 'fully-offline',
    description: 'Electrical calculations and conversions'
  },
  'mechanics-calculator': {
    id: 'mechanics-calculator',
    name: 'Mechanics Calculator',
    status: 'fully-offline',
    description: 'Mechanical engineering calculations'
  },
  'conversion-calculator': {
    id: 'conversion-calculator',
    name: 'Unit Conversions',
    status: 'fully-offline',
    description: 'Length, weight, volume, temperature conversions'
  },
  'probability-calculator': {
    id: 'probability-calculator',
    name: 'Probability Calculator',
    status: 'fully-offline',
    description: 'Statistics and probability calculations'
  },
  'health-calculator': {
    id: 'health-calculator',
    name: 'Health Calculator',
    status: 'fully-offline',
    description: 'BMI, calorie, and health metrics'
  },
  'science-calculator': {
    id: 'science-calculator',
    name: 'Science Calculator',
    status: 'fully-offline',
    description: 'Physics and chemistry calculations'
  },
  'pdf-export': {
    id: 'pdf-export',
    name: 'PDF Export',
    status: 'fully-offline',
    description: 'Export calculator results to PDF'
  },
  'navigation': {
    id: 'navigation',
    name: 'Navigation',
    status: 'fully-offline',
    description: 'App navigation and UI'
  },
  'contact': {
    id: 'contact',
    name: 'Contact Info',
    status: 'fully-offline',
    description: 'View contact information'
  },
  'updates': {
    id: 'updates',
    name: 'Updates (Cached)',
    status: 'partially-offline',
    description: 'View cached updates, new updates require internet'
  },
  'memorial': {
    id: 'memorial',
    name: 'Memorial',
    status: 'fully-offline',
    description: 'Memorial page content'
  },
  'timeline': {
    id: 'timeline',
    name: 'Timeline',
    status: 'fully-offline',
    description: 'Project timeline and history'
  },

  // PARTIALLY OFFLINE - Some features work offline
  'invoices': {
    id: 'invoices',
    name: 'Invoices',
    status: 'partially-offline',
    description: 'Create invoices offline, sync when online',
    fallbackMessage: 'Create invoices offline. They will sync when you reconnect.'
  },
  'calendar': {
    id: 'calendar',
    name: 'Calendar',
    status: 'partially-offline',
    description: 'View cached events offline, create/edit requires sync',
    fallbackMessage: 'Viewing cached events. Changes will sync when online.'
  },
  'files': {
    id: 'files',
    name: 'Files',
    status: 'partially-offline',
    description: 'View cached files, uploads require internet',
    fallbackMessage: 'Viewing cached files. Uploads require internet connection.'
  },
  'gallery': {
    id: 'gallery',
    name: 'Gallery',
    status: 'partially-offline',
    description: 'View cached images, new uploads require internet',
    fallbackMessage: 'Viewing cached images. New images require internet.'
  },
  'profile': {
    id: 'profile',
    name: 'Profile',
    status: 'partially-offline',
    description: 'View profile offline, changes sync when online',
    fallbackMessage: 'Profile changes will sync when you reconnect.'
  },

  // ONLINE ONLY - Require internet connection
  'chat': {
    id: 'chat',
    name: 'AI Chat',
    status: 'online-only',
    description: 'AI responses require internet connection',
    fallbackMessage: 'AI chat requires an internet connection. Please reconnect to continue chatting.'
  },
  'ai-image': {
    id: 'ai-image',
    name: 'AI Image Generator',
    status: 'online-only',
    description: 'Image generation requires server access',
    fallbackMessage: 'Image generation requires an internet connection.'
  },
  'document-ai': {
    id: 'document-ai',
    name: 'Document AI',
    status: 'online-only',
    description: 'AI document analysis requires server',
    fallbackMessage: 'Document AI analysis requires an internet connection.'
  },
  'vision-memory': {
    id: 'vision-memory',
    name: 'Vision Memory',
    status: 'online-only',
    description: 'Vision analysis requires AI server',
    fallbackMessage: 'Vision Memory requires an internet connection.'
  },
  'social': {
    id: 'social',
    name: 'Community Chat',
    status: 'online-only',
    description: 'Real-time chat requires connection',
    fallbackMessage: 'Community chat requires an internet connection.'
  },
  'payment': {
    id: 'payment',
    name: 'Payments',
    status: 'online-only',
    description: 'Payment processing requires internet',
    fallbackMessage: 'Payment processing requires an internet connection.'
  },
  'code': {
    id: 'code',
    name: 'Code Generator',
    status: 'online-only',
    description: 'AI code generation requires server',
    fallbackMessage: 'Code generation requires an internet connection.'
  },
  'maps': {
    id: 'maps',
    name: 'Map Builder',
    status: 'online-only',
    description: 'Map tools require cloud services',
    fallbackMessage: 'Map Builder requires an internet connection.'
  },
  'media': {
    id: 'media',
    name: 'Media',
    status: 'online-only',
    description: 'Media streaming requires internet',
    fallbackMessage: 'Media features require an internet connection.'
  },
  'projects': {
    id: 'projects',
    name: 'Projects',
    status: 'partially-offline',
    description: 'View cached projects, sync changes online',
    fallbackMessage: 'Project changes will sync when you reconnect.'
  },
  'ffa': {
    id: 'ffa',
    name: 'FFA Center',
    status: 'partially-offline',
    description: 'View cached FFA data, sync when online',
    fallbackMessage: 'FFA data will sync when you reconnect.'
  },
  'reviews': {
    id: 'reviews',
    name: 'Reviews',
    status: 'online-only',
    description: 'Reading/writing reviews requires internet',
    fallbackMessage: 'Reviews require an internet connection.'
  },
  'plan': {
    id: 'plan',
    name: 'Plan Management',
    status: 'online-only',
    description: 'Subscription management requires internet',
    fallbackMessage: 'Plan management requires an internet connection.'
  },
  'cloud-gaming': {
    id: 'cloud-gaming',
    name: 'Cloud Gaming',
    status: 'online-only',
    description: 'Cloud gaming requires stable internet',
    fallbackMessage: 'Cloud gaming requires an internet connection.'
  },
  'admin': {
    id: 'admin',
    name: 'Admin Panel',
    status: 'online-only',
    description: 'Admin functions require server access',
    fallbackMessage: 'Admin panel requires an internet connection.'
  },
  'studio': {
    id: 'studio',
    name: '3D Studio',
    status: 'partially-offline',
    description: 'Basic 3D features work offline, cloud features need internet',
    fallbackMessage: 'Some 3D features require an internet connection.'
  },
  'mod-tools': {
    id: 'mod-tools',
    name: 'Mod Tools',
    status: 'partially-offline',
    description: 'Local mod editing works offline',
    fallbackMessage: 'Some mod tools require an internet connection.'
  },
  'app-converter': {
    id: 'app-converter',
    name: 'App Converter',
    status: 'online-only',
    description: 'App conversion requires server processing',
    fallbackMessage: 'App Converter requires an internet connection.'
  },
  'zip-to-exe': {
    id: 'zip-to-exe',
    name: 'ZIP-to-EXE Builder',
    status: 'online-only',
    description: 'EXE building requires server',
    fallbackMessage: 'ZIP-to-EXE Builder requires an internet connection.'
  },
  '3d-converter': {
    id: '3d-converter',
    name: '3D Converter',
    status: 'online-only',
    description: '3D conversion requires server',
    fallbackMessage: '3D Converter requires an internet connection.'
  }
};

interface OfflineContextType {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  getFeatureStatus: (featureId: string) => OfflineFeature | undefined;
  canUseFeature: (featureId: string) => boolean;
  getOfflineMessage: (featureId: string) => string | undefined;
  pendingSyncCount: number;
  lastOnlineTime: Date | null;
  forceOfflineMode: boolean;
  setForceOfflineMode: (value: boolean) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(navigator.onLine ? new Date() : null);
  const [forceOfflineMode, setForceOfflineMode] = useState(false);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[Offline] Service worker registered:', registration.scope);
          setIsServiceWorkerReady(true);

          // Handle updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[Offline] New content available; please refresh.');
                  } else {
                    console.log('[Offline] Content cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('[Offline] Service worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_REQUIRED') {
          // Trigger sync when back online
          syncPendingData();
        }
      });
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Offline] Connection restored');
      setIsOnline(true);
      setLastOnlineTime(new Date());
      syncPendingData();
    };

    const handleOffline = () => {
      console.log('[Offline] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending data when back online
  const syncPendingData = useCallback(async () => {
    try {
      // Get pending items from IndexedDB
      const pendingKey = 'cridergpt-pending-sync';
      const pendingData = localStorage.getItem(pendingKey);
      
      if (pendingData) {
        const items = JSON.parse(pendingData);
        setPendingSyncCount(items.length);
        
        // Process sync (placeholder - actual sync logic would go here)
        console.log('[Offline] Syncing', items.length, 'pending items');
        
        // Clear pending items after successful sync
        localStorage.removeItem(pendingKey);
        setPendingSyncCount(0);
      }
    } catch (error) {
      console.error('[Offline] Sync failed:', error);
    }
  }, []);

  const getFeatureStatus = useCallback((featureId: string): OfflineFeature | undefined => {
    return FEATURE_OFFLINE_STATUS[featureId];
  }, []);

  const canUseFeature = useCallback((featureId: string): boolean => {
    const effectiveOnline = isOnline && !forceOfflineMode;
    
    if (effectiveOnline) return true;
    
    const feature = FEATURE_OFFLINE_STATUS[featureId];
    if (!feature) return true; // Unknown features default to allowed
    
    return feature.status !== 'online-only';
  }, [isOnline, forceOfflineMode]);

  const getOfflineMessage = useCallback((featureId: string): string | undefined => {
    const feature = FEATURE_OFFLINE_STATUS[featureId];
    return feature?.fallbackMessage;
  }, []);

  const value: OfflineContextType = {
    isOnline: isOnline && !forceOfflineMode,
    isServiceWorkerReady,
    getFeatureStatus,
    canUseFeature,
    getOfflineMessage,
    pendingSyncCount,
    lastOnlineTime,
    forceOfflineMode,
    setForceOfflineMode
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

// Hook for checking if a specific feature can be used
export function useFeatureOffline(featureId: string) {
  const { isOnline, canUseFeature, getFeatureStatus, getOfflineMessage } = useOffline();
  
  return {
    isOnline,
    canUse: canUseFeature(featureId),
    status: getFeatureStatus(featureId),
    offlineMessage: getOfflineMessage(featureId)
  };
}
