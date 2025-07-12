import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getOpenAIResponse } from "@/utils/openai";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your CriderOS AI Assistant. I can help you manage projects, deploy FS22/FS25 mods, generate API keys, and automate text responses. How can I assist you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: input,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await getOpenAIResponse(currentInput);
      const aiResponse: Message = {
        id: messages.length + 2,
        text: response,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      toast({
        title: "Success",
        description: "AI response received!",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse: Message = {
        id: messages.length + 2,
        text: "Sorry, I'm having trouble connecting right now. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    setIsVoiceActive(!isVoiceActive);
    // Voice recognition logic would go here
  };

  return (
    <Card className="h-full bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-cyber-blue">AI Assistant</span>
          <div className="flex space-x-2">
            <Badge variant={isVoiceActive ? "default" : "secondary"} className={isVoiceActive ? "bg-tech-accent" : ""}>
              {isVoiceActive ? "Voice Active" : "Text Mode"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceToggle}
              className={`border-cyber-blue/20 ${isVoiceActive ? 'bg-tech-accent/10' : ''}`}
            >
              🎤
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-3 rounded-lg ${
                  message.isUser
                    ? 'bg-cyber-blue text-background'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary text-secondary-foreground max-w-xs p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your command or question..."
              className="resize-none h-10 bg-input border-border focus:ring-cyber-blue"
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-cyber-blue hover:bg-cyber-blue-dark"
            >
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}