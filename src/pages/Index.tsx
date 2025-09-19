
import React, { useState, useEffect } from 'react';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { Header } from '@/components/Header';
import { StatusPanel } from '@/components/panels/StatusPanel';
import { SystemChecker } from '@/components/SystemChecker';
import ChatPanel from '@/components/panels/ChatPanel';
import { CalculatorPanel } from '@/components/panels/CalculatorPanel';
import { InvoicePanel } from '@/components/panels/InvoicePanel';
import { FilesPanel } from '@/components/panels/FilesPanel';
import { GalleryPanel } from '@/components/panels/GalleryPanel';
import { CodePanel } from '@/components/panels/CodePanel';
import { TTSPanel } from '@/components/panels/TTSPanel';
import { APIPanel } from '@/components/panels/APIPanel';
import { MapBuilderPanel } from '@/components/panels/MapBuilderPanel';
import { GoogleSheetsPanel } from '@/components/panels/GoogleSheetsPanel';
import { MediaPanel } from '@/components/panels/MediaPanel';
import { UsagePanel } from '@/components/panels/UsagePanel';
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

export type PanelType = 
  | 'status' 
  | 'chat' 
  | 'calculators' 
  | 'invoices'
  | 'files' 
  | 'gallery'
  | 'code' 
  | 'tts' 
  | 'api' 
  | 'maps' 
  | 'sheets' 
  | 'media' 
  | 'usage' 
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
  | 'radio'
  | 'ai-image'
  | 'document-ai'
  | 'plan';

export default function Index() {
  const [activePanel, setActivePanel] = useState<PanelType>('status');

  useEffect(() => {
    const savedPanel = localStorage.getItem('activePanel') as PanelType;
    if (savedPanel) {
      setActivePanel(savedPanel);
    }
  }, []);

  const handlePanelChange = (panel: string) => {
    const panelType = panel as PanelType;
    setActivePanel(panelType);
    localStorage.setItem('activePanel', panelType);
  };

  return (
    <div className="flex h-screen bg-background">
      <NavigationSidebar
        activeTab={activePanel}
        onTabChange={handlePanelChange}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <Header />
        
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full">
            {activePanel === 'status' && (
              <div className="p-6 space-y-6">
                <StatusPanel />
                <SystemChecker />
              </div>
            )}
            {activePanel === 'chat' && <ChatPanel />}
            {activePanel === 'calculators' && <CalculatorPanel />}
            {activePanel === 'invoices' && <InvoicePanel />}
            {activePanel === 'files' && <FilesPanel />}
            {activePanel === 'gallery' && <GalleryPanel />}
            {activePanel === 'code' && <CodePanel />}
            {activePanel === 'tts' && <TTSPanel />}
            {activePanel === 'api' && <APIPanel />}
            {activePanel === 'maps' && <MapBuilderPanel />}
            {activePanel === 'sheets' && <GoogleSheetsPanel />}
            {activePanel === 'media' && <MediaPanel />}
            {activePanel === 'usage' && <UsagePanel />}
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
            {activePanel === 'radio' && <RadioPanel />}
            {activePanel === 'ai-image' && <AIImagePanel />}
            {activePanel === 'document-ai' && <DocumentAIPanel />}
            {activePanel === 'plan' && <PlanPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}
