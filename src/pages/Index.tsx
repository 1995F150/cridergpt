import { useState } from "react";
import { Header } from "@/components/Header";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { Footer } from "@/components/Footer";
import { ChatPanel } from "@/components/panels/ChatPanel";
import { ProjectPanel } from "@/components/panels/ProjectPanel";
import { FilesPanel } from "@/components/panels/FilesPanel";
import { CodePanel } from "@/components/panels/CodePanel";
import { TTSPanel } from "@/components/panels/TTSPanel";
import { MediaPanel } from "@/components/panels/MediaPanel";
import { MemorialPanel } from "@/components/panels/MemorialPanel";
import { ReviewsPanel } from "@/components/panels/ReviewsPanel";
import { UpdatesPanel } from "@/components/panels/UpdatesPanel";
import { PlanPanel } from "@/components/panels/PlanPanel";
import { PaymentPanel } from "@/components/panels/PaymentPanel";
import { GoogleSheetsPanel } from "@/components/panels/GoogleSheetsPanel";
import { StatusPanel } from "@/components/panels/StatusPanel";
import { MapBuilderPanel } from "@/components/panels/MapBuilderPanel";
import { FeatureNotifications } from "@/components/FeatureNotifications";
import { MapBuilderPromo } from "@/components/MapBuilderPromo";
import { OriginStory } from "@/components/OriginStory";

const Index = () => {
  console.log('📄 Index component rendering');
  const [activeTab, setActiveTab] = useState('chat');

  const renderActivePanel = () => {
    console.log('🎯 Rendering active panel:', activeTab);
    
    switch (activeTab) {
      case 'chat':
        return (
          <div className="space-y-6">
            <MapBuilderPromo variant="featured" className="mb-6" />
            <ChatPanel />
            <OriginStory />
          </div>
        );
      case 'projects':
        return (
          <div className="space-y-6">
            <ProjectPanel />
            <MapBuilderPromo variant="compact" />
          </div>
        );
      case 'files':
        return <FilesPanel />;
      case 'code':
        return <CodePanel />;
      case 'tts':
        return <TTSPanel />;
      case 'media':
        return (
          <div className="space-y-6">
            <MediaPanel />
            <MapBuilderPromo variant="compact" />
          </div>
        );
      case 'maps':
        return <MapBuilderPanel />;
      case 'memorial':
        return <MemorialPanel />;
      case 'reviews':
        return <ReviewsPanel />;
      case 'updates':
        return <UpdatesPanel />;
      case 'plan':
        return <PlanPanel />;
      case 'payments':
        return <PaymentPanel />;
      case 'sheets':
        return <GoogleSheetsPanel />;
      case 'status':
        return <StatusPanel />;
      default:
        return <ChatPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <FeatureNotifications />
      
      <div className="flex flex-1 overflow-hidden">
        <NavigationSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 max-w-6xl">
            {renderActivePanel()}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
