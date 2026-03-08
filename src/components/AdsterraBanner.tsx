import { useEffect, useRef } from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export function AdsterraBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const { plan, isActive } = useSubscriptionStatus();

  useEffect(() => {
    if (scriptLoaded.current || !containerRef.current || isActive) return;
    scriptLoaded.current = true;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://lentattire.com/0db409f9b28e67b2c5eb854b55bb35c8/invoke.js';
    
    containerRef.current.parentElement?.appendChild(script);

    return () => {
      script.remove();
    };
  }, [isActive]);

  // Hide ads for paid users (plus, pro, lifetime)
  if (isActive) return null;

  return (
    <div className="w-full flex justify-center py-1 bg-background">
      <div
        id="container-0db409f9b28e67b2c5eb854b55bb35c8"
        ref={containerRef}
        className="w-full max-w-4xl min-h-[50px]"
      />
    </div>
  );
}
