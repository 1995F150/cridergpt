import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function TextToSpeech() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const generateSpeech = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to convert to speech",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: text.trim() }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Stop current audio if playing
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }

        // Create new audio element
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const newAudio = new Audio(audioUrl);
        
        newAudio.onplay = () => setIsPlaying(true);
        newAudio.onpause = () => setIsPlaying(false);
        newAudio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };

        setAudio(newAudio);
        newAudio.play();

        toast({
          title: "Success",
          description: "Text converted to speech successfully!",
        });
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        title: "Error",
        description: "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="text-cyber-blue flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Text-to-Speech
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter the text you want to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[100px] bg-background/50 border-border"
          maxLength={1000}
        />
        
        <div className="text-sm text-muted-foreground text-right">
          {text.length}/1000 characters
        </div>

        <div className="flex gap-2">
          <Button
            onClick={generateSpeech}
            disabled={isLoading || !text.trim()}
            className="bg-cyber-blue hover:bg-cyber-blue-dark text-background flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Generate Speech
              </>
            )}
          </Button>

          {isPlaying && (
            <Button
              onClick={stopAudio}
              variant="destructive"
              size="icon"
            >
              <VolumeX className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Using your custom voice for high-quality speech synthesis
        </div>
      </CardContent>
    </Card>
  );
}