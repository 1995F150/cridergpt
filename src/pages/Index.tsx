
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { CalculatorPanel } from "@/components/panels/CalculatorPanel";
import { ProjectPanel } from "@/components/panels/ProjectPanel";
import { FilesPanel } from "@/components/panels/FilesPanel";
import { TTSPanel } from "@/components/panels/TTSPanel";
import { StatusPanel } from "@/components/panels/StatusPanel";
import { MemorialPanel } from "@/components/panels/MemorialPanel";
import { PricingPanel } from "@/components/panels/PricingPanel";
import { APIPanel } from "@/components/panels/APIPanel";
import { ChatPanel } from "@/components/panels/ChatPanel";
import { CodePanel } from "@/components/panels/CodePanel";
import { MediaPanel } from "@/components/panels/MediaPanel";
import { MapBuilderPanel } from "@/components/panels/MapBuilderPanel";
import { ReviewsPanel } from "@/components/panels/ReviewsPanel";
import { UpdatesPanel } from "@/components/panels/UpdatesPanel";
import { PlanPanel } from "@/components/panels/PlanPanel";
import { PaymentPanel } from "@/components/panels/PaymentPanel";
import { GoogleSheetsPanel } from "@/components/panels/GoogleSheetsPanel";
import { ContactPanel } from "@/components/panels/ContactPanel";
import { TimelinePanel } from "@/components/panels/TimelinePanel";
import { ProfilePanel } from "@/components/panels/ProfilePanel";

export default function Index() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calculator');

  if (!user) {
    return null;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatPanel />;
      case 'projects':
        return <ProjectPanel />;
      case 'files':
        return <FilesPanel />;
      case 'code':
        return <CodePanel />;
      case 'calculator':
        return <CalculatorPanel />;
      case 'timeline':
        return <TimelinePanel />;
      case 'tts':
        return <TTSPanel />;
      case 'media':
        return <MediaPanel />;
      case 'maps':
        return <MapBuilderPanel />;
      case 'contact':
        return <ContactPanel />;
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
      case 'profile':
        return <ProfilePanel />;
      default:
        return <CalculatorPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <NavigationSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="flex-1 p-6">
        {renderActivePanel()}
      </main>
    </div>
  );
}
