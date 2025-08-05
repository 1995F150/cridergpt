
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
      case 'origin':
        return <OriginStory />;
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
        {/* Mobile responsive sidebar - hidden on very small screens, shown on tablets and up */}
        <div className="hidden sm:flex">
          <NavigationSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        
        {/* Mobile navigation - shown on small screens */}
        <div className="sm:hidden w-full bg-card border-b-2 border-border p-2">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-3 bg-background border border-border rounded-lg text-foreground"
          >
            <option value="chat">CriderGPT</option>
            <option value="projects">Projects</option>
            <option value="files">Files</option>
            <option value="code">Code Generator</option>
            <option value="tts">Text to Speech</option>
            <option value="media">Media Generator</option>
            <option value="maps">Map Builder</option>
            <option value="origin">Origin Story</option>
            <option value="memorial">Memorial</option>
            <option value="reviews">Reviews</option>
            <option value="updates">System Updates</option>
            <option value="plan">Current Plan</option>
            <option value="payments">Payments</option>
            <option value="sheets">Google Sheets</option>
            <option value="status">Status</option>
          </select>
        </div>
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
            {renderActivePanel()}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
