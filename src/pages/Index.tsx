import React, { useState, useEffect } from 'react';
import { SEO } from '@/components/SEO';
import { trackPageView, trackFeatureUse } from '@/utils/analytics';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Header } from '@/components/Header';
import { SystemChecker } from '@/components/SystemChecker';
import ChatPanel from '@/components/panels/ChatPanel';
import { CalculatorPanel } from '@/components/panels/CalculatorPanel';
import { CalendarPanel } from '@/components/panels/CalendarPanel';
import { VisionMemoryPanel } from '@/components/panels/VisionMemoryPanel';
import { FilesPanel } from '@/components/panels/FilesPanel';
import { GalleryPanel } from '@/components/panels/GalleryPanel';
import { CodePanel } from '@/components/panels/CodePanel';
import { MapBuilderPanel } from '@/components/panels/MapBuilderPanel';
import { MediaPanel } from '@/components/panels/MediaPanel';
import { ProjectPanel } from '@/components/panels/ProjectPanel';
import { ContactPanel } from '@/components/panels/ContactPanel';
import { ProfilePanel } from '@/components/panels/ProfilePanel';
import { PaymentPanel } from '@/components/panels/PaymentPanel';
import { UpdatesPanel } from '@/components/panels/UpdatesPanel';
import { TimelinePanel } from '@/components/panels/TimelinePanel';
import { MemorialPanel } from '@/components/panels/MemorialPanel';
import { FFAPanel } from '@/components/panels/FFAPanel';
import { AIImagePanel } from '@/components/panels/AIImagePanel';
import { DocumentAIPanel } from '@/components/panels/DocumentAIPanel';
import { PlanPanel } from '@/components/panels/PlanPanel';
import { AppConverterPanel } from '@/components/panels/AppConverterPanel';
import { CloudGamingPanel } from '@/components/panels/CloudGamingPanel';
import { Model3DConverterPanel } from '@/components/panels/Model3DConverterPanel';
import { StudioPanel } from '@/components/panels/StudioPanel';
import { ModToolsPanel } from '@/components/panels/ModToolsPanel';
import { ZipToExePanel } from '@/components/panels/ZipToExePanel';
import { CodeEditorPanel } from '@/components/panels/CodeEditorPanel';
import { Footer } from '@/components/Footer';
import { AdsterraBanner } from '@/components/AdsterraBanner';
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminPanel } from '@/components/panels/AdminPanel';
import { GuardianPanel } from '@/components/panels/GuardianPanel';
import { LivestockPanel } from '@/components/panels/LivestockPanel';

export type PanelType = 
  | 'chat' 
  | 'vision-memory'
  | 'calculators' 
  | 'calendar'
  | 'files' 
  | 'gallery'
  | 'code' 
  | 'maps' 
  | 'media' 
  | 'projects' 
  | 'contact' 
  | 'profile' 
  | 'payment' 
  | 'updates' 
  | 'timeline' 
  | 'memorial' 
  | 'ffa'
  | 'mod-tools'
  | 'ai-image'
  | 'document-ai'
  | 'plan'
  | 'app-converter'
  | 'cloud-gaming'
  | '3d-converter'
  | 'studio'
  | 'zip-to-exe'
  | 'code-editor'
  | 'admin'
  | 'guardian'
  | 'livestock';

export default function Index() {
  const [activePanel, setActivePanel] = useState<PanelType>('chat');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isSupported, permission } = useBrowserNotifications();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  
  // Developer access based on admin role or specific email
  const isDeveloper = isAdmin || user?.email === 'jessiecrider3@gmail.com';

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
        {/* Desktop Navigation Sidebar - hidden on mobile */}
        {!isMobile && (
          <NavigationSidebar
            activeTab={activePanel}
            onTabChange={handlePanelChange}
            isDeveloper={isDeveloper}
          />
        )}

        {/* Mobile Navigation Sheet */}
        <MobileNavigation
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          activeTab={activePanel}
          onTabChange={handlePanelChange}
          isDeveloper={isDeveloper}
        />

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <Header 
            onMobileMenuClick={() => setMobileNavOpen(true)}
            isMobile={isMobile}
          />
          
          <main className="flex-1 overflow-auto bg-background">
            <div className="h-full">
              {activePanel === 'chat' && <ChatPanel />}
              {activePanel === 'vision-memory' && <VisionMemoryPanel />}
              {activePanel === 'calculators' && <CalculatorPanel />}
              {activePanel === 'calendar' && <CalendarPanel />}
              {activePanel === 'files' && <FilesPanel />}
              {activePanel === 'gallery' && <GalleryPanel />}
              {activePanel === 'code' && <CodePanel />}
              {activePanel === 'maps' && <MapBuilderPanel />}
              {activePanel === 'media' && <MediaPanel />}
              {activePanel === 'projects' && <ProjectPanel />}
              {activePanel === 'contact' && <ContactPanel />}
              {activePanel === 'profile' && <ProfilePanel />}
              {activePanel === 'payment' && <PaymentPanel />}
              {activePanel === 'updates' && <UpdatesPanel />}
              {activePanel === 'timeline' && <TimelinePanel />}
              {activePanel === 'memorial' && <MemorialPanel />}
              {activePanel === 'ffa' && <FFAPanel />}
              {activePanel === 'mod-tools' && <ModToolsPanel />}
              {activePanel === 'ai-image' && <AIImagePanel />}
              {activePanel === 'document-ai' && <DocumentAIPanel />}
              {activePanel === 'plan' && <PlanPanel />}
              {activePanel === 'app-converter' && <AppConverterPanel />}
              {activePanel === 'cloud-gaming' && <CloudGamingPanel />}
              {activePanel === '3d-converter' && isDeveloper && <Model3DConverterPanel />}
              {activePanel === 'studio' && <StudioPanel />}
              {activePanel === 'zip-to-exe' && <ZipToExePanel />}
              {activePanel === 'code-editor' && <CodeEditorPanel />}
              {activePanel === 'admin' && isAdmin && <AdminPanel />}
              {activePanel === 'guardian' && <GuardianPanel />}
              {activePanel === 'livestock' && <LivestockPanel />}
            </div>
          </main>
          <AdsterraBanner />
          <Footer />
        </div>
        
        <NotificationPermissionModal
          open={showNotificationModal}
          onOpenChange={setShowNotificationModal}
          onPermissionGranted={() => setShowNotificationModal(false)}
        />
      </div>
    </>
  );
}
