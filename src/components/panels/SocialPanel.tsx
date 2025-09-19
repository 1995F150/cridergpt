import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Phone, Video, MapPin, Globe, Settings, Users, Mic, MicOff, VideoOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeatureGate } from "@/components/FeatureGate";
import { ChatInterface } from "@/components/ChatInterface";

export function SocialPanel() {
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [detectedRegion, setDetectedRegion] = useState("US");
  const [onlineUsers] = useState(12); // Simulated online count
  const { toast } = useToast();

  useEffect(() => {
    detectUserRegion();
  }, []);

  const detectUserRegion = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`);
            const data = await response.json();
            setDetectedRegion(data.countryCode || "US");
          } catch (error) {
            console.log('Region detection fallback to US');
          }
        });
      }
    } catch (error) {
      console.log('Using default region settings');
    }
  };

  const startVideoCall = () => {
    setIsInCall(true);
    toast({
      title: "Video Call Started",
      description: "Connecting to video chat...",
    });
  };

  const startVoiceCall = () => {
    setIsInCall(true);
    toast({
      title: "Voice Call Started", 
      description: "Connecting to voice chat...",
    });
  };

  const endCall = () => {
    setIsInCall(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  };

  return (
    <FeatureGate feature="crider_chat" fallback={
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Crider Chat</h3>
            <p className="text-muted-foreground mb-4">Social messaging platform with voice/video calls</p>
            <Button>Upgrade to Access</Button>
          </div>
        </CardContent>
      </Card>
    }>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Crider Chat
            <Badge variant="secondary" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {detectedRegion}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {onlineUsers} online
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setAutoTranslate(!autoTranslate)}>
              <Globe className="h-4 w-4 mr-1" />
              {autoTranslate ? 'Translate: ON' : 'Translate: OFF'}
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="h-full flex flex-col">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Calls
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 mt-4">
              <div className="h-full">
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">🌍 Global Features Active:</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">Auto-Translate</Badge>
                    <Badge variant="secondary">Voice Calls</Badge>
                    <Badge variant="secondary">Video Calls</Badge>
                    <Badge variant="secondary">Ephemeral Messages</Badge>
                    <Badge variant="secondary">Map Integration</Badge>
                    <Badge variant="secondary">Privacy Controls</Badge>
                  </div>
                </div>
                <ChatInterface />
              </div>
            </TabsContent>

            <TabsContent value="calls" className="flex-1 mt-4">
              {isInCall ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="text-lg font-semibold">Call in Progress</div>
                  <div className="flex gap-4">
                    <Button
                      variant={isAudioEnabled ? "default" : "destructive"}
                      size="icon"
                      onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                    >
                      {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant={isVideoEnabled ? "default" : "destructive"}
                      size="icon"
                      onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                    >
                      {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="destructive" onClick={endCall}>
                      End Call
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4">Start a Call</h3>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={startVoiceCall} className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Voice Call
                      </Button>
                      <Button onClick={startVideoCall} className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video Call
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="map" className="flex-1 mt-4">
              <div className="h-full bg-muted rounded flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Interactive Map</h3>
                  <p className="text-muted-foreground">See where your friends are around the world</p>
                  <Badge className="mt-2">Region: {detectedRegion}</Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </FeatureGate>
  );
}