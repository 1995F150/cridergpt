import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, FileText, Upload, Loader2, Download, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate, UsageLimitGate } from '@/components/FeatureGate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useToast } from "@/hooks/use-toast";

const ANALYSIS_MODES = [
  {
    id: "agricultural",
    name: "Agricultural/FFA",
    description: "Specialized for farming, livestock, crop analysis, and FFA projects",
    icon: "🌾"
  },
  {
    id: "financial", 
    name: "Financial",
    description: "Business plans, financial statements, budgets, and economic analysis",
    icon: "💰"
  },
  {
    id: "legal",
    name: "Legal",
    description: "Contracts, agreements, compliance documents, and legal reviews",
    icon: "⚖️"
  },
  {
    id: "general",
    name: "General",
    description: "Comprehensive analysis for any type of document",
    icon: "📄"
  }
];

export function DocumentAIPanel() {
  const { toast } = useToast();
  const { hasFeatureAccess, canUseFeature, getFeatureLimitInfo } = useFeatureGating();
  const [analysisMode, setAnalysisMode] = useState("general");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limitInfo = getFeatureLimitInfo('document_analyzer');

  if (!hasFeatureAccess('document_analyzer')) {
    return (
      <div className="flex-1 p-8">
        <FeatureGate feature="document_analyzer">
          <div></div>
        </FeatureGate>
      </div>
    );
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "File Uploaded",
        description: `${file.name} is ready for analysis.`,
      });
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) {
      toast({
        title: "No File Selected",
        description: "Please upload a document to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!canUseFeature('document_analyzer')) {
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your monthly document analysis limit. Upgrade for higher limits!",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Convert file to base64 for transmission
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      const { data, error } = await supabase.functions.invoke('document-ai-analysis', {
        body: {
          fileContent,
          fileName: uploadedFile.name,
          analysisMode,
          customPrompt: customPrompt || undefined
        }
      });

      if (error) throw error;

      const result = data?.analysis || data?.output_text;
      if (!result) {
        throw new Error('No valid AI response');
      }

      setAnalysisResult(result);
      
      toast({
        title: "Analysis Complete",
        description: "Your document has been analyzed successfully!",
      });
    } catch (error) {
      console.error('Error analyzing document:', error);
      const errorMessage = error?.message || 'Failed to analyze document. Please try again.';
      setAnalysisResult('⚠️ Unable to analyze document. Please try again.');
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadReport = () => {
    if (!analysisResult || !uploadedFile) return;
    
    const reportContent = `Document Analysis Report
Generated: ${new Date().toLocaleString()}
File: ${uploadedFile.name}
Analysis Mode: ${ANALYSIS_MODES.find(m => m.id === analysisMode)?.name}

${customPrompt ? `Custom Instructions: ${customPrompt}\n\n` : ''}ANALYSIS RESULTS:
${analysisResult}`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${uploadedFile.name.split('.')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const quickPrompts = {
    agricultural: [
      "What are the key agricultural insights and recommendations?",
      "Analyze crop yield data and farming efficiency",
      "Identify opportunities for sustainable farming practices",
      "Evaluate livestock management strategies"
    ],
    financial: [
      "Summarize the financial performance and key metrics",
      "Identify potential financial risks and opportunities",
      "Analyze cash flow and profitability trends",
      "What are the main budget considerations?"
    ],
    legal: [
      "Identify key legal obligations and compliance requirements",
      "What are the main contractual terms and conditions?",
      "Highlight potential legal risks and liability issues",
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
    <div className="flex-1 p-8">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Document AI Analyzer</h2>
        <Badge variant="secondary" className="ml-auto">
          <Sparkles className="h-3 w-3 mr-1" />
          Premium
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Usage Info */}
        {limitInfo && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Document Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    {limitInfo.unlimited 
                      ? "Unlimited analysis available" 
                      : `${limitInfo.used} of ${limitInfo.limit} documents analyzed this month`
                    }
                  </p>
                </div>
                {!limitInfo.unlimited && (
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      limitInfo.used >= limitInfo.limit ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {limitInfo.limit - limitInfo.used}
                    </div>
                    <div className="text-xs text-muted-foreground">remaining</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <UsageLimitGate feature="document_analyzer">
          {/* Document Upload */}
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

              {uploadedFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <Separator />

              {/* Analysis Mode Selection */}
              <div className="space-y-2">
                <Label>Analysis Mode</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ANALYSIS_MODES.map((mode) => (
                    <Button
                      key={mode.id}
                      variant={analysisMode === mode.id ? "default" : "outline"}
                      onClick={() => setAnalysisMode(mode.id)}
                      className="h-auto p-4 flex flex-col items-start text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{mode.icon}</span>
                        <span className="font-medium">{mode.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {mode.description}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="space-y-2">
                <Label htmlFor="custom-prompt">Custom Analysis Instructions (Optional)</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Add specific instructions for the AI analysis..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Quick Prompts */}
              {analysisMode && (
                <div className="space-y-2">
                  <Label>Quick Prompts</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts[analysisMode as keyof typeof quickPrompts]?.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline" 
                        size="sm"
                        onClick={() => setCustomPrompt(prompt)}
                        className="text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={!uploadedFile || isAnalyzing}
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
                    Start Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Analysis Results
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadReport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {analysisResult}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </UsageLimitGate>
      </div>
    </div>
  );
}