import heroImage from "@/assets/crider-os-hero.jpg";
import { Header } from "@/components/Header";
import { AIAssistant } from "@/components/AIAssistant";
import { ProjectManager } from "@/components/ProjectManager";
import { APIKeyManager } from "@/components/APIKeyManager";
import { FileUpload } from "@/components/FileUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="CriderOS Dashboard" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-2xl">
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI Assistant */}
          <div className="lg:col-span-1">
            <AIAssistant />
          </div>
          
          {/* Project Manager */}
          <div className="lg:col-span-1">
            <ProjectManager />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Key Manager */}
          <div className="lg:col-span-1">
            <APIKeyManager />
          </div>
          
          {/* File Upload */}
          <div className="lg:col-span-1">
            <FileUpload />
          </div>
        </div>

        {/* Status Overview */}
        <Card className="mt-8 bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-cyber-blue mb-4">System Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyber-blue">3</div>
                <div className="text-sm text-muted-foreground">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-tech-accent">2</div>
                <div className="text-sm text-muted-foreground">API Keys</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">5</div>
                <div className="text-sm text-muted-foreground">Files Uploaded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">12</div>
                <div className="text-sm text-muted-foreground">Automations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
