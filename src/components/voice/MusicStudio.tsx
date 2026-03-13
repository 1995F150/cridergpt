import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Mic2, Wand2 } from "lucide-react";

export function MusicStudio() {
  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-cyber-blue flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Studio
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate music using your cloned voice. Create original tracks, covers, and audio content powered by your own voice model.
          </p>

          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Mic2 className="h-5 w-5 text-cyber-blue mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-foreground">Voice-to-Song</h4>
                <p className="text-xs text-muted-foreground">
                  Sing or hum a melody and transform it into a full track with your cloned voice
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Wand2 className="h-5 w-5 text-cyber-blue mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-foreground">AI Composition</h4>
                <p className="text-xs text-muted-foreground">
                  Describe a song and let AI compose lyrics, melody, and vocals in your voice
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Music className="h-5 w-5 text-cyber-blue mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-foreground">Audio Effects</h4>
                <p className="text-xs text-muted-foreground">
                  Apply reverb, autotune, harmonies, and studio-quality effects
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            This feature is in development. Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
