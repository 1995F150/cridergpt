import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Brain, BookOpen, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ModelSelector from "./ModelSelector";
import { useModelSelection } from "@/hooks/useModelSelection";
import { useAILearning } from "@/hooks/useAILearning";
import { ModernChatInput } from "./ModernChatInput";
import { useAIMemory } from "@/hooks/useAIMemory";
import { useVisionMemory } from "@/hooks/useVisionMemory";
import { supabase } from "@/integrations/supabase/client";

interface FilePreview {
  id: string;
  file: File;
  type: 'image' | 'zip' | 'document';
  preview?: string;
  name: string;
  size: number;
}

function OpenAIChat() {
  const [reply, setReply] = useState("");
  const [knowledgeStats, setKnowledgeStats] = useState({
    totalInteractions: 0,
    categoriesKnown: [],
    recentTopics: []
  });
  const { toast } = useToast();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const { generateSmartResponse, getKnowledgeStats, isLoading } = useAILearning();
  const { storeMemory } = useAIMemory();
  const { saveVisionMemory } = useVisionMemory();

  useEffect(() => {
    // Load knowledge stats on component mount
    getKnowledgeStats().then(setKnowledgeStats);
  }, [getKnowledgeStats]);

  // Convert file to base64 for AI processing
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Analyze document using document-ai-analysis edge function
  const analyzeDocument = async (file: File): Promise<string> => {
    const base64Content = await fileToBase64(file);
    
    toast({
      title: "Processing Document",
      description: `Analyzing ${file.name}...`,
    });

    const { data, error } = await supabase.functions.invoke('document-ai-analysis', {
      body: {
        fileContent: base64Content,
        fileName: file.name,
        analysisMode: 'general'
      }
    });

    if (error) throw error;
    if (data.error) throw new Error(data.error);
    
    return data.analysis;
  };

  async function handleSendMessage(message: string, files?: FilePreview[]) {
    try {
      let responseText = '';
      let processedDocContent = '';

      // Handle files
      if (files && files.length > 0) {
        const imageFiles = files.filter(f => f.type === 'image');
        const zipFiles = files.filter(f => f.type === 'zip');
        const docFiles = files.filter(f => f.type === 'document');

        // Process images with vision - convert to base64 first
        for (const imageFile of imageFiles) {
          toast({
            title: "Processing Image",
            description: `Analyzing ${imageFile.name}...`,
          });
          
          // Convert image file to base64 (not the blob URL)
          const imageBase64 = await fileToBase64(imageFile.file);
          
          const result = await generateSmartResponse(
            message || "Analyze this image in detail",
            selectedModel,
            'vision_analysis',
            imageBase64
          );
          const visionResult = typeof result === 'string' ? result : result.response;
          responseText += visionResult + '\n\n';
          
          // Save to vision memory with base64
          await saveVisionMemory(imageBase64, visionResult, message || "Image analysis");
        }

        // Detect FS22/FS25 mod files in ZIPs
        for (const zipFile of zipFiles) {
          const modDetectionPrompt = `Detected ZIP file: ${zipFile.name}. This appears to be a Farming Simulator mod file. Ready to analyze structure when extracted.`;
          responseText += modDetectionPrompt + '\n\n';
          
          toast({
            title: "FS Mod Detected",
            description: `Found ${zipFile.name} - looks like a FS22/FS25 mod!`,
          });
        }

        // Process and analyze documents (PDF, DOCX, TXT)
        for (const docFile of docFiles) {
          try {
            const analysis = await analyzeDocument(docFile.file);
            processedDocContent += `\n[Document: ${docFile.name}]\n${analysis}\n`;
            responseText += `📄 **${docFile.name} Analysis:**\n${analysis}\n\n`;
          } catch (docError) {
            console.error('Error analyzing document:', docError);
            responseText += `⚠️ Could not analyze ${docFile.name}: ${docError.message}\n\n`;
          }
        }
      }

      // Handle text message with AI (include document context if available)
      if (message.trim()) {
        const contextMessage = processedDocContent 
          ? `${processedDocContent}\n\nUser question: ${message}`
          : message;
        
        const result = await generateSmartResponse(contextMessage, selectedModel, 'chat');
        responseText += typeof result === 'string' ? result : result.response;
      }

      setReply(responseText);
      
      // Update knowledge stats
      const updatedStats = await getKnowledgeStats();
      setKnowledgeStats(updatedStats);
      
      const hasFiles = files && files.length > 0;
      toast({
        title: hasFiles ? "Analysis Complete" : "Success", 
        description: hasFiles 
          ? "Files analyzed and saved to memory" 
          : knowledgeStats.totalInteractions > 0 
            ? "AI response generated using learned knowledge!"
            : "AI response received and stored for future learning!",
      });
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            CriderGPT Learning AI
            {knowledgeStats.totalInteractions > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {knowledgeStats.totalInteractions} memories
              </Badge>
            )}
          </CardTitle>
          <ModelSelector 
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
        
        {knowledgeStats.totalInteractions > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              Knowledge areas:
            </div>
            {knowledgeStats.categoriesKnown.slice(0, 3).map((category) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
            {knowledgeStats.categoriesKnown.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{knowledgeStats.categoriesKnown.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ModernChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder={knowledgeStats.totalInteractions > 0 
            ? "Ask me anything - I remember our past conversations..." 
            : "Start a conversation to build my knowledge..."
          }
        />
        
        {reply && (
          <div className="p-4 bg-gradient-to-br from-[#081F35]/5 to-[#D8B142]/5 border border-[#D8B142]/20 rounded-lg animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#D8B142]" />
              <span className="font-semibold">CriderGPT Response:</span>
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{reply}</p>
          </div>
        )}
        
        {knowledgeStats.totalInteractions === 0 && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              I'm learning mode! Each conversation builds my knowledge base for better future responses.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OpenAIChat;
