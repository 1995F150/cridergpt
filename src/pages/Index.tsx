
import React, { useState, useEffect } from 'react';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { Header } from '@/components/Header';
import { StatusPanel } from '@/components/panels/StatusPanel';
import { ChatPanel } from '@/components/panels/ChatPanel';
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
import { PricingPanel } from '@/components/panels/PricingPanel';
import { PaymentPanel } from '@/components/panels/PaymentPanel';
import { ReviewsPanel } from '@/components/panels/ReviewsPanel';
import { UpdatesPanel } from '@/components/panels/UpdatesPanel';
import { TimelinePanel } from '@/components/panels/TimelinePanel';
import { MemorialPanel } from '@/components/panels/MemorialPanel';
import { PlanPanel } from '@/components/panels/PlanPanel';
import { 
  Activity, 
  MessageSquare, 
  Calculator, 
  FileText, 
  Images,
  Code, 
  Volume2, 
  Zap, 
  Map, 
  Sheet, 
  Play, 
  BarChart3, 
  Folder, 
  Mail, 
  User, 
  CreditCard, 
  DollarSign, 
  Star, 
  Bell, 
  Clock, 
  Heart, 
  Layers 
} from 'lucide-react';

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
  | 'pricing' 
  | 'payment' 
  | 'reviews' 
  | 'updates' 
  | 'timeline' 
  | 'memorial' 
  | 'plan';

export default function Index() {
  const [activePanel, setActivePanel] = useState<PanelType>('status');

  useEffect(() => {
    const savedPanel = localStorage.getItem('activePanel') as PanelType;
    if (savedPanel) {
      setActivePanel(savedPanel);
    }
  }, []);

  const handlePanelChange = (panel: PanelType) => {
    setActivePanel(panel);
    localStorage.setItem('activePanel', panel);
  };

  return (
    <div className="flex h-screen bg-background">
      <NavigationSidebar
        onPanelChange={handlePanelChange}
        activePanel={activePanel}
        panels={[
          { id: 'status', label: 'Status', icon: Activity },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'calculators', label: 'Calculators', icon: Calculator },
          { id: 'invoices', label: 'Invoices', icon: FileText },
          { id: 'files', label: 'Files', icon: FileText },
          { id: 'gallery', label: 'Gallery', icon: Images },
          { id: 'code', label: 'Code', icon: Code },
          { id: 'tts', label: 'TTS', icon: Volume2 },
          { id: 'api', label: 'API', icon: Zap },
          { id: 'maps', label: 'Maps', icon: Map },
          { id: 'sheets', label: 'Sheets', icon: Sheet },
          { id: 'media', label: 'Media', icon: Play },
          { id: 'usage', label: 'Usage', icon: BarChart3 },
          { id: 'projects', label: 'Projects', icon: Folder },
          { id: 'contact', label: 'Contact', icon: Mail },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'pricing', label: 'Pricing', icon: CreditCard },
          { id: 'payment', label: 'Payment', icon: DollarSign },
          { id: 'reviews', label: 'Reviews', icon: Star },
          { id: 'updates', label: 'Updates', icon: Bell },
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'memorial', label: 'Memorial', icon: Heart },
          { id: 'plan', label: 'Plan', icon: Layers },
        ]}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <Header />
        
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full">
            {activePanel === 'status' && <StatusPanel />}
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
            {activePanel === 'pricing' && <PricingPanel />}
            {activePanel === 'payment' && <PaymentPanel />}
            {activePanel === 'reviews' && <ReviewsPanel />}
            {activePanel === 'updates' && <UpdatesPanel />}
            {activePanel === 'timeline' && <TimelinePanel />}
            {activePanel === 'memorial' && <MemorialPanel />}
            {activePanel === 'plan' && <PlanPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}
