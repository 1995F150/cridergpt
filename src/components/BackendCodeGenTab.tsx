import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Code2 } from "lucide-react";

const BackendCodeGenTab = () => {
  const [task, setTask] = useState("");
  const [codeResult, setCodeResult] = useState("");
  const [loading, setLoading] = useState(false);

  const sendToAI = async () => {
    if (!task.trim()) return;
    
    setLoading(true);
    setCodeResult("// Thinking...");

    try {
      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: {
          prompt: `Write backend code to: ${task}. Only output clean, production-ready code.`,
        },
      });

      if (error) {
        throw error;
      }

      setCodeResult(data?.reply || "// AI didn't return code.");
    } catch (err) {
      console.error("Error:", err);
      setCodeResult("// Error generating code. Please check your OpenAI API key configuration.");
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      sendToAI();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Code2 className="w-6 h-6" />
          Backend Code Generator
        </h2>
        <p className="text-muted-foreground">
          Generate clean, production-ready backend code using AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Code Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ex: Create Supabase auth login endpoint with error handling"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={sendToAI} 
              disabled={loading || !task.trim()}
              size="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Code"
              )}
            </Button>
          </div>

          {codeResult && (
            <div className="mt-4">
              <pre className="bg-background border rounded-lg p-4 text-sm overflow-x-auto max-h-96 font-mono">
                <code>{codeResult}</code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackendCodeGenTab;