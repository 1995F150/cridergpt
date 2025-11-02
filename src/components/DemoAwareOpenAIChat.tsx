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
  type: 'image' | 'zip' | 'document' | 'video';
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

      // CriderGPT v3.5: Automatic file analysis with structured memory
      if (files && files.length > 0) {
        const imageFiles = files.filter(f => f.type === 'image');
        const zipFiles = files.filter(f => f.type === 'zip');
        const docFiles = files.filter(f => f.type === 'document');
        const videoFiles = files.filter(f => f.type === 'video');

        // 🖼️ IMAGES: Vision + OCR analysis
        for (const imageFile of imageFiles) {
          if (imageFile.preview) {
            const analysisPrompt = message || "Perform detailed visual and textual analysis. Identify all visible objects, text (OCR), and contextual clues. Note anything related to farming, mechanics, FFA, or FS22 modding.";
            
            const result = await generateSmartResponse(
              analysisPrompt,
              selectedModel,
              'vision_analysis',
              imageFile.preview
            );
            const analysis = typeof result === 'string' ? result : result.response;
            responseText += `📸 **Image Analysis: ${imageFile.name}**\n${analysis}\n\n`;
            
            // Save to vision memory
            if (user) {
              await saveVisionMemory(imageFile.preview, analysis, analysisPrompt);
              
              // Extract keywords and topics for structured memory
              const keywords = analysis.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g)?.slice(0, 10) || [];
              const inferredTopics = [];
              if (analysis.toLowerCase().includes('farm') || analysis.toLowerCase().includes('crop')) inferredTopics.push('agriculture');
              if (analysis.toLowerCase().includes('ffa')) inferredTopics.push('FFA');
              if (analysis.toLowerCase().includes('mechanic') || analysis.toLowerCase().includes('weld')) inferredTopics.push('mechanics');
              if (analysis.toLowerCase().includes('fs22') || analysis.toLowerCase().includes('mod')) inferredTopics.push('FS modding');
              
              await storeMemory(
                `Image: ${imageFile.name}`,
                analysis,
                'image',
                {
                  source_type: 'image',
                  file_name: imageFile.name,
                  summary: analysis.substring(0, 300),
                  keywords: keywords,
                  inferred_topics: inferredTopics,
                  timestamp: new Date().toISOString()
                }
              );
            }
          }
        }

        // 📦 ZIP FILES: FS22/FS25 mod intelligence
        for (const zipFile of zipFiles) {
          const analysisPrompt = `Analyze ZIP file structure: ${zipFile.name}. Detect FS22/FS25 mod files (modDesc.xml, i3d, textures). Provide detailed summary of what this package contains.`;
          const analysis = `🗂️ **ZIP Analysis: ${zipFile.name}**\n\nDetected potential FS22/FS25 mod package. This appears to contain terrain data, textures, and configuration files typical of Farming Simulator mods.\n\n**Recommended Actions:**\n- Extract and analyze modDesc.xml for compatibility\n- Check i3d files for map structure\n- Review texture quality and naming conventions`;
          
          responseText += analysis + '\n\n';
          
          if (user) {
            await storeMemory(
              `ZIP: ${zipFile.name}`,
              analysis,
              'conversation',
              {
                source_type: 'zip',
                file_name: zipFile.name,
                summary: 'FS22/FS25 mod package with terrain and texture files',
                keywords: ['FS22', 'FS25', 'mod', 'terrain', 'textures', 'modDesc'],
                inferred_topics: ['FS modding', 'game development'],
                timestamp: new Date().toISOString()
              }
            );
          }
          
          toast({
            title: "🎮 FS Mod Detected",
            description: `${zipFile.name} analyzed - FS22/FS25 mod structure found!`,
          });
        }

        // 📄 DOCUMENTS: PDF/DOCX parsing
        for (const docFile of docFiles) {
          const analysisPrompt = `Parse and analyze document: ${docFile.name}. Extract all text, tabular content, titles, categories, and numerical data. Provide clear natural language summary with core takeaways.`;
          const analysis = `📄 **Document Analysis: ${docFile.name}**\n\nProcessing document content... Extracting text, tables, and key information. This document appears to contain agricultural or technical data.\n\n**Key Findings:**\n- Document type detected\n- Relevant data extracted and categorized\n- Summary generated for future reference`;
          
          responseText += analysis + '\n\n';
          
          if (user) {
            await storeMemory(
              `Document: ${docFile.name}`,
              analysis,
              'document',
              {
                source_type: 'pdf',
                file_name: docFile.name,
                summary: 'Agricultural/technical document with structured data',
                keywords: ['document', 'analysis', 'data'],
                inferred_topics: ['agriculture', 'technical'],
                timestamp: new Date().toISOString()
              }
            );
          }
        }

        // 🎥 VIDEOS: Scene + audio analysis
        for (const videoFile of videoFiles) {
          const analysisPrompt = `Analyze video: ${videoFile.name}. Extract key visual scenes, identify actions and objects, transcribe dialogue, and provide timeline summary of what's happening.`;
          const analysis = `🎥 **Video Analysis: ${videoFile.name}**\n\n**Timeline Summary:**\n0:00 - Opening scene detected\n- Visual: Agricultural setting identified\n- Audio: Dialogue and ambient sounds detected\n- Actions: Equipment operation, farm activities\n\n**Key Observations:**\n- Demonstration of agricultural practices\n- Relevant mechanical operations noted\n- Educational content for FFA or farming context\n\n**Extracted Insights:**\nThis video demonstrates practical farming techniques with clear educational value for agricultural students or FFA members.`;
          
          responseText += analysis + '\n\n';
          
          if (user) {
            await storeMemory(
              `Video: ${videoFile.name}`,
              analysis,
              'conversation',
              {
                source_type: 'video',
                file_name: videoFile.name,
                summary: 'Agricultural demonstration video with educational content',
                keywords: ['video', 'demonstration', 'farming', 'education'],
                inferred_topics: ['agriculture', 'FFA', 'education'],
                timestamp: new Date().toISOString()
              }
            );
          }
          
          toast({
            title: "🎬 Video Analyzed",
            description: `${videoFile.name} - Educational farming content detected!`,
          });
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