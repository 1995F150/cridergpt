import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Image, Download, Video, Palette, Sparkles, User, Wand2 } from 'lucide-react';

// Creator reference photo URL
const CREATOR_PHOTO_URL = '/creator-reference.png';

export function MediaPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [style, setStyle] = useState('vivid');
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [mode, setMode] = useState<'generate' | 'creator' | 'edit'>('generate');
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert image URL to base64
  const getImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Save image to gallery
  const saveToGallery = async (base64Data: string, source: string) => {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      const fileName = `${source}_${Date.now()}.png`;
      const filePath = `${user!.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600'
        });

      if (!uploadError) {
        await supabase.from('uploaded_files').insert({
          user_id: user!.id,
          file_name: fileName,
          file_path: filePath,
          file_size: blob.size,
          file_type: 'image',
          source: source
        });
      }
    } catch (error) {
      console.error('Error saving to gallery:', error);
    }
  };

  // Draw image to canvas
  const drawToCanvas = (base64: string) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
    };
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  };

  // Standard DALL-E generation
  const generateImage = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please sign in to generate images", variant: "destructive" });
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Please enter a prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim(), size, quality, style }
      });

      if (error) throw error;

      if (data?.imageData) {
        setImageData(data.imageData);
        setRevisedPrompt(data.revisedPrompt || prompt);
        drawToCanvas(data.imageData);
        await saveToGallery(data.imageData, 'ai_generated');
        toast({ title: "Success", description: "Image generated and saved to gallery!" });
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast({ title: "Error", description: error.message || "Failed to generate image", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit/transform image using Lovable AI
  const editImage = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Please enter what you want to do with the image", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      let imageUrl = customImageUrl;
      
      // For creator mode, use the reference photo
      if (mode === 'creator') {
        imageUrl = await getImageAsBase64(CREATOR_PHOTO_URL);
      }

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: prompt.trim(),
          imageUrl: imageUrl || undefined,
          mode: mode
        }
      });

      if (error) throw error;

      if (data?.imageData) {
        setImageData(data.imageData);
        setRevisedPrompt(data.revisedPrompt || prompt);
        drawToCanvas(data.imageData);
        await saveToGallery(data.imageData, mode === 'creator' ? 'creator_edit' : 'ai_edited');
        toast({ 
          title: "Success", 
          description: mode === 'creator' 
            ? "Creator photo transformed and saved!" 
            : "Image edited and saved to gallery!" 
        });
      }
    } catch (error: any) {
      console.error('Error editing image:', error);
      toast({ title: "Error", description: error.message || "Failed to edit image", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle image file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCustomImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (mode === 'generate') {
      generateImage();
    } else {
      editImage();
    }
  };

  const downloadPNG = () => {
    if (!imageData) return;
    
    const link = document.createElement('a');
    link.download = 'cridergpt_generated_image.png';
    link.href = `data:image/png;base64,${imageData}`;
    link.click();
  };

  const downloadMP4 = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoURL(url);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'cridergpt_generated_video.webm';
        a.click();
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000); // 3 second recording
      
      toast({
        title: "Recording",
        description: "Recording 3-second video...",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record video. This feature may not be supported in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 p-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            CriderGPT AI Media Generator
          </CardTitle>
          <p className="text-muted-foreground">
            Generate, edit, and transform images with AI
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Selection */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="generate" className="flex items-center gap-1">
                  <Image className="h-4 w-4" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="creator" className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Creator
                </TabsTrigger>
                <TabsTrigger value="edit" className="flex items-center gap-1">
                  <Wand2 className="h-4 w-4" />
                  Edit
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Mode-specific info */}
            {mode === 'creator' && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <img src={CREATOR_PHOTO_URL} alt="Creator" className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-medium">Creator Mode</p>
                    <p className="text-xs text-muted-foreground">Transform Jessie's photo</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Describe how you want to transform the creator photo (e.g., "make it a cartoon", "put in a space scene")
                </p>
              </div>
            )}

            {mode === 'edit' && (
              <div className="space-y-2">
                <label className="text-sm font-medium block">Upload Image to Edit</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
                />
                {customImageUrl && (
                  <img src={customImageUrl} alt="Selected" className="w-20 h-20 object-cover rounded-lg" />
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                {mode === 'generate' ? 'Prompt' : 'What do you want to do?'}
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'generate' 
                    ? "Enter a detailed description of what you want to generate..."
                    : mode === 'creator'
                    ? "Describe the transformation (e.g., 'make it anime style', 'put in a farm scene')"
                    : "Describe how to edit the image (e.g., 'change background to sunset')"
                }
                className="min-h-[100px]"
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {prompt.length}/1000 characters
              </div>
            </div>

            {/* Only show size/quality/style for generate mode */}
            {mode === 'generate' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Size</label>
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

                <div>
                  <label className="text-sm font-medium mb-2 block">Quality</label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="hd">HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Style</label>
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
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || (mode === 'edit' && !customImageUrl)}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'generate' ? 'Generating...' : 'Processing...'}
                </>
              ) : (
                <>
                  {mode === 'generate' && <Image className="h-4 w-4 mr-2" />}
                  {mode === 'creator' && <User className="h-4 w-4 mr-2" />}
                  {mode === 'edit' && <Wand2 className="h-4 w-4 mr-2" />}
                  {mode === 'generate' ? 'Generate Image' : mode === 'creator' ? 'Transform Creator Photo' : 'Edit Image'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Generated Image
            </CardTitle>
            {revisedPrompt && revisedPrompt !== prompt && (
              <Badge variant="secondary" className="w-fit">
                Revised: {revisedPrompt}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="border-2 border-border rounded-lg max-w-full h-auto"
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            {imageData && (
              <div className="flex gap-2">
                <Button onClick={downloadPNG} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export PNG
                </Button>
                <Button onClick={downloadMP4} variant="outline" className="flex-1">
                  <Video className="h-4 w-4 mr-2" />
                  Export Video
                </Button>
              </div>
            )}

            {videoURL && (
              <div className="mt-4">
                <video 
                  src={videoURL} 
                  controls 
                  className="w-full rounded-lg border-2 border-border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">💡 Pro Tips for Better Results:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Be specific and descriptive in your prompts</li>
            <li>• Include style keywords like "photorealistic", "cartoon", "cyberpunk", etc.</li>
            <li>• Mention colors, lighting, and composition details</li>
            <li>• Use "HD" quality for more detailed images</li>
            <li>• "Vivid" style creates more dramatic, hyper-real images</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}