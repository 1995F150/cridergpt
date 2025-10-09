import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIPromptPanelProps {
  onObjectGenerated: (objectData: any) => void;
}

export function AIPromptPanel({ onObjectGenerated }: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: `You are a 3D modeling assistant. Based on this user request, generate a JSON object describing a 3D model configuration. Return ONLY valid JSON with this structure: {"type": "box|sphere|cylinder|plane", "position": {"x": 0, "y": 0, "z": 0}, "scale": {"x": 1, "y": 1, "z": 1}, "rotation": {"x": 0, "y": 0, "z": 0}, "color": "#hexcolor", "name": "descriptive name"}. User request: ${prompt}`,
          model: 'google/gemini-2.5-flash'
        }
      });

      if (error) throw error;

      // Parse AI response to extract JSON
      const response = data.response;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const objectData = JSON.parse(jsonMatch[0]);
        onObjectGenerated({
          id: `ai-${Date.now()}`,
          ...objectData,
          aiGenerated: true
        });

        toast({
          title: "Object Generated",
          description: `Created ${objectData.name || objectData.type} from AI prompt`,
        });

        setPrompt('');
      } else {
        throw new Error('Could not parse AI response');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate object",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleGenerate();
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI Assistant</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Describe what you want to create... (e.g., 'Create a red cube', 'Add a large sphere', 'Make a cylinder for a wheel')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyPress}
          className="min-h-[100px] resize-none"
          disabled={isGenerating}
        />

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Generate (Ctrl+Enter)
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Example prompts:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>"Create a red cube at the origin"</li>
          <li>"Add a blue sphere scaled to 2x"</li>
          <li>"Make a green cylinder for a tree trunk"</li>
        </ul>
      </div>
    </Card>
  );
}
