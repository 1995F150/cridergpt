import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Brain,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, type ChatMessage as ChatMessageType } from "@/hooks/useChat";
import { useAILearning } from "@/hooks/useAILearning";
import { useModelSelection } from "@/hooks/useModelSelection";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useToast } from "@/hooks/use-toast";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatGallery } from "@/components/chat/ChatGallery";
import { DemoExhaustedModal } from "@/components/DemoExhaustedModal";
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
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = isChatLoading || isAILoading || isStreaming;

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
    }
  }, [createConversation, setCurrentConversation]);

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
      const isImageGeneration = /\b(generate|create|make|draw)\b.*\b(image|picture|photo|art)\b/i.test(message);

      if (isImageGeneration) {
        // Use image generation
        setIsStreaming(true);
        setStreamingMessage("🎨 Generating image...");
        
        try {
          const result = await generateSmartResponse(message, selectedModel, "image_generation");
          const response = typeof result === "string" ? result : result.response;
          await sendMessage(convId, response, "assistant");
          setStreamingMessage("");
        } catch (error) {
          console.error("Image generation error:", error);
          await sendMessage(convId, "Sorry, I couldn't generate that image. Please try again.", "assistant");
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
    uploadImage, generateSmartResponse, updateConversationTitle, toast
  ]);

  // Connection error state
  if (connectionError) {
    return (
      <div className="h-full flex items-center justify-center p-8">
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

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-72" : "w-0"
        )}
      >
        {sidebarOpen && (
          <ChatSidebar
            conversations={conversations}
            currentConversation={currentConversation}
            onSelectConversation={setCurrentConversation}
            onNewChat={handleNewChat}
            onRenameConversation={updateConversationTitle}
            onDeleteConversation={deleteConversation}
            onOpenGallery={() => setGalleryOpen(true)}
            isLoading={isLoadingConversations}
          />
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
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
            
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">CriderGPT</h1>
              {!user && (
                <Badge variant="outline" className="text-xs">
                  Demo Mode
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>

        {/* Demo Mode Banner */}
        {!user && (
          <div className="bg-accent/10 border-b border-accent/20 px-4 py-2">
            <p className="text-sm text-accent-foreground">
              <Sparkles className="h-4 w-4 inline mr-1" />
              Demo Mode: {demoUsage.maxMessages - demoUsage.messagesUsed} messages remaining.
              <Button variant="link" className="text-primary p-0 ml-1 h-auto" onClick={() => window.location.href = "/auth"}>
                Sign up for unlimited access
              </Button>
            </p>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {messages.length === 0 && !currentConversation ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Brain className="h-16 w-16 text-primary/50 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Welcome to CriderGPT</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Your AI assistant for agriculture, mechanics, welding, and more.
                Ask questions, upload images for analysis, or generate AI images.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
                {[
                  "How do I troubleshoot a John Deere hydraulic issue?",
                  "What welding settings for 1/4 inch steel?",
                  "Generate an image of a modern farm at sunset",
                  "Calculate voltage drop for 200ft 12AWG wire",
                ].map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="text-left h-auto py-3 px-4"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    <span className="text-sm">{prompt}</span>
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
                <div className="flex items-center gap-3 py-4 px-4">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                    <Brain className="h-4 w-4 text-accent-foreground" />
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
              ? "Ask anything about farming, mechanics, or generate images..."
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
