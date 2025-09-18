import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wand2, Loader2, Download, Sparkles, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate, UsageLimitGate } from '@/components/FeatureGate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useToast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  timestamp: string;
  settings: {
    size: string;
    quality: string;
    style: string;
  };
}

const AGRICULTURE_PROMPTS = [
  "Vast green farmland with rows of corn under a bright blue sky",
  "Modern tractor working in a golden wheat field at sunset",
  "Dairy cows grazing in a lush green pasture with mountains in background",
  "Farmer inspecting crops in a greenhouse filled with healthy plants",
  "Aerial view of circular irrigation systems creating geometric patterns in farmland",
  "Rustic red barn surrounded by rolling hills and farming equipment",
  "Close-up of hands holding rich, dark soil with sprouting seeds",
  "Modern agricultural technology - drones surveying crop fields",
  "Harvest season - combines working through golden grain fields",
  "Organic vegetable garden with diverse crops growing in neat rows"
];

const QUICK_CATEGORIES = [
  "Agriculture & Farming",
  "Landscapes & Nature", 
  "Business & Professional",
  "Abstract & Artistic",
  "Animals & Wildlife"
];

export function AIImagePanel() {
  const { toast } = useToast();
  const { hasFeatureAccess, canUseFeature, getFeatureLimitInfo } = useFeatureGating();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("standard");
  const [style, setStyle] = useState("vivid");
  const [includeBackground, setIncludeBackground] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const limitInfo = getFeatureLimitInfo('ai_image_generator');

  if (!hasFeatureAccess('ai_image_generator')) {
    return (
      <div className="flex-1 p-8">
        <FeatureGate feature="ai_image_generator">
          <div></div>
        </FeatureGate>
      </div>
    );
  }

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your image.",
        variant: "destructive",
      });
      return;
    }

    if (!canUseFeature('ai_image_generator')) {
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your monthly image generation limit. Upgrade for higher limits!",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: {
          prompt,
          size,
          quality,
          style,
          includeBackground
        }
      });

      if (error) throw error;

      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: data.imageUrl,
        prompt,
        revisedPrompt: data.revisedPrompt,
        timestamp: new Date().toLocaleString(),
        settings: { size, quality, style }
      };

      setGeneratedImages(prev => [newImage, ...prev]);
      
      toast({
        title: "Image Generated Successfully",
        description: "Your AI-generated image is ready!",
      });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-image-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the image.",
        variant: "destructive",
      });
    }
  };

  const addPromptSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center gap-2 mb-6">
        <ImageIcon className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">AI Image Generator</h2>
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
                  <h3 className="font-medium">AI Image Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    {limitInfo.unlimited 
                      ? "Unlimited generations available" 
                      : `${limitInfo.used} of ${limitInfo.limit} used this month`
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

        <UsageLimitGate feature="ai_image_generator">
          {/* Image Generation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Your Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Image Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the image you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                      <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                      <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="hd">HD (Higher Cost)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivid">Vivid</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Background</Label>
                  <Select value={includeBackground ? "opaque" : "transparent"} onValueChange={(value) => setIncludeBackground(value === "opaque")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="transparent">Transparent</SelectItem>
                      <SelectItem value="opaque">Opaque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category for suggestions..." />
                  </SelectTrigger>
                  <SelectContent>
                    {QUICK_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory === "Agriculture & Farming" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {AGRICULTURE_PROMPTS.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => addPromptSuggestion(suggestion)}
                      className="text-left justify-start h-auto p-3 whitespace-normal"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedImages.map((image) => (
                    <div key={image.id} className="space-y-2">
                      <div className="relative group">
                        <img
                          src={image.url}
                          alt={image.prompt}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                          <Button
                            size="sm"
                            onClick={() => handleDownload(image.url, image.prompt)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium line-clamp-2">{image.prompt}</p>
                        <p className="text-xs text-muted-foreground">{image.timestamp}</p>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {image.settings.size}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {image.settings.quality}
                          </Badge>
                        </div>
                      </div>
                      
                      {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
                        <div className="p-3 bg-muted rounded-lg">
                          <Label className="text-sm font-medium">AI-Revised Prompt:</Label>
                          <p className="text-sm text-muted-foreground mt-1">{image.revisedPrompt}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </UsageLimitGate>
      </div>
    </div>
  );
}