import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { trackPageView, trackFeatureUse } from '@/utils/analytics';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Header } from '@/components/Header';
import { SystemChecker } from '@/components/SystemChecker';
import { Footer } from '@/components/Footer';
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useIsMobile } from '@/hooks/use-mobile';
import { PanelLoadingFallback } from '@/components/panels/PanelLoadingFallback';

// Lazy-load all panels for faster initial page load
const ChatPanel = lazy(() => import('@/components/panels/ChatPanel'));
const CalculatorPanel = lazy(() => import('@/components/panels/CalculatorPanel').then(m => ({ default: m.CalculatorPanel })));
const CalendarPanel = lazy(() => import('@/components/panels/CalendarPanel').then(m => ({ default: m.CalendarPanel })));
const VisionMemoryPanel = lazy(() => import('@/components/panels/VisionMemoryPanel').then(m => ({ default: m.VisionMemoryPanel })));
const FilesPanel = lazy(() => import('@/components/panels/FilesPanel').then(m => ({ default: m.FilesPanel })));
const GalleryPanel = lazy(() => import('@/components/panels/GalleryPanel').then(m => ({ default: m.GalleryPanel })));
const CodePanel = lazy(() => import('@/components/panels/CodePanel').then(m => ({ default: m.CodePanel })));
const MapBuilderPanel = lazy(() => import('@/components/panels/MapBuilderPanel').then(m => ({ default: m.MapBuilderPanel })));
const MediaPanel = lazy(() => import('@/components/panels/MediaPanel').then(m => ({ default: m.MediaPanel })));
const ProjectPanel = lazy(() => import('@/components/panels/ProjectPanel').then(m => ({ default: m.ProjectPanel })));
const ContactPanel = lazy(() => import('@/components/panels/ContactPanel').then(m => ({ default: m.ContactPanel })));
const ProfilePanel = lazy(() => import('@/components/panels/ProfilePanel').then(m => ({ default: m.ProfilePanel })));
const PaymentPanel = lazy(() => import('@/components/panels/PaymentPanel').then(m => ({ default: m.PaymentPanel })));
const UpdatesPanel = lazy(() => import('@/components/panels/UpdatesPanel').then(m => ({ default: m.UpdatesPanel })));
const TimelinePanel = lazy(() => import('@/components/panels/TimelinePanel').then(m => ({ default: m.TimelinePanel })));
const MemorialPanel = lazy(() => import('@/components/panels/MemorialPanel').then(m => ({ default: m.MemorialPanel })));
const FFAPanel = lazy(() => import('@/components/panels/FFAPanel').then(m => ({ default: m.FFAPanel })));
const AIImagePanel = lazy(() => import('@/components/panels/AIImagePanel').then(m => ({ default: m.AIImagePanel })));
const DocumentAIPanel = lazy(() => import('@/components/panels/DocumentAIPanel').then(m => ({ default: m.DocumentAIPanel })));
const PlanPanel = lazy(() => import('@/components/panels/PlanPanel').then(m => ({ default: m.PlanPanel })));
const AppConverterPanel = lazy(() => import('@/components/panels/AppConverterPanel').then(m => ({ default: m.AppConverterPanel })));
const CloudGamingPanel = lazy(() => import('@/components/panels/CloudGamingPanel').then(m => ({ default: m.CloudGamingPanel })));
const Model3DConverterPanel = lazy(() => import('@/components/panels/Model3DConverterPanel').then(m => ({ default: m.Model3DConverterPanel })));
const StudioPanel = lazy(() => import('@/components/panels/StudioPanel').then(m => ({ default: m.StudioPanel })));
const ModToolsPanel = lazy(() => import('@/components/panels/ModToolsPanel').then(m => ({ default: m.ModToolsPanel })));
const ZipToExePanel = lazy(() => import('@/components/panels/ZipToExePanel').then(m => ({ default: m.ZipToExePanel })));
const CodeEditorPanel = lazy(() => import('@/components/panels/CodeEditorPanel').then(m => ({ default: m.CodeEditorPanel })));
const AdminPanel = lazy(() => import('@/components/panels/AdminPanel').then(m => ({ default: m.AdminPanel })));
const GuardianPanel = lazy(() => import('@/components/panels/GuardianPanel').then(m => ({ default: m.GuardianPanel })));
const LivestockPanel = lazy(() => import('@/components/panels/LivestockPanel').then(m => ({ default: m.LivestockPanel })));
const ReceiptPanel = lazy(() => import('@/components/panels/ReceiptPanel').then(m => ({ default: m.ReceiptPanel })));
const AgentSwarmPanel = lazy(() => import('@/components/panels/AgentSwarmPanel'));
const VoiceStudioPanel = lazy(() => import('@/components/panels/VoiceStudioPanel').then(m => ({ default: m.VoiceStudioPanel })));
const SharedSpendingPanel = lazy(() => import('@/components/panels/SharedSpendingPanel').then(m => ({ default: m.SharedSpendingPanel })));
const USBPanel = lazy(() => import('@/components/panels/USBPanel').then(m => ({ default: m.USBPanel })));
const RDR2GuidePanel = lazy(() => import('@/components/panels/RDR2GuidePanel').then(m => ({ default: m.RDR2GuidePanel })));
const SensorPanel = lazy(() => import('@/components/panels/SensorPanel').then(m => ({ default: m.SensorPanel })));
const FrequencyPanel = lazy(() => import('@/components/panels/FrequencyPanel').then(m => ({ default: m.FrequencyPanel })));
const TexturesPanel = lazy(() => import('@/components/panels/TexturesPanel').then(m => ({ default: m.TexturesPanel })));

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
  | 'usb-hub'
  | 'rdr2-guide'
  | 'sensors'
  | 'frequency'
  | 'textures';

// Set of valid panel slugs (kept in sync with PanelType + livestockID alias)
const VALID_PANELS = new Set<string>([
  'chat','vision-memory','calculators','calendar','files','gallery','code','maps','media',
  'projects','contact','profile','payment','updates','timeline','memorial','ffa','mod-tools',
  'ai-image','document-ai','plan','app-converter','cloud-gaming','3d-converter','studio',
  'zip-to-exe','code-editor','admin','guardian','livestock','livestockID','receipts',
  'agent-swarm','voice-studio','shared-spending','usb-hub','rdr2-guide','sensors','frequency','textures'
]);

// Map URL slug → internal panel id
const slugToPanel = (slug?: string): PanelType => {
  if (!slug) return 'chat';
  if (slug === 'livestockID') return 'livestock';
  return (VALID_PANELS.has(slug) ? slug : 'chat') as PanelType;
};

// Map internal panel id → URL slug
const panelToSlug = (panel: PanelType): string => {
  if (panel === 'livestock') return 'livestockID';
  return panel;
};

export default function Index() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<PanelType>(() => slugToPanel(tab));
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isSupported, permission } = useBrowserNotifications();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  
  // Developer access based on admin role or specific email
  const isDeveloper = isAdmin || user?.email === 'jessiecrider3@gmail.com';

  // Sync URL → state (handles browser back/forward + direct deep links)
  useEffect(() => {
    const next = slugToPanel(tab);
    setActivePanel(next);
    localStorage.setItem('activePanel', next);
  }, [tab]);

  // Show notification permission modal after a short delay for new users
  useEffect(() => {
    if (isSupported && permission === 'default') {
      const hasShownModal = localStorage.getItem('notification-modal-shown');
      if (!hasShownModal) {
        const timer = setTimeout(() => {
          setShowNotificationModal(true);
          localStorage.setItem('notification-modal-shown', 'true');
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, permission]);

  const handlePanelChange = (panel: string) => {
    const panelType = panel as PanelType;
    const slug = panelToSlug(panelType);
    // Push to URL — the useEffect above will update state
    navigate(slug === 'chat' ? '/' : `/${slug}`);
    
    // Track page view and feature usage
    trackPageView(`/${slug}`, `${panelType.charAt(0).toUpperCase() + panelType.slice(1)} | CriderGPT`);
    trackFeatureUse(panelType);
  };

  // Track initial page view
  useEffect(() => {
    trackPageView(`/${panelToSlug(activePanel)}`, `${activePanel.charAt(0).toUpperCase() + activePanel.slice(1)} | CriderGPT`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPanel = () => {
    switch (activePanel) {
      case 'chat': return <ChatPanel />;
      case 'vision-memory': return <VisionMemoryPanel />;
      case 'calculators': return <CalculatorPanel />;
      case 'calendar': return <CalendarPanel />;
      case 'files': return <FilesPanel />;
      case 'gallery': return <GalleryPanel />;
      case 'code': return <CodePanel />;
      case 'maps': return <MapBuilderPanel />;
      case 'media': return <MediaPanel />;
      case 'projects': return <ProjectPanel />;
      case 'contact': return <ContactPanel />;
      case 'profile': return <ProfilePanel />;
      case 'payment': return <PaymentPanel />;
      case 'updates': return <UpdatesPanel />;
      case 'timeline': return <TimelinePanel />;
      case 'memorial': return <MemorialPanel />;
      case 'ffa': return <FFAPanel />;
      case 'mod-tools': return <ModToolsPanel />;
      case 'ai-image': return <AIImagePanel />;
      case 'document-ai': return <DocumentAIPanel />;
      case 'plan': return <PlanPanel />;
      case 'app-converter': return <AppConverterPanel />;
      case 'cloud-gaming': return <CloudGamingPanel />;
      case '3d-converter': return isDeveloper ? <Model3DConverterPanel /> : null;
      case 'studio': return <StudioPanel />;
      case 'zip-to-exe': return <ZipToExePanel />;
      case 'code-editor': return <CodeEditorPanel />;
      case 'admin': return isAdmin ? <AdminPanel /> : null;
      case 'guardian': return <GuardianPanel />;
      case 'livestock': return <LivestockPanel />;
      case 'receipts': return <ReceiptPanel />;
      case 'agent-swarm': return <AgentSwarmPanel />;
      case 'voice-studio': return <VoiceStudioPanel />;
      case 'shared-spending': return <SharedSpendingPanel />;
      case 'usb-hub': return <USBPanel />;
      case 'rdr2-guide': return <RDR2GuidePanel />;
      case 'sensors': return <SensorPanel />;
      case 'frequency': return <FrequencyPanel />;
      case 'textures': return <TexturesPanel />;
      default: return <ChatPanel />;
    }
  };

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
              <Suspense fallback={<PanelLoadingFallback />}>
                {renderPanel()}
              </Suspense>
            </div>

            {/* SEO Content for Search Engines — only shown to guests */}
            {!user && activePanel === 'chat' && (
              <section className="border-t border-border bg-card px-4 py-8 md:px-8 md:py-12">
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="space-y-3">
                    <h2 className="text-lg md:text-xl font-bold text-foreground">What is CriderGPT?</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      CriderGPT is a free AI assistant built for agriculture, welding, FFA, and practical trades. Created by Jessie Crider — FFA Historian 2025–2026 from Southwest Virginia — it combines real-world knowledge with AI to help farmers, students, and tradespeople get answers fast. From soil health calculators and crop rotation planners to welding rod guides and voltage drop calculators, CriderGPT has 30+ built-in tools designed for people who work with their hands.
                    </p>
                  </div>

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

                  <div className="space-y-3">
                    <h2 className="text-lg md:text-xl font-bold text-foreground">Who is CriderGPT for?</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Whether you're an FFA member working on your SAE project, a farmer planning crop rotations, a welder comparing rod types, or a student who needs homework help — CriderGPT is your free AI partner. It also includes livestock management, receipt scanning, a frequency generator, shared spending tracker, and even an RDR2 game guide.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-lg md:text-xl font-bold text-foreground">CriderGPT on Snapchat</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Follow <strong className="text-foreground">@cridergpt_lense</strong> on Snapchat for AR lenses and filters. Our lenses have reached over 105,000 users — try the Vibe Check Bot, Soft Glow Up, Desert Drive, and more. Jessie Crider is a verified Snapchat developer building AR experiences through Lens Studio.
                    </p>
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
