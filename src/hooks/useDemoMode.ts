import { useState, useEffect } from 'react';

interface DemoUsage {
  messagesUsed: number;
  maxMessages: number;
  isExhausted: boolean;
  sessionId: string;
}

export function useDemoMode() {
  const [demoUsage, setDemoUsage] = useState<DemoUsage>({
    messagesUsed: 0,
    maxMessages: 5,
    isExhausted: false,
    sessionId: ''
  });

  const generateSessionId = () => {
    return 'demo_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  const loadDemoUsage = () => {
    try {
      const stored = localStorage.getItem('cridergpt_demo_usage');
      if (stored) {
        const parsed = JSON.parse(stored);
        setDemoUsage({
          messagesUsed: parsed.messagesUsed || 0,
          maxMessages: 5,
          isExhausted: parsed.messagesUsed >= 5,
          sessionId: parsed.sessionId || generateSessionId()
        });
      } else {
        const newSessionId = generateSessionId();
        setDemoUsage({
          messagesUsed: 0,
          maxMessages: 5,
          isExhausted: false,
          sessionId: newSessionId
        });
      }
    } catch (error) {
      console.error('Error loading demo usage:', error);
      const newSessionId = generateSessionId();
      setDemoUsage({
        messagesUsed: 0,
        maxMessages: 5,
        isExhausted: false,
        sessionId: newSessionId
      });
    }
  };

  const incrementDemoUsage = () => {
    const newUsage = {
      ...demoUsage,
      messagesUsed: demoUsage.messagesUsed + 1,
      isExhausted: (demoUsage.messagesUsed + 1) >= demoUsage.maxMessages
    };
    
    setDemoUsage(newUsage);
    
    try {
      localStorage.setItem('cridergpt_demo_usage', JSON.stringify(newUsage));
    } catch (error) {
      console.error('Error saving demo usage:', error);
    }
    
    return newUsage;
  };

  const canSendMessage = () => {
    return demoUsage.messagesUsed < demoUsage.maxMessages;
  };

  const resetDemoUsage = () => {
    const newSessionId = generateSessionId();
    const resetUsage = {
      messagesUsed: 0,
      maxMessages: 5,
      isExhausted: false,
      sessionId: newSessionId
    };
    
    setDemoUsage(resetUsage);
    
    try {
      localStorage.removeItem('cridergpt_demo_usage');
    } catch (error) {
      console.error('Error clearing demo usage:', error);
    }
  };

  useEffect(() => {
    loadDemoUsage();
  }, []);

  return {
    demoUsage,
    canSendMessage,
    incrementDemoUsage,
    resetDemoUsage
  };
}