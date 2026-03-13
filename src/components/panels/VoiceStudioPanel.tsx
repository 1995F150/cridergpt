import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, AudioLines, Music } from "lucide-react";
import { VoiceCloner } from "@/components/voice/VoiceCloner";
import { VoiceLibrary } from "@/components/voice/VoiceLibrary";
import { MusicStudio } from "@/components/voice/MusicStudio";
import { TextToSpeech } from "@/components/TextToSpeech";

export function VoiceStudioPanel() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="panel h-full w-full p-4 md:p-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Voice Studio</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Clone your voice, manage profiles, and generate speech — all self-hosted
        </p>

        <Tabs defaultValue="clone" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="clone" className="text-xs">
              <Mic className="h-3.5 w-3.5 mr-1" />
              Clone
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs">
              <AudioLines className="h-3.5 w-3.5 mr-1" />
              Library
            </TabsTrigger>
            <TabsTrigger value="tts" className="text-xs">
              TTS
            </TabsTrigger>
            <TabsTrigger value="music" className="text-xs">
              <Music className="h-3.5 w-3.5 mr-1" />
              Music
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clone" className="mt-4">
            <VoiceCloner onProfileCreated={() => setRefreshTrigger((p) => p + 1)} />
          </TabsContent>

          <TabsContent value="library" className="mt-4">
            <VoiceLibrary refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="tts" className="mt-4">
            <TextToSpeech />
          </TabsContent>

          <TabsContent value="music" className="mt-4">
            <MusicStudio />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
