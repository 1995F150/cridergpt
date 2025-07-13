import { useState } from "react";
import heroImage from "@/assets/crider-os-hero.jpg";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { FeatureNotifications } from "@/components/FeatureNotifications";
import { Badge } from "@/components/ui/badge";
import { AssistantPanel } from "@/components/panels/AssistantPanel";
import { ProjectPanel } from "@/components/panels/ProjectPanel";
import { APIPanel } from "@/components/panels/APIPanel";
import { FilesPanel } from "@/components/panels/FilesPanel";
import { TTSPanel } from "@/components/panels/TTSPanel";

import { UpdatesPanel } from "@/components/panels/UpdatesPanel";
import { PricingPanel } from "@/components/panels/PricingPanel";
import { StatusPanel } from "@/components/panels/StatusPanel";
import { PlanPanel } from "@/components/panels/PlanPanel";
import { MediaPanel } from "@/components/panels/MediaPanel";
import UpdatesTab from "@/components/UpdatesTab";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [activeTab, setActiveTab] = useState('assistant');
  const { user } = useAuth();

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'assistant':
        return <AssistantPanel />;
      case 'projects':
        return <ProjectPanel />;
      case 'api':
        return <APIPanel />;
      case 'files':
        return <FilesPanel />;
      case 'tts':
        return <TTSPanel />;
      case 'media':
        return <MediaPanel />;
      case 'updates':
        return <UpdatesTab />;
      case 'plan':
        return <PlanPanel />;
      case 'pricing':
        return <PricingPanel />;
      case 'status':
        return <StatusPanel />;
      default:
        return <AssistantPanel />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Header />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="CriderOS Dashboard" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
                Welcome to CriderOS
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Your Personal AI Assistant for Project Management, FS22/FS25 Mod Deployment, and Automation
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <Badge variant="secondary" className="bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20">
                  AI-Powered
                </Badge>
                <Badge variant="secondary" className="bg-tech-accent/10 text-tech-accent border-tech-accent/20">
                  Mod Deployment
                </Badge>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                  API Management
                </Badge>
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  Automation
                </Badge>
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                  Voice Synthesis
                </Badge>
              </div>
              <div className="flex gap-4">
                <a href="https://buy.stripe.com/3cI8wRbZCblO4mmg8EdZ608" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-cyber-blue to-tech-accent text-background font-semibold rounded-lg hover:opacity-90 transition-opacity">
                  Invest in CriderOS
                </a>
              </div>
            </div>
            
            {/* Feature Notifications Panel - Only show for authenticated users */}
            {user && (
              <div className="lg:col-span-1">
                <FeatureNotifications />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Application Layout */}
      <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
        <NavigationSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="main-content">
          {renderActivePanel()}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;