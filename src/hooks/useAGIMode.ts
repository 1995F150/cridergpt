import { useState, useCallback } from 'react';

const AGI_MODE_KEY = 'cridergpt-agi-mode';

export function useAGIMode() {
  const [isAGIMode, setIsAGIMode] = useState(() => {
    try {
      return localStorage.getItem(AGI_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleAGIMode = useCallback(() => {
    setIsAGIMode(prev => {
      const next = !prev;
      try { localStorage.setItem(AGI_MODE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const setAGIMode = useCallback((enabled: boolean) => {
    setIsAGIMode(enabled);
    try { localStorage.setItem(AGI_MODE_KEY, String(enabled)); } catch {}
  }, []);

  return { isAGIMode, toggleAGIMode, setAGIMode };
}
