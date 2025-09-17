import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Upload, 
  Brain, 
  Loader2, 
  FileImage, 
  Download,
  Sparkles 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function DocumentAIPanel() {
  const [documentText, setDocumentText] = useState("");
  const [question, setQuestion] = useState("");
  const [analysisType, setAnalysisType] = useState("general");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    if (file.type === 'text/plain') {
      const text = await file.text();
      setDocumentText(text);
    } else if (file.type === 'application/pdf') {
      toast({
        title: "PDF Upload",
        description: "PDF parsing coming soon. Please copy and paste the text for now.",
      });
    } else {
      toast({
        title: "Unsupported Format",
        description: "Please upload a text file or paste your document content.",
        variant: "destructive"
      });
    }
  };

  const analyzeDocument = async () => {
    if (!documentText.trim() || !question.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both document text and a question.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('document-ai-analysis', {
        body: {
          documentText,
          question,
          analysisType
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      
      toast({
        title: "Analysis Complete! 🧠",
        description: "Your document has been analyzed by AI.",
      });
    } catch (error: any) {
      console.error('Document analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadAnalysis = () => {
    if (!analysis) return;
    
    const content = `Document Analysis Report
Generated: ${new Date().toLocaleString()}
File: ${fileName || 'Text Input'}
Analysis Type: ${analysisType}
Question: ${question}

Analysis:
${analysis}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document-analysis-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const questionSuggestions = {
    agricultural: [
      "What are the key farming recommendations in this document?",
      "Analyze the crop yield data and provide insights",
      "What financial implications does this agricultural plan have?",
      "Identify any sustainability practices mentioned"
    ],
    financial: [
      "Summarize the financial performance and key metrics",
      "What are the main revenue streams and expenses?", 
      "Identify potential cost-saving opportunities",
      "What are the financial risks mentioned?"
    ],
    legal: [
      "What are the main legal obligations outlined?",
      "Identify any compliance requirements",
      "Summarize the terms and conditions",
      "What are the key legal risks?"
    ],
    general: [
      "Summarize the main points of this document",
      "What are the key takeaways?",
      "Identify any action items or next steps",
      "What questions should I ask based on this content?"
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Document AI Analyzer</h2>
        <Badge variant="secondary" className="ml-auto">
          <Sparkles className="h-3 w-3 mr-1" />
          Premium
        </Badge>
      </div>

      {/* Document Upload/Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx"
              className="hidden"
            />
          </div>
          
          {fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileImage className="h-4 w-4" />
              {fileName}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="document-text">Document Content</Label>
            <Textarea
              id="document-text"
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your document content here or upload a file above..."
              className="min-h-[200px]"
            />
            <div className="text-sm text-muted-foreground">
              Characters: {documentText.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Analysis Type</Label>
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Analysis</SelectItem>
                <SelectItem value="agricultural">Agricultural/FFA Focus</SelectItem>
                <SelectItem value="financial">Financial Analysis</SelectItem>
                <SelectItem value="legal">Legal Document Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question">Your Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about this document?"
              className="min-h-[80px]"
            />
          </div>

          {/* Quick Questions */}
          <div className="space-y-2">
            <Label>Quick Questions</Label>
            <div className="grid gap-2">
              {questionSuggestions[analysisType as keyof typeof questionSuggestions]?.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start h-auto p-3"
                  onClick={() => setQuestion(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={analyzeDocument}
            disabled={isAnalyzing || !documentText.trim() || !question.trim()}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analyze Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              AI Analysis Results
              <Button onClick={downloadAnalysis} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {analysis}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}