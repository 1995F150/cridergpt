import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Brain, BookOpen, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ModelSelector from "./ModelSelector";
import { useModelSelection } from "@/hooks/useModelSelection";
import { useAILearning } from "@/hooks/useAILearning";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoExhaustedModal } from "./DemoExhaustedModal";
import { useVisionMemory } from "@/hooks/useVisionMemory";
import { ModernChatInput } from "./ModernChatInput";
import { useAIMemory } from "@/hooks/useAIMemory";

interface FilePreview {
  id: string;
  file: File;
  type: 'image' | 'zip' | 'document';
  preview?: string;
  name: string;
  size: number;
}

function DemoAwareOpenAIChat() {
  const [reply, setReply] = useState("");
  const [knowledgeStats, setKnowledgeStats] = useState({
    totalInteractions: 0,
    categoriesKnown: [],
    recentTopics: []
  });
  const [showDemoModal, setShowDemoModal] = useState(false);
  
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const { generateSmartResponse, getKnowledgeStats, isLoading } = useAILearning();
  const { demoUsage, canSendMessage, incrementDemoUsage } = useDemoMode();
  const { saveVisionMemory } = useVisionMemory();
  const { storeMemory } = useAIMemory();

  useEffect(() => {
    // Load knowledge stats on component mount (only for authenticated users)
    if (user) {
      getKnowledgeStats().then(setKnowledgeStats);
    }
  }, [getKnowledgeStats, user]);

  async function handleSendMessage(message: string, files?: FilePreview[]) {
    // Check demo limits for non-authenticated users
    if (!user) {
      if (!canSendMessage()) {
        setShowDemoModal(true);
        return;
      }
      
      // Increment demo usage before sending
      incrementDemoUsage();
    }

    try {
      let responseText = '';

      // Handle images with vision analysis
      if (files && files.length > 0) {
        const imageFiles = files.filter(f => f.type === 'image');
        const zipFiles = files.filter(f => f.type === 'zip');
        const docFiles = files.filter(f => f.type === 'document');

        // Process images
        for (const imageFile of imageFiles) {
          if (imageFile.preview) {
            const result = await generateSmartResponse(
              message || "Analyze this image in detail",
              selectedModel,
              'vision_analysis',
              imageFile.preview
            );
            const visionResult = typeof result === 'string' ? result : result.response;
            responseText += visionResult + '\n\n';
            
            // Save to vision memory (only for authenticated users)
            if (user) {
              await saveVisionMemory(imageFile.preview, visionResult, message || "Image analysis");
            }
          }
        }

        // Detect FS22/FS25 mod files in ZIPs
        for (const zipFile of zipFiles) {
          const modDetectionPrompt = `Detected ZIP file: ${zipFile.name}. This appears to be a Farming Simulator mod file. Ready to analyze structure when extracted.`;
          responseText += modDetectionPrompt + '\n\n';
          
          // Store ZIP upload event (only for authenticated users)
          if (user) {
            await storeMemory(
              `ZIP Upload: ${zipFile.name}`,
              modDetectionPrompt,
              'conversation',
              {
                type: 'upload_event',
                filename: zipFile.name,
                filetype: 'zip',
                category: 'fs_modding'
              }
            );
          }
          
          toast({
            title: "FS Mod Detected",
            description: `Found ${zipFile.name} - looks like a FS22/FS25 mod!`,
          });
        }

        // Handle documents
        for (const docFile of docFiles) {
          responseText += `Document ${docFile.name} uploaded and ready for analysis.\n\n`;
        }
      }

      // Handle text message
      if (message.trim()) {
        const result = await generateSmartResponse(message, selectedModel, 'chat');
        responseText += typeof result === 'string' ? result : result.response;
      }

      setReply(responseText);
      
      // Update knowledge stats (only for authenticated users)
      if (user) {
        const updatedStats = await getKnowledgeStats();
        setKnowledgeStats(updatedStats);
      }
      
      const hasFiles = files && files.length > 0;
      toast({
        title: hasFiles ? "Analysis Complete" : "Success", 
        description: user 
          ? (hasFiles 
              ? "Files analyzed and saved to memory" 
              : knowledgeStats.totalInteractions > 0 
                ? "AI response generated using learned knowledge!"
                : "AI response received and stored for future learning!")
          : "Demo response generated! Sign up to continue using CriderGPT.",
      });

      // Show demo modal for non-authenticated users after using demo limit
      if (!user && demoUsage.messagesUsed >= demoUsage.maxMessages) {
        setTimeout(() => setShowDemoModal(true), 2000);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.message && error.message.includes('(Used:')) {
        toast({
          title: "Monthly Token Limit Reached",
          description: "You've used all your tokens for this month. Upgrade your plan or wait until next month to continue using AI chat.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to get AI response. Please try again.",
          variant: "destructive",
        });
      }
    }
  }

  if (authLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {user ? 'CriderGPT Learning AI' : 'CriderGPT Demo'}
              {user && knowledgeStats.totalInteractions > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  {knowledgeStats.totalInteractions} memories
                </Badge>
              )}
              {!user && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Demo Mode
                </Badge>
              )}
            </CardTitle>
            <ModelSelector 
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
          
          {/* Demo usage indicator for non-authenticated users */}
          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Demo Mode</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                You have <strong>{demoUsage.maxMessages - demoUsage.messagesUsed}</strong> free message
                {demoUsage.maxMessages - demoUsage.messagesUsed !== 1 ? 's' : ''} remaining. 
                Sign up for unlimited access to CriderGPT features.
              </p>
            </div>
          )}
          
          {user && knowledgeStats.totalInteractions > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {knowledgeStats.categoriesKnown.map((category, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <ModernChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading || (!user && !canSendMessage())}
            placeholder={user 
              ? "Ask me anything about farming, welding, vehicles, or upload files..." 
              : "Try the demo: Ask about farming or upload an image..."
            }
          />

          {reply && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-semibold">CriderGPT Response</span>
                {user && knowledgeStats.totalInteractions > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Enhanced by learned knowledge
                  </Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply}</p>
            </div>
          )}

          {user && knowledgeStats.recentTopics.length > 0 && (
            <div className="p-3 bg-card border rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Recent Knowledge Areas
              </h4>
              <div className="flex flex-wrap gap-1">
                {knowledgeStats.recentTopics.map((topic, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DemoExhaustedModal 
        open={showDemoModal} 
        onOpenChange={setShowDemoModal} 
      />
    </>
  );
}

export default DemoAwareOpenAIChat;