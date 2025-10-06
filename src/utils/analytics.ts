// Google Analytics tracking utilities
export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your actual GA4 Measurement ID

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window === 'undefined') return;
  
  // Load gtag script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
  });

  console.log('📊 Google Analytics initialized');
};

// Track page views
export const trackPageView = (url: string, title: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title,
  });

  console.log('📊 Page view tracked:', url, title);
};

// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });

  console.log('📊 Event tracked:', { action, category, label, value });
};

// Track feature usage
export const trackFeatureUse = (featureName: string) => {
  trackEvent('feature_use', 'Features', featureName);
};

// Track calculator usage
export const trackCalculator = (calculatorType: string) => {
  trackEvent('calculator_use', 'Calculators', calculatorType);
};

// Track AI interactions
export const trackAIInteraction = (interactionType: string) => {
  trackEvent('ai_interaction', 'AI', interactionType);
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
