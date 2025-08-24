
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send, Brain, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ModelSelector from "./ModelSelector";
import { useModelSelection } from "@/hooks/useModelSelection";
import { useAILearning } from "@/hooks/useAILearning";

function OpenAIChat() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [knowledgeStats, setKnowledgeStats] = useState({
    totalInteractions: 0,
    categoriesKnown: [],
    recentTopics: []
  });
  const { toast } = useToast();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const { generateSmartResponse, getKnowledgeStats, isLoading } = useAILearning();

  useEffect(() => {
    // Load knowledge stats on component mount
    getKnowledgeStats().then(setKnowledgeStats);
  }, [getKnowledgeStats]);

  async function sendMessage() {
    if (!input.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await generateSmartResponse(input, selectedModel, 'chat');
      setReply(response);
      
      // Update knowledge stats after new interaction
      const updatedStats = await getKnowledgeStats();
      setKnowledgeStats(updatedStats);
      
      toast({
        title: "Success", 
        description: knowledgeStats.totalInteractions > 0 
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

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
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={knowledgeStats.totalInteractions > 0 
              ? "Ask me anything - I remember our past conversations..." 
              : "Start a conversation to build my knowledge..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {reply && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              CriderGPT Response:
            </p>
            <p className="whitespace-pre-wrap">{reply}</p>
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
