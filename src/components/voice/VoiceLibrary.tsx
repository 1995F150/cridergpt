import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2, Star, Loader2, AudioLines } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceProfile {
  id: string;
  name: string;
  description: string | null;
  sample_url: string | null;
  status: string;
  is_default: boolean;
  created_at: string;
}

interface VoiceLibraryProps {
  refreshTrigger?: number;
}

export function VoiceLibrary({ refreshTrigger }: VoiceLibraryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchProfiles = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("voice_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, [user, refreshTrigger]);

  const setDefault = async (id: string) => {
    if (!user) return;
    // Clear existing defaults
    await (supabase as any)
      .from("voice_profiles")
      .update({ is_default: false })
      .eq("user_id", user.id);

    // Set new default
    await (supabase as any)
      .from("voice_profiles")
      .update({ is_default: true })
      .eq("id", id);

    toast({ title: "Default Voice Updated" });
    fetchProfiles();
  };

  const deleteProfile = async (id: string, samplePath?: string) => {
    if (samplePath) {
      await supabase.storage.from("voice-samples").remove([samplePath]);
    }
    await (supabase as any).from("voice_profiles").delete().eq("id", id);
    toast({ title: "Voice profile deleted" });
    fetchProfiles();
  };

  const playSample = (url: string, id: string) => {
    const audio = new Audio(url);
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
    audio.play();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="py-12 text-center">
          <AudioLines className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No voice profiles yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create one in the Voice Cloning tab
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <Card key={profile.id} className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground truncate">{profile.name}</h3>
                  {profile.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" /> Default
                    </Badge>
                  )}
                  <Badge
                    variant={profile.status === "ready" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {profile.status}
                  </Badge>
                </div>
                {profile.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {profile.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-1 ml-2">
                {profile.sample_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => playSample(profile.sample_url!, profile.id)}
                    disabled={playingId === profile.id}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                {!profile.is_default && (
                  <Button variant="ghost" size="icon" onClick={() => setDefault(profile.id)}>
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteProfile(profile.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
