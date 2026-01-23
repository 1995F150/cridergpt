import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Code, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkMessageLimit, updateMessageUsage } from "@/utils/usageTracker";

export function CodePanel() {
  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const generateCode = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for code generation.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the code generator.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Check message limit before proceeding
      const messageCheck = await checkMessageLimit(user.id);
      if (!messageCheck.allowed) {
        toast({
          title: "Message Limit Reached",
          description: "You've reached your daily message limit for this period.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: { prompt }
      });

      if (error) throw error;

      setGeneratedCode(data.reply);
      
      // Update message usage
      await updateMessageUsage(user.id);

      toast({
        title: "Code Generated",
        description: "Your code has been generated successfully!",
      });
    } catch (error) {
      console.error('Error generating code:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast({
        title: "Copied",
        description: "Code copied to clipboard!",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy code to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="code-panel h-full w-full p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Code Generator
          </CardTitle>
          <CardDescription>
            Generate code using AI. Your usage is tracked against your token limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code-prompt" className="text-sm font-medium">
              Describe the code you want to generate:
            </label>
            <Textarea
              id="code-prompt"
              placeholder="e.g., Create a React component for a user profile card with avatar, name, and email..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <Button 
            onClick={generateCode}
            disabled={loading || !prompt.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Code...
              </>
            ) : (
              <>
                <Code className="h-4 w-4 mr-2" />
                Generate Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedCode && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Code</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              <code>{generatedCode}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}