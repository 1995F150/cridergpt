import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Phone, Video, MapPin, Globe, Settings, Users, Mic, MicOff, VideoOff, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeatureGate } from "@/components/FeatureGate";
import { SocialChatInterface } from "@/components/SocialChatInterface";
import { VideoCallInterface } from "@/components/VideoCallInterface";
import { supabase } from "@/integrations/supabase/client";

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
      // Use IP geolocation API for auto-detection
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setDetectedRegion(data.country_code || "US");
      
      // Store location in user's Crider Chat profile if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('crider_chat_users')
          .update({
            location: {
              country: data.country_code || "US",
              city: data.city || "Unknown",
              region: data.region || "Unknown",
              detected: "auto",
              timestamp: new Date().toISOString()
            }
          })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.log('Region detection fallback to US');
      setDetectedRegion("US");
    }
  };

  const startVideoCall = () => {
    setIsInCall(true);
    toast({
      title: "Video Call Started",
      description: "Initializing video call interface...",
    });
  };

  const startVoiceCall = () => {
    setIsInCall(true);
    toast({
      title: "Voice Call Started", 
      description: "Initializing voice call interface...",
    });
  };

  const endCall = () => {
    setIsInCall(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    toast({
      title: "Call Ended",
      description: "You have left the call.",
    });
  };

  return (
    <FeatureGate feature="crider_chat" fallback={
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Crider Chat - Social Platform</h3>
            <p className="text-muted-foreground mb-4">Connect with friends, send messages, and make video calls</p>
            <p className="text-green-500 font-semibold">✅ Free social platform for everyone!</p>
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
                  <h4 className="font-semibold text-sm mb-2">🌍 Social Platform Features:</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">Friend Requests</Badge>
                    <Badge variant="secondary">Direct Messaging</Badge>
                    <Badge variant="secondary">Voice Calls</Badge>
                    <Badge variant="secondary">Video Calls</Badge>
                    <Badge variant="secondary">User Discovery</Badge>
                    <Badge variant="secondary">Real-time Chat</Badge>
                  </div>
                </div>
                <SocialChatInterface />
              </div>
            </TabsContent>

            <TabsContent value="calls" className="flex-1 mt-4">
              {isInCall ? (
                <div className="h-96">
                  <VideoCallInterface 
                    onEndCall={endCall} 
                    isVideoCall={true}
                  />
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
                    <p className="text-sm text-muted-foreground mt-4">
                      Real-time video and voice calling with friends
                    </p>
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