import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Sparkles,
  History,
  Brain,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, type ChatMessage as ChatMessageType } from "@/hooks/useChat";
import { useAILearning } from "@/hooks/useAILearning";
import { useModelSelection } from "@/hooks/useModelSelection";
import { useDemoMode } from "@/hooks/useDemoMode";
import { usePatternDetection } from "@/hooks/usePatternDetection";
import { usePredictiveSuggestions } from "@/hooks/usePredictiveSuggestions";
import { usePendingTasks } from "@/hooks/usePendingTasks";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { supabase } from "@/integrations/supabase/client";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatGallery } from "@/components/chat/ChatGallery";
import { DemoExhaustedModal } from "@/components/DemoExhaustedModal";
import { GuestWelcomeHero } from "@/components/GuestWelcomeHero";
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import { PendingTasksBanner } from "@/components/chat/PendingTasksBanner";
import { PatternMemoryBadge } from "@/components/chat/PatternMemoryBadge";
import ModelSelector from "@/components/ModelSelector";
import { generateChatPDF, isPDFRequest } from "@/utils/chatPdfGenerator";
import { cn } from "@/lib/utils";
import { useAGIMode } from "@/hooks/useAGIMode";
import { ThinkingSteps, type ThinkingStep } from "@/components/chat/ThinkingSteps";

interface FilePreview {
  id: string;
  file: File;
  type: "image" | "document" | "audio" | "video";
  preview?: string;
  name: string;
  size: number;
}

export default function ChatPanel() {
  const { user, connectionError } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    isLoading: isChatLoading,
    isLoadingConversations,
    createConversation,
    sendMessage,
    updateConversationTitle,
    deleteConversation,
    uploadImage,
    uploadFile,
  } = useChat();
  
  const { generateSmartResponse, isLoading: isAILoading } = useAILearning();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const { canSendMessage, incrementDemoUsage, demoUsage } = useDemoMode();
  
  // CriderGPT Algorithm hooks
  const { analyzeAndStorePatterns } = usePatternDetection();
  const { suggestions, generateSuggestions, isLoading: isSuggestionsLoading } = usePredictiveSuggestions();
  const { 
    pendingTasks, 
    getDueTasks, 
    completeTask, 
    dismissTask, 
    analyzeAndCreateTask 
  } = usePendingTasks();
  
  // Browser notifications
  const { 
    canSendNotifications, 
    sendImageNotification, 
    sendAIResponseNotification 
  } = useBrowserNotifications();
  
  // Auto-collapse sidebar on mobile
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKeywords, setApiKeywords] = useState<{ keyword: string; action: string }[]>([]);
  const [agiToolSteps, setAgiToolSteps] = useState<ThinkingStep[]>([]);
  const { isAGIMode, toggleAGIMode } = useAGIMode();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = isChatLoading || isAILoading || isStreaming;
  const dueTasks = getDueTasks();

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Load active API keywords for local detection
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).from('api_keywords').select('keyword, action').eq('active', true);
      if (!error && data) setApiKeywords(data as any);
    })();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleNewChat = useCallback(async () => {
    const conv = await createConversation("New Chat");
    if (conv) {
      setCurrentConversation(conv.id);
      if (isMobile) {
        setMobileSidebarOpen(false);
      }
    }
  }, [createConversation, setCurrentConversation, isMobile]);

  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversation(id);
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [setCurrentConversation, isMobile]);

  const handleSendMessage = useCallback(async (message: string, files?: FilePreview[]) => {
    // Check demo limits for non-authenticated users
    if (!user) {
      if (!canSendMessage()) {
        setShowDemoModal(true);
        return;
      }
    }

    try {
      // CriderGPT Algorithm: Analyze patterns and detect tasks
      if (user) {
        analyzeAndStorePatterns(message);
        analyzeAndCreateTask(message, message.substring(0, 50));
      }

      // Create conversation if none exists
      let convId = currentConversation;
      if (!convId) {
        const conv = await createConversation(message.substring(0, 50) || "New Chat");
        if (!conv) return;
        convId = conv.id;
        setCurrentConversation(convId);
      }

      // Handle file uploads - support ALL file types
      let imageUrl: string | undefined;
      let fileAttachments: string[] = [];
      
      if (files?.length) {
        for (const filePreview of files) {
          if (filePreview.type === "image") {
            const url = await uploadImage(filePreview.file);
            if (url) imageUrl = url;
          } else {
            // Handle PDFs, audio, video, etc.
            const url = await uploadFile(filePreview.file, filePreview.type);
            if (url) fileAttachments.push(url);
          }
        }
      }

      // Send user message
      await sendMessage(convId, message, "user", undefined, imageUrl);

      // Keyword routing for Jessie-owner commands
      const isJessie = user?.email?.toLowerCase() === 'jessiecrider3@gmail.com';
      const lowerMsg = message.toLowerCase();
      const matchedKw = apiKeywords.find(k => lowerMsg.includes(k.keyword.toLowerCase()));
      const flags = {
        use_memory: /\buse\s+memory\b/i.test(message),
        store_in_training: /\bstore\s+in\s+training\b/i.test(message),
        vision_memory: /\bvision\s+memory\b/i.test(message),
      };

      if (matchedKw) {
        if (!isJessie) {
          await sendMessage(convId, "❌ This command is restricted to Jessie (owner).", "assistant");
          return;
        }

        setIsStreaming(true);
        setStreamingMessage("Processing owner command...");
        try {
          const { data, error } = await supabase.functions.invoke('cridergpt-api', {
            body: { message, conversation_id: convId, flags }
          });
          if (error) throw error;

          // Handle routed responses
          if (data?.route === 'open_github' && data?.url) {
            await sendMessage(convId, `🔗 Open the repository: ${data.url}`, 'assistant');
          } else if (data?.route === 'generate_photo' && (data?.data?.imageUrl || data?.data?.image)) {
            const img = data.data.imageUrl || data.data.image;
            await sendMessage(convId, `Here you go!`, 'assistant', undefined, img);
          } else {
            const text = typeof data?.data === 'string' ? data.data : JSON.stringify(data?.data ?? data, null, 2);
            await sendMessage(convId, text || '✅ Command executed.', 'assistant');
          }
        } catch (e: any) {
          await sendMessage(convId, `❌ Command failed: ${e.message || 'Unknown error'}`, 'assistant');
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
        }
        return;
      }

      // ========== PDF GENERATION DETECTION ==========
      // Detect CHAT EXPORT requests (export this conversation as PDF)
      const isChatExportRequest = /\b(export|download|save)\s+(this\s+)?(chat|conversation|history|messages?)\s*(as\s+)?(a\s+)?(pdf|document)/i.test(message) ||
        /\b(pdf|document)\s+(this|of\s+this)\s+(chat|conversation)/i.test(message);
      
      // Detect CUSTOM DOCUMENT requests (create me a budget report PDF)
      const isCustomDocumentRequest = /\b(create|make|generate|build|write)\s+(me\s+)?(a\s+)?(budget|report|invoice|summary|document|worksheet|template|plan|proposal|analysis)\s*(pdf)?/i.test(message) &&
        !/\b(this\s+)?(chat|conversation|history)/i.test(message);
      
      if (isChatExportRequest) {
        // Export the current chat as PDF
        setIsStreaming(true);
        setStreamingMessage("📄 Exporting chat to PDF...");
        
        try {
          const pdfMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.created_at
          }));
          
          const conv = conversations.find(c => c.id === convId);
          const title = conv?.title || 'Chat Conversation';
          
          await generateChatPDF({
            userId: user?.id || 'demo',
            conversationTitle: title,
            messages: pdfMessages
          });
          
          await sendMessage(convId, `✅ Chat exported successfully! The file "${title}.pdf" has been downloaded to your device.`, "assistant");
          
          toast({
            title: "PDF Generated",
            description: "Your chat has been exported as a PDF document."
          });
        } catch (error: any) {
          console.error("PDF export error:", error);
          await sendMessage(convId, `❌ Sorry, I couldn't export the chat: ${error.message}`, "assistant");
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
        }
        return;
      }
      
      if (isCustomDocumentRequest) {
        // Generate a custom document using AI
        setIsStreaming(true);
        setStreamingMessage("📄 Creating your document...");
        
        try {
          // Ask AI to generate the document content
          const documentPrompt = `Please generate a professional ${message.match(/budget|report|invoice|summary|document|worksheet|template|plan|proposal|analysis/i)?.[0] || 'document'} based on this request: "${message}". 
          
Format your response as a structured document with:
- A clear title
- Sections with headers
- Bullet points or numbered lists where appropriate
- Tables if data is involved
- A professional conclusion

Make it detailed and actionable.`;

          const result = await generateSmartResponse(
            documentPrompt,
            selectedModel
          );
          
          // Send the document content as a message
          const responseText = typeof result === 'string' ? result : result.response;
          await sendMessage(convId, responseText, "assistant");
          
          // Inform user they can export it
          await sendMessage(convId, `📄 Your document is ready above! If you'd like to export it as a PDF, just say "export this chat as PDF".`, "assistant");
          
        } catch (error: any) {
          console.error("Document generation error:", error);
          await sendMessage(convId, `❌ Sorry, I couldn't generate the document: ${error.message}`, "assistant");
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
        }
        return;
      }

      // ========== IMAGE GENERATION DETECTION (EXPANDED) ==========
      // EXPANDED action keywords for 99% accuracy
      const imageKeywords = /\b(generate|create|make|draw|render|design|paint|sketch|illustrate|build|produce|visualize|craft|imagine|show|give|picture)\b/i;
      
      // EXPANDED context words
      const imageContextWords = /\b(image|picture|photo|art|pic|illustration|portrait|scene|artwork|graphic|shot|photograph|rendering|visual|snapshot|selfie|headshot|banner|poster|thumbnail|painting|drawing|sketch)\b/i;
      
      // EXPANDED implicit patterns - catches "generate a apple", "draw me a cat"
      const implicitGeneration = /^(generate|create|make|draw|render|paint|sketch|show\s+me|give\s+me|visualize|imagine)\s+(a|an|the|me|some|my)?\s*\w+/i;
      
      // Character-specific detection - when characters are mentioned with action verbs
      const characterMention = /\b(jessie|crider|jr|hoback|harman|savanaa|savanna|savannah|sav)\b/i;
      const hasCharacterWithAction = imageKeywords.test(message) && characterMention.test(message);
      
      // "of [noun]" pattern after action words
      const ofPattern = /\b(generate|create|make|draw|render|picture|photo|image)\s+(?:a\s+|an\s+)?[\w\s]+?\s+of\b/i;
      
      const isImageGeneration = (
        // Explicit: "generate an image of X" or "create a picture of Y"
        (imageKeywords.test(message) && imageContextWords.test(message)) ||
        // Implicit: "generate a apple", "draw me a cat", "create a sunset"
        implicitGeneration.test(message.trim()) ||
        // Direct: "generate [noun]" patterns
        /^(generate|create|draw|make|render)\s+(a|an|the)?\s*\w+(\s+\w+){0,5}$/i.test(message.trim()) ||
        // Character mention with action: "generate jessie and jr together"
        hasCharacterWithAction ||
        // "of" pattern: "generate a photo of jessie"
        ofPattern.test(message)
      );

      if (isImageGeneration) {
        // Use image generation edge function
        setIsStreaming(true);
        setStreamingMessage("🎨 Generating image...");
        
        try {
          const { data, error } = await supabase.functions.invoke('generate-ai-image', {
            body: { prompt: message }
          });

          if (error) throw error;
          
          if (data?.imageUrl || data?.image) {
            const imageUrl = data.imageUrl || data.image;
            await sendMessage(convId, `Here's your generated image! 🎨`, "assistant", undefined, imageUrl);
            
            // Send browser notification if user is not on the page
            if (document.hidden && canSendNotifications) {
              sendImageNotification(message, imageUrl);
            }
          } else if (data?.error) {
            throw new Error(data.error);
          } else {
            throw new Error("No image generated");
          }
        } catch (error: any) {
          console.error("Image generation error:", error);
          await sendMessage(convId, `Sorry, I couldn't generate that image: ${error.message}. Please try again.`, "assistant");
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
        }
      } else if (isAGIMode && user) {
        // ========== AGI MODE ==========
        setIsStreaming(true);
        setStreamingMessage("🧠 AGI Mode — reasoning...");
        setAgiToolSteps([]);

        try {
          const conversationHistory = messages.map(m => ({
            role: m.role,
            content: m.content
          }));

          const { data, error } = await supabase.functions.invoke('agi-chat', {
            body: {
              message,
              conversation_history: conversationHistory,
              image_url: imageUrl,
              user_id: user.id,
              user_email: user.email,
            }
          });

          if (error) throw error;

          if (data?.error) {
            throw new Error(data.error);
          }

          // Show tool steps
          if (data?.tool_steps?.length) {
            setAgiToolSteps(data.tool_steps);
          }

          const response = data?.response || "I couldn't generate a response. Please try again.";
          await sendMessage(convId, response, "assistant");

          // Send browser notification if user is not on the page
          if (document.hidden && canSendNotifications) {
            sendAIResponseNotification(response);
          }

          // Auto-rename conversation
          if (messages.length === 0 && message.length > 0) {
            const title = message.length > 40 ? message.substring(0, 40) + "..." : message;
            await updateConversationTitle(convId, title);
          }
        } catch (error: any) {
          console.error("AGI response error:", error);
          toast({
            title: "AGI Error",
            description: error.message || "Failed to get AGI response.",
            variant: "destructive",
          });
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
          setTimeout(() => setAgiToolSteps([]), 3000);
        }
      } else if (!user) {
        // ========== DEMO MODE — route through demo-chat edge function ==========
        setIsStreaming(true);
        setStreamingMessage("Thinking...");

        try {
          const { data, error } = await supabase.functions.invoke('demo-chat', {
            body: { message, sessionId: demoUsage.sessionId }
          });

          if (error) throw error;

          if (data?.error) {
            if (data.error === "Demo limit exceeded") {
              setShowDemoModal(true);
              return;
            }
            throw new Error(data.message || data.error);
          }

          const response = data?.response || "Thanks for trying CriderGPT! Sign up for full access.";
          await sendMessage(convId, response, "assistant");

          // Increment local counter after successful response
          incrementDemoUsage();

        } catch (error: any) {
          console.error("Demo chat error:", error);
          await sendMessage(convId, "Sorry, something went wrong. Please try again or sign up for full access!", "assistant");
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
        }
      } else {
        // Regular AI response with streaming
        setIsStreaming(true);
        setStreamingMessage("");

        try {
          // Get conversation history for context
          const conversationHistory = messages.map(m => ({
            role: m.role,
            content: m.content
          }));

          const result = await generateSmartResponse(
            message,
            selectedModel,
            imageUrl ? "vision_analysis" : "chat",
            imageUrl
          );

          const response = typeof result === "string" ? result : result.response;
          const tokensUsed = typeof result === "object" && result !== null && "tokens_used" in result 
            ? (result as { tokens_used?: number }).tokens_used 
            : undefined;
          await sendMessage(convId, response, "assistant", tokensUsed);

          // Send browser notification if user is not on the page
          if (document.hidden && canSendNotifications) {
            sendAIResponseNotification(response);
          }

          // Auto-rename conversation based on first message
          if (messages.length === 0 && message.length > 0) {
            const title = message.length > 40 ? message.substring(0, 40) + "..." : message;
            await updateConversationTitle(convId, title);
          }

        } catch (error: any) {
          console.error("AI response error:", error);
          if (error.message?.includes("(Used:")) {
            toast({
              title: "Token Limit Reached",
              description: "You've used all your tokens for this month.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to get AI response. Please try again.",
              variant: "destructive",
            });
          }
        } finally {
          setIsStreaming(false);
          setStreamingMessage("");
        }
      }

      // Show demo modal when limit reached
      if (!user && demoUsage.messagesUsed >= demoUsage.maxMessages) {
        setTimeout(() => setShowDemoModal(true), 2000);
      }

    } catch (error) {
      console.error("Send message error:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [
    user, currentConversation, messages, selectedModel, conversations,
    canSendMessage, incrementDemoUsage, demoUsage,
    createConversation, setCurrentConversation, sendMessage,
    uploadImage, generateSmartResponse, updateConversationTitle, toast,
    analyzeAndStorePatterns, analyzeAndCreateTask
  ]);

  // Connection error state
  if (connectionError) {
    return (
      <div className="h-full flex items-center justify-center p-4 md:p-8">
        <div className="text-center max-w-md">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{connectionError}</p>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // Mobile sidebar content
  const sidebarContent = (
    <ChatSidebar
      conversations={conversations}
      currentConversation={currentConversation}
      onSelectConversation={handleSelectConversation}
      onNewChat={handleNewChat}
      onRenameConversation={updateConversationTitle}
      onDeleteConversation={deleteConversation}
      onOpenGallery={() => setGalleryOpen(true)}
      isLoading={isLoadingConversations}
    />
  );

  return (
    <div className="h-full flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            sidebarOpen ? "w-72" : "w-0"
          )}
        >
          {sidebarOpen && sidebarContent}
        </div>
      )}

      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle>Chat History</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100vh-60px)]">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Desktop sidebar toggle */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeftOpen className="h-5 w-5" />
                )}
              </Button>
            )}
            
            {/* Mobile history button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <History className="h-5 w-5" />
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <img 
                src="/cridergpt-logo.png" 
                alt="CriderGPT" 
                className="h-5 w-5 md:h-6 md:w-6 object-contain"
              />
              <h1 className="font-semibold text-base md:text-lg">CriderGPT</h1>
              {!user && (
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  Demo Mode
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PatternMemoryBadge className="hidden sm:flex" />
            {user && (
              <Button
                variant={isAGIMode ? "default" : "outline"}
                size="sm"
                onClick={toggleAGIMode}
                className={cn(
                  "gap-1 text-xs",
                  isAGIMode && "bg-primary text-primary-foreground"
                )}
              >
                <Brain className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AGI</span>
              </Button>
            )}
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>

        {/* Demo Mode Banner */}
        {!user && (
          <div className="bg-accent/10 border-b border-accent/20 px-2 md:px-4 py-2">
            <p className="text-xs md:text-sm text-accent-foreground">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4 inline mr-1" />
              Demo: {demoUsage.maxMessages - demoUsage.messagesUsed} messages left.
              <Button variant="link" className="text-primary p-0 ml-1 h-auto text-xs md:text-sm" onClick={() => window.location.href = "/auth"}>
                Sign up free
              </Button>
            </p>
          </div>
        )}

        {/* Pending Tasks Banner */}
        {user && dueTasks.length > 0 && (
          <div className="px-2 md:px-4 py-2">
            <PendingTasksBanner
              tasks={dueTasks}
              onComplete={completeTask}
              onDismiss={dismissTask}
              onContinue={(task) => handleSendMessage(`Continue with: ${task.task_description}`)}
            />
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-2 md:p-4">
          {messages.length === 0 && !currentConversation ? (
            !user ? (
              <GuestWelcomeHero 
                onSuggestionClick={handleSendMessage} 
                messagesRemaining={demoUsage.maxMessages - demoUsage.messagesUsed} 
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 md:p-8">
                <img 
                  src="/cridergpt-logo.png" 
                  alt="CriderGPT" 
                  className="h-16 w-16 md:h-20 md:w-20 object-contain mb-4"
                />
                <h2 className="text-xl md:text-2xl font-bold mb-2">Welcome to CriderGPT</h2>
                <p className="text-muted-foreground max-w-md mb-4 text-sm md:text-base">
                  Your AI assistant for agriculture, mechanics, welding, and more.
                </p>
                
                {/* Personalized Suggestion Chips */}
                <div className="w-full max-w-lg mb-4">
                  <SuggestionChips
                    suggestions={suggestions}
                    onSuggestionClick={handleSendMessage}
                    onRefresh={generateSuggestions}
                    isLoading={isSuggestionsLoading}
                    className="justify-center"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full max-w-lg">
                  {[
                    "How do I troubleshoot a John Deere hydraulic issue?",
                    "What welding settings for 1/4 inch steel?",
                    "Generate an image of a modern farm at sunset",
                    "Calculate voltage drop for 200ft 12AWG wire",
                  ].map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="text-left h-auto py-2 md:py-3 px-3 md:px-4"
                      onClick={() => handleSendMessage(prompt)}
                    >
                      <span className="text-xs md:text-sm line-clamp-2">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="space-y-1">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.created_at}
                  imageUrl={msg.image_url}
                  userName={user?.email?.split("@")[0] || "You"}
                />
              ))}

              {/* Progressive signup nudges for demo users */}
              {!user && demoUsage.messagesUsed >= 2 && demoUsage.messagesUsed < 4 && (
                <div className="mx-2 my-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
                    Enjoying CriderGPT? <Button variant="link" className="text-primary p-0 h-auto text-xs" onClick={() => window.location.href = "/auth"}>Sign up free</Button> to save your chats and unlock 30+ tools.
                  </p>
                </div>
              )}
              {!user && demoUsage.messagesUsed >= 4 && !demoUsage.isExhausted && (
                <div className="mx-2 my-3 p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                  <p className="text-sm font-medium text-foreground mb-1">
                    ⚡ Last message before demo ends!
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Sign up in 10 seconds to keep chatting — it's free.
                  </p>
                  <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => window.location.href = "/auth"}>
                    Create Free Account
                  </Button>
                </div>
              )}
              
              {/* AGI Thinking Steps */}
              {isAGIMode && (agiToolSteps.length > 0 || isStreaming) && (
                <ThinkingSteps steps={agiToolSteps} isThinking={isStreaming} />
              )}

              {/* Streaming indicator (non-AGI) */}
              {isStreaming && !isAGIMode && (
                <div className="flex items-center gap-3 py-4 px-2 md:px-4">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                    <img 
                      src="/cridergpt-logo.png" 
                      alt="CriderGPT" 
                      className="h-5 w-5 object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{streamingMessage || "Thinking..."}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          placeholder={
            user
              ? isMobile 
                ? "Ask anything..." 
                : "Ask anything about farming, mechanics, or generate images..."
              : isMobile
                ? "Try the demo..."
                : "Try the demo: Ask about farming or welding..."
          }
        />
      </div>

      {/* Gallery Modal */}
      <ChatGallery open={galleryOpen} onOpenChange={setGalleryOpen} />

      {/* Demo Exhausted Modal */}
      <DemoExhaustedModal open={showDemoModal} onOpenChange={setShowDemoModal} />
    </div>
  );
}
