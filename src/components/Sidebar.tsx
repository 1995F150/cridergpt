import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAssistant } from "@/components/AIAssistant";
import { ProjectManager } from "@/components/ProjectManager";
import { FileUpload } from "@/components/FileUpload";
import { TextToSpeech } from "@/components/TextToSpeech";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, FolderOpen, Upload, Volume2, BarChart3, CreditCard, Calendar } from "lucide-react";
import Pricing from "@/components/Pricing";
import { CalendarPanel } from "@/components/panels/CalendarPanel";

export function Sidebar() {
  return (
    <div className="w-[300px] min-w-[200px] h-full bg-card border-r-2 border-border flex flex-col">
      <Tabs defaultValue="ai" orientation="vertical" className="h-full flex w-full">
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
            value="calendar" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <Calendar className="h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="status" 
            className="w-12 h-12 p-0 flex items-center justify-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
          >
            <BarChart3 className="h-5 w-5" />
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 w-full h-full overflow-hidden bg-background">
          <TabsContent value="ai" className="w-full h-full flex flex-col overflow-y-auto p-8 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
            <AIAssistant />
          </TabsContent>
          
          <TabsContent value="projects" className="w-full h-full flex flex-col overflow-y-auto p-8 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
            <ProjectManager />
          </TabsContent>
          
          
          <TabsContent value="files" className="w-full h-full flex flex-col overflow-y-auto p-8 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
            <FileUpload />
          </TabsContent>
          
          <TabsContent value="tts" className="w-full h-full flex flex-col overflow-y-auto p-8 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
            <TextToSpeech />
          </TabsContent>
          
          <TabsContent value="pricing" className="w-full h-full flex flex-col overflow-y-auto p-0 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
            <Pricing />
          </TabsContent>
          
          <TabsContent value="calendar" className="w-full h-full flex flex-col overflow-y-auto p-0 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
            <CalendarPanel />
          </TabsContent>
          
          <TabsContent value="status" className="w-full h-full flex flex-col overflow-y-auto p-8 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-cyber-blue mb-4">System Status</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyber-blue">3</div>
                    <div className="text-sm text-muted-foreground">Active Projects</div>
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