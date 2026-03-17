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

import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminPanel } from '@/components/panels/AdminPanel';
import { GuardianPanel } from '@/components/panels/GuardianPanel';
import { LivestockPanel } from '@/components/panels/LivestockPanel';
import { ReceiptPanel } from '@/components/panels/ReceiptPanel';
import AgentSwarmPanel from '@/components/panels/AgentSwarmPanel';
import { VoiceStudioPanel } from '@/components/panels/VoiceStudioPanel';
import { SharedSpendingPanel } from '@/components/panels/SharedSpendingPanel';
import { USBPanel } from '@/components/panels/USBPanel';

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
  | 'livestock'
  | 'receipts'
  | 'agent-swarm'
  | 'voice-studio'
  | 'shared-spending'
  | 'usb-hub';

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
              {activePanel === 'receipts' && <ReceiptPanel />}
              {activePanel === 'agent-swarm' && <AgentSwarmPanel />}
              {activePanel === 'voice-studio' && <VoiceStudioPanel />}
              {activePanel === 'shared-spending' && <SharedSpendingPanel />}
              {activePanel === 'usb-hub' && <USBPanel />}
            </div>

            {/* SEO Content for Search Engines — only shown to guests */}
            {!user && activePanel === 'chat' && (
              <section className="border-t border-border bg-card px-4 py-8 md:px-8 md:py-12">
                <div className="max-w-3xl mx-auto space-y-6">
                  <h2 className="text-lg md:text-xl font-bold text-foreground">What is CriderGPT?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    CriderGPT is a free AI assistant built for agriculture, welding, FFA, and practical trades. Created by Jessie Crider — FFA Historian 2025–2026 from Southwest Virginia — it combines real-world knowledge with AI to help farmers, students, and tradespeople get answers fast. From soil health calculators and crop rotation planners to welding rod guides and voltage drop calculators, CriderGPT has 30+ built-in tools designed for people who work with their hands.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    {[
                      { title: "AI Chat", desc: "Ask about farming, welding, or code" },
                      { title: "Calculators", desc: "Soil health, voltage, spray mix" },
                      { title: "FFA Tools", desc: "Record book, SAE logs, events" },
                      { title: "Livestock", desc: "Track animals, health records" },
                    ].map((f, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                        <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </main>
          
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
