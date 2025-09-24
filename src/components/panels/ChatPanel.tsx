
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Brain, BookOpen, HelpCircle } from "lucide-react";
import DemoAwareOpenAIChat from "@/components/DemoAwareOpenAIChat";
import { KnowledgeViewer } from "@/components/KnowledgeViewer";
import { TrainingDataManager } from "@/components/TrainingDataManager";

export default function ChatPanel() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Chat & Learning
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        <Tabs defaultValue="chat" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              CriderGPT
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              How to Use
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Training Data
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="h-full mt-4">
            <DemoAwareOpenAIChat />
          </TabsContent>
          
          <TabsContent value="help" className="h-full mt-4">
            <div className="space-y-6 p-6 bg-muted/50 rounded-lg h-full overflow-y-auto">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">How to Use CriderGPT</h2>
                <p className="text-muted-foreground">Your AI assistant for agriculture, mechanics, and more</p>
              </div>
              
              <div className="grid gap-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Chat Features
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                    <li>• Ask questions about farming, mechanics, welding, and electrical work</li>
                    <li>• Get step-by-step guidance for repairs and projects</li>
                    <li>• Request calculations for voltage, welding parameters, and more</li>
                    <li>• Upload images for AI analysis and troubleshooting</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Knowledge Base
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                    <li>• Browse pre-loaded technical manuals and guides</li>
                    <li>• Access FFA curriculum and agricultural resources</li>
                    <li>• Find maintenance schedules and repair procedures</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Tips for Best Results
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                    <li>• Be specific about your equipment model and year</li>
                    <li>• Describe symptoms and what you've already tried</li>
                    <li>• Include photos of problems or parts when possible</li>
                    <li>• Ask follow-up questions for clarification</li>
                  </ul>
                </div>
                
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Example Questions:</h4>
                  <div className="space-y-1 text-sm">
                    <p>"How do I troubleshoot a John Deere 5075E hydraulic issue?"</p>
                    <p>"What welding settings should I use for 1/4 inch steel?"</p>
                    <p>"Calculate voltage drop for a 200ft 12AWG wire run"</p>
                    <p>"Help me plan my corn planting schedule for Iowa"</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="knowledge" className="h-full mt-4">
            <KnowledgeViewer />
          </TabsContent>
          
          <TabsContent value="training" className="h-full mt-4">
            <TrainingDataManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
