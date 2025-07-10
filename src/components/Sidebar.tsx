import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAssistant } from "@/components/AIAssistant";
import { ProjectManager } from "@/components/ProjectManager";
import { APIKeyManager } from "@/components/APIKeyManager";
import { FileUpload } from "@/components/FileUpload";
import { TextToSpeech } from "@/components/TextToSpeech";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, FolderOpen, Key, Upload, Volume2, BarChart3, CreditCard } from "lucide-react";
import Pricing from "@/components/Pricing";

export function Sidebar() {
  return (
    <div className="w-full h-full bg-card/50 backdrop-blur-sm">
      <Tabs defaultValue="ai" orientation="vertical" className="h-full flex">
        <TabsList className="flex flex-col h-full w-16 bg-transparent p-2 gap-2">
          <TabsTrigger 
            value="ai" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Bot className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="projects" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <FolderOpen className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="api" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Key className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="files" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Upload className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="tts" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Volume2 className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="pricing" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <CreditCard className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="status" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <BarChart3 className="h-5 w-5" />
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="ai" className="p-4 m-0 h-full">
            <AIAssistant />
          </TabsContent>
          
          <TabsContent value="projects" className="p-4 m-0 h-full">
            <ProjectManager />
          </TabsContent>
          
          <TabsContent value="api" className="p-4 m-0 h-full">
            <APIKeyManager />
          </TabsContent>
          
          <TabsContent value="files" className="p-4 m-0 h-full">
            <FileUpload />
          </TabsContent>
          
          <TabsContent value="tts" className="p-4 m-0 h-full">
            <TextToSpeech />
          </TabsContent>
          
          <TabsContent value="pricing" className="p-0 m-0 h-full overflow-auto">
            <Pricing />
          </TabsContent>
          
          <TabsContent value="status" className="p-4 m-0 h-full">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-cyber-blue mb-4">System Status</h2>
                <div className="grid grid-cols-2 gap-4">
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
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}