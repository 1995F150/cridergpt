import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaSystem } from '@/hooks/useMediaSystem';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Image, Sparkles, Download, Users } from 'lucide-react';

interface MediaGeneratorProps {
  remixSource?: { url: string; path: string } | null;
  onClearRemix?: () => void;
}

export function MediaGenerator({ remixSource, onClearRemix }: MediaGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { characters, parseCharacters, parseStyleHints, buildPrompt, saveToLibrary, getImageAsBase64, logGeneration } = useMediaSystem();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedChars, setDetectedChars] = useState<string[]>([]);

  // Live detection of characters as user types
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (value.trim()) {
      const detected = parseCharacters(value);
      // Get character names for display
      const detectedNames = detected.map(slug => 
        characters.find(c => c.slug === slug)?.name || slug
      );
      setDetectedChars(detectedNames);
    } else {
      setDetectedChars([]);
    }
  };

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

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please sign in", variant: "destructive" });
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Enter a prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      // Auto-detect characters and style from prompt text
      const charSlugs = parseCharacters(prompt);
      const detectedChars = characters.filter(c => charSlugs.includes(c.slug));
      const styleHints = parseStyleHints(prompt);
      
      // Auto-apply vintage settings for historical characters
      const hasHistorical = detectedChars.some(c => c.era?.includes('1900') || c.era?.includes('Western'));
      const settings = {
        characters: charSlugs,
        style: styleHints.style || 'realistic' as const,
        blackAndWhite: styleHints.blackAndWhite || (hasHistorical && !prompt.toLowerCase().includes('color')),
        vintageTexture: styleHints.vintageTexture || hasHistorical,
        filmGrain: styleHints.filmGrain || hasHistorical,
        mood: styleHints.mood,
        lighting: undefined
      };
      
      // Build unified prompt with character context
      const unifiedPrompt = buildPrompt(prompt, settings, detectedChars);
      
      console.log('Generating with detected characters:', charSlugs);
      console.log('Unified prompt:', unifiedPrompt);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: {
          prompt: unifiedPrompt,
          characters: detectedChars.map(c => ({
            name: c.name,
            referenceUrl: c.referenceUrl,
            traits: c.traits,
            context: c.context
          })),
          settings
        }
      });

      if (error) throw error;

      if (data?.imageUrl || data?.image) {
        const imageUrl = data.imageUrl || data.image;
        
        // Handle base64 or URL
        if (imageUrl.startsWith('data:')) {
          const base64Data = imageUrl.split(',')[1];
          setImageData(base64Data);
          drawToCanvas(base64Data);
          await saveToLibrary(base64Data, 'ai_generated', {
            characters: charSlugs,
            style: settings.style
          });
        } else {
          setImageData(imageUrl);
          drawToCanvas(imageUrl);
        }
        
        // Log generation
        await logGeneration(prompt, unifiedPrompt, charSlugs, settings);
        
        toast({ title: "Success", description: "Image generated!" });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemix = async () => {
    if (!remixSource || !prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const base64 = await getImageAsBase64(remixSource.url);
      const charSlugs = parseCharacters(prompt);
      const detectedChars = characters.filter(c => charSlugs.includes(c.slug));
      const styleHints = parseStyleHints(prompt);
      
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: {
          prompt: prompt.trim(),
          mode: 'edit',
          imageUrl: base64,
          characters: detectedChars.map(c => ({
            name: c.name,
            referenceUrl: c.referenceUrl,
            traits: c.traits,
            context: c.context
          })),
          settings: { style: styleHints.style || 'realistic', ...styleHints }
        }
      });

      if (error) throw error;

      if (data?.imageUrl || data?.image) {
        const imageUrl = data.imageUrl || data.image;
        if (imageUrl.startsWith('data:')) {
          const base64Data = imageUrl.split(',')[1];
          setImageData(base64Data);
          drawToCanvas(base64Data);
          await saveToLibrary(base64Data, 'ai_edited', { style: styleHints.style || 'realistic' });
        } else {
          setImageData(imageUrl);
          drawToCanvas(imageUrl);
        }
        toast({ title: "Remixed!", description: "Image edited and saved" });
        onClearRemix?.();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!imageData) return;
    const link = document.createElement('a');
    link.download = `cridergpt_${Date.now()}.png`;
    link.href = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Image Generator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Type what you want to generate. Mention character names (Dr. Harman, Savanna, etc.) or "me" to include them with accurate likeness.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Remix indicator */}
          {remixSource && (
            <div className="p-3 bg-accent/20 rounded-lg border border-accent/30 flex items-center gap-3">
              <img src={remixSource.url} alt="Source" className="w-12 h-12 object-cover rounded" />
              <div className="flex-1">
                <p className="text-sm font-medium">Remix Mode</p>
                <p className="text-xs text-muted-foreground">Editing selected image</p>
              </div>
              <Button size="sm" variant="ghost" onClick={onClearRemix}>Cancel</Button>
            </div>
          )}

          {/* Prompt - No character selection UI, just text input */}
          <div>
            <Textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder={remixSource 
                ? "Describe how to edit this image (e.g., 'make it black and white, add Dr. Harman behind me')"
                : "Describe what you want to generate... Mention character names to include them (e.g., 'me and Savanna at sunset', 'Dr. Harman portrait in Western style')"
              }
              className="min-h-[120px]"
              maxLength={1000}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{prompt.length}/1000</p>
            </div>
          </div>

          {/* Live character detection display */}
          {detectedChars.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-3 bg-secondary/50 rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Detected:</span>
              {detectedChars.map(name => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground ml-auto">
                (will use reference photos)
              </span>
            </div>
          )}

          {/* Available characters hint */}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Available characters:</span>{' '}
            {characters.map(c => c.name).join(', ')}
          </div>

          <Button
            onClick={remixSource ? handleRemix : handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {remixSource ? 'Remixing...' : 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {remixSource ? 'Remix Image' : 'Generate Image'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              className="border-2 border-dashed border-border rounded-lg max-w-full h-auto"
              style={{ backgroundColor: 'hsl(var(--muted))' }}
            />
          </div>

          {imageData && (
            <Button onClick={downloadImage} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
