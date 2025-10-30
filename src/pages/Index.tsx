import React, { useState, useEffect } from 'react';
import { SEO } from '@/components/SEO';
import { trackPageView, trackFeatureUse } from '@/utils/analytics';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { Header } from '@/components/Header';
import { SystemChecker } from '@/components/SystemChecker';
import ChatPanel from '@/components/panels/ChatPanel';
import { CalculatorPanel } from '@/components/panels/CalculatorPanel';
import { CalendarPanel } from '@/components/panels/CalendarPanel';
import { VisionMemoryPanel } from '@/components/panels/VisionMemoryPanel';
import { InvoicePanel } from '@/components/panels/InvoicePanel';
import { FilesPanel } from '@/components/panels/FilesPanel';
import { GalleryPanel } from '@/components/panels/GalleryPanel';
import { CodePanel } from '@/components/panels/CodePanel';
import { MapBuilderPanel } from '@/components/panels/MapBuilderPanel';
import { MediaPanel } from '@/components/panels/MediaPanel';
import { ProjectPanel } from '@/components/panels/ProjectPanel';
import { ContactPanel } from '@/components/panels/ContactPanel';
import { ProfilePanel } from '@/components/panels/ProfilePanel';
import { SocialPanel } from '@/components/panels/SocialPanel';
import { PaymentPanel } from '@/components/panels/PaymentPanel';
import { ReviewsPanel } from '@/components/panels/ReviewsPanel';
import { UpdatesPanel } from '@/components/panels/UpdatesPanel';
import { TimelinePanel } from '@/components/panels/TimelinePanel';
import { MemorialPanel } from '@/components/panels/MemorialPanel';
import { FFAPanel } from '@/components/panels/FFAPanel';
import { RadioPanel } from '@/components/panels/RadioPanel';
import { AIImagePanel } from '@/components/panels/AIImagePanel';
import { DocumentAIPanel } from '@/components/panels/DocumentAIPanel';
import { PlanPanel } from '@/components/panels/PlanPanel';
import { AppConverterPanel } from '@/components/panels/AppConverterPanel';
import { CloudGamingPanel } from '@/components/panels/CloudGamingPanel';
import { Model3DConverterPanel } from '@/components/panels/Model3DConverterPanel';
import { StudioPanel } from '@/components/panels/StudioPanel';
import { ModToolsPanel } from '@/components/panels/ModToolsPanel';
import { ZipToExePanel } from '@/components/panels/ZipToExePanel';
import { Footer } from '@/components/Footer';
import FixxyBotTrigger from '@/components/FixxyBotTrigger';
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useAuth } from '@/contexts/AuthContext';

export type PanelType = 
  | 'chat' 
  | 'vision-memory'
  | 'calculators' 
  | 'calendar'
  | 'invoices'
  | 'files' 
  | 'gallery'
  | 'code' 
  | 'maps' 
  | 'media' 
  | 'projects' 
  | 'contact' 
  | 'profile' 
  | 'social' 
  | 'payment' 
  | 'reviews' 
  | 'updates' 
  | 'timeline' 
  | 'memorial' 
  | 'ffa'
  | 'mod-tools'
  | 'radio'
  | 'ai-image'
  | 'document-ai'
  | 'plan'
  | 'app-converter'
  | 'cloud-gaming'
  | '3d-converter'
  | 'studio'
  | 'zip-to-exe';

export default function Index() {
  const [activePanel, setActivePanel] = useState<PanelType>('chat');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { isSupported, permission } = useBrowserNotifications();
  const { user } = useAuth();
  
  const isDeveloper = user?.email === 'jessiecrider3@gmail.com';

  useEffect(() => {
    const savedPanel = localStorage.getItem('activePanel') as PanelType;
    if (savedPanel) {
      setActivePanel(savedPanel);
    }
  }, []);

  // Show notification permission modal after a short delay for new users
  useEffect(() => {
    if (isSupported && permission === 'default') {
      const hasShownModal = localStorage.getItem('notification-modal-shown');
      if (!hasShownModal) {
        const timer = setTimeout(() => {
          setShowNotificationModal(true);
          localStorage.setItem('notification-modal-shown', 'true');
        }, 3000); // Show after 3 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, permission]);

  const handlePanelChange = (panel: string) => {
    const panelType = panel as PanelType;
    setActivePanel(panelType);
    localStorage.setItem('activePanel', panelType);
    
    // Track page view and feature usage
    trackPageView(`/${panelType}`, `${panelType.charAt(0).toUpperCase() + panelType.slice(1)} | CriderGPT`);
    trackFeatureUse(panelType);
  };

  // Track initial page view
  useEffect(() => {
    trackPageView(`/${activePanel}`, `${activePanel.charAt(0).toUpperCase() + activePanel.slice(1)} | CriderGPT`);
  }, []);

  return (
    <>
      <SEO page={activePanel} />
      <div className="flex h-screen bg-background">
      <NavigationSidebar
        activeTab={activePanel}
        onTabChange={handlePanelChange}
        isDeveloper={isDeveloper}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <Header />
        
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full">
            {activePanel === 'chat' && <ChatPanel />}
            {activePanel === 'vision-memory' && <VisionMemoryPanel />}
            {activePanel === 'calculators' && <CalculatorPanel />}
            {activePanel === 'calendar' && <CalendarPanel />}
            {activePanel === 'invoices' && <InvoicePanel />}
            {activePanel === 'files' && <FilesPanel />}
            {activePanel === 'gallery' && <GalleryPanel />}
            {activePanel === 'code' && <CodePanel />}
            {activePanel === 'maps' && <MapBuilderPanel />}
            {activePanel === 'media' && <MediaPanel />}
            {activePanel === 'projects' && <ProjectPanel />}
            {activePanel === 'contact' && <ContactPanel />}
            {activePanel === 'profile' && <ProfilePanel />}
            {activePanel === 'social' && <SocialPanel />}
            {activePanel === 'payment' && <PaymentPanel />}
            {activePanel === 'reviews' && <ReviewsPanel />}
            {activePanel === 'updates' && <UpdatesPanel />}
            {activePanel === 'timeline' && <TimelinePanel />}
            {activePanel === 'memorial' && <MemorialPanel />}
            {activePanel === 'ffa' && <FFAPanel />}
            {activePanel === 'mod-tools' && <ModToolsPanel />}
            {activePanel === 'radio' && <RadioPanel />}
            {activePanel === 'ai-image' && <AIImagePanel />}
            {activePanel === 'document-ai' && <DocumentAIPanel />}
            {activePanel === 'plan' && <PlanPanel />}
            {activePanel === 'app-converter' && <AppConverterPanel />}
            {activePanel === 'cloud-gaming' && <CloudGamingPanel />}
            {activePanel === '3d-converter' && isDeveloper && <Model3DConverterPanel />}
            {activePanel === 'studio' && <StudioPanel />}
            {activePanel === 'zip-to-exe' && <ZipToExePanel />}
          </div>
        </main>
        <Footer />
      </div>
      <FixxyBotTrigger />
      
      <NotificationPermissionModal
        open={showNotificationModal}
        onOpenChange={setShowNotificationModal}
        onPermissionGranted={() => setShowNotificationModal(false)}
      />
      </div>
    </>
  );
}




