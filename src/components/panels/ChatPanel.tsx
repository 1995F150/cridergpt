
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Brain } from "lucide-react";
import OpenAIChat from "@/components/OpenAIChat";
import { KnowledgeViewer } from "@/components/KnowledgeViewer";

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="h-full mt-4">
            <OpenAIChat />
          </TabsContent>
          
          <TabsContent value="knowledge" className="h-full mt-4">
            <KnowledgeViewer />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
