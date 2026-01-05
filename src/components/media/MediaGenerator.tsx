import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaSystem } from '@/hooks/useMediaSystem';
import { supabase } from '@/integrations/supabase/client';
import { Download, Image, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';

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
  const [identityLock, setIdentityLock] = useState(true);

  const characterIndex = useMemo(() => {
    const map = new Map<string, (typeof characters)[number][]>();
    for (const c of characters) {
      const base = c.slug.split('-')[0];
      const key = base === 'dr' ? 'dr-harman' : base; // defensive fallback
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [characters]);

  const getBestAnchorFor = (baseSlug: string) => {
    const group = characterIndex.get(baseSlug) ?? characters.filter(c => c.slug === baseSlug || c.slug.startsWith(baseSlug));
    if (!group.length) return undefined;
    const primary = group.find(c => c.isPrimary);
    return primary ?? group[0];
  };

  const pickAnchorSlug = (slugs: string[]) => {
    const lower = slugs.map(s => s.toLowerCase());
    if (lower.includes('savanaa')) return 'savanaa';
    if (lower.includes('jessie')) return 'jessie';
    if (lower.includes('dr-harman')) return 'dr-harman';
    return slugs[0];
  };

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

  const drawToCanvas = (base64OrDataUrl: string) => {
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
    img.src = base64OrDataUrl.startsWith('data:') ? base64OrDataUrl : `data:image/png;base64,${base64OrDataUrl}`;
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
        style: (styleHints.style || 'realistic') as 'realistic' | 'cinematic' | 'vintage' | 'rdr2' | 'cartoon' | 'anime',
        blackAndWhite: styleHints.blackAndWhite || (hasHistorical && !prompt.toLowerCase().includes('color')),
        vintageTexture: styleHints.vintageTexture || hasHistorical,
        filmGrain: styleHints.filmGrain || hasHistorical,
        mood: styleHints.mood,
        lighting: undefined
      };

      // Build unified prompt with character context
      const unifiedPrompt = buildPrompt(prompt, settings, detectedChars);

      // If identity lock is on, we anchor generation from the primary reference image.
      // This is more reliable than text-only "likeness" constraints.
      let mode: 'edit' | undefined;
      let imageUrl: string | undefined;

      if (!remixSource && identityLock && charSlugs.length > 0) {
        const anchorSlug = pickAnchorSlug(charSlugs);
        const anchor = getBestAnchorFor(anchorSlug);
        if (anchor?.referenceUrl) {
          mode = 'edit';
          imageUrl = await getImageAsBase64(anchor.referenceUrl);
        }
      }

      console.log('Generating with detected characters:', charSlugs);
      console.log('Unified prompt:', unifiedPrompt);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: {
          prompt: unifiedPrompt,
          mode,
          imageUrl,
          // NOTE: edge function uses DB references; we still pass detected list for future compatibility
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
        const resultUrl = data.imageUrl || data.image;

        // Handle base64 or URL
        if (resultUrl.startsWith('data:')) {
          const base64Data = resultUrl.split(',')[1];
          setImageData(base64Data);
          drawToCanvas(base64Data);
          await saveToLibrary(base64Data, mode === 'edit' ? 'ai_edited' : 'ai_generated', {
            characters: charSlugs,
            style: settings.style
          });
        } else {
          setImageData(resultUrl);
          drawToCanvas(resultUrl);
        }

        await logGeneration(prompt, unifiedPrompt, charSlugs, settings);
        toast({ title: "Success", description: identityLock ? "Generated (Identity Lock on)" : "Image generated!" });
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
            Mention character names (Savanaa, Jessie, Dr. Harman). Turn on Identity Lock for best likeness.
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

          {/* Identity Lock */}
          {!remixSource && (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Label className="text-sm">Identity Lock (best match)</Label>
                  <p className="text-xs text-muted-foreground">
                    Anchors the generation from the primary reference photo to keep Savanaa consistent.
                  </p>
                </div>
              </div>
              <Switch checked={identityLock} onCheckedChange={setIdentityLock} />
            </div>
          )}

          {/* Prompt */}
          <div>
            <Textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder={remixSource
                ? "Describe how to edit this image (e.g., 'make it black and white, add Dr. Harman behind me')"
                : "Describe what you want to generate... (e.g., 'Savanaa at sunset', 'me and Savanaa at the fair')"
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
              <span className="text-xs text-muted-foreground ml-auto">(will use reference photos)</span>
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
