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
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import { PendingTasksBanner } from "@/components/chat/PendingTasksBanner";
import { PatternMemoryBadge } from "@/components/chat/PatternMemoryBadge";
import ModelSelector from "@/components/ModelSelector";
import { cn } from "@/lib/utils";

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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = isChatLoading || isAILoading || isStreaming;
  const dueTasks = getDueTasks();

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

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
      incrementDemoUsage();
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

      // Handle image uploads
      let imageUrl: string | undefined;
      if (files?.length) {
        const imageFile = files.find(f => f.type === "image");
        if (imageFile) {
          imageUrl = await uploadImage(imageFile.file);
        }
      }

      // Send user message
      await sendMessage(convId, message, "user", undefined, imageUrl);

      // Check if this is an image generation request
      // Expanded detection to catch implicit requests like "generate a apple"
      const imageKeywords = /\b(generate|create|make|draw|render|design|paint|sketch|illustrate)\b/i;
      const imageContextWords = /\b(image|picture|photo|art|pic|illustration|portrait|scene|artwork|graphic)\b/i;
      const implicitGeneration = /^(generate|create|make|draw|render|paint|sketch)\s+(a|an|the|me|some)\s+\w+/i;
      
      const isImageGeneration = (
        // Explicit: "generate an image of X" or "create a picture of Y"
        (imageKeywords.test(message) && imageContextWords.test(message)) ||
        // Implicit: "generate a apple", "draw me a cat", "create a sunset"
        implicitGeneration.test(message.trim()) ||
        // Direct: "generate [noun]" patterns
        /^(generate|create|draw|make|render)\s+(a|an|the)?\s*\w+(\s+\w+){0,5}$/i.test(message.trim())
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
    user, currentConversation, messages, selectedModel,
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
              
              {/* Streaming indicator */}
              {isStreaming && (
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
