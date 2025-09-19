import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Phone, Video, MapPin, Clock, Globe, Settings, Users, Camera, Mic, MicOff, VideoOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar?: string;
  is_ephemeral?: boolean;
  expires_at?: string;
}

interface User {
  id: string;
  display_name: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  location?: { lat: number; lng: number; city: string };
}

export function SocialPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [detectedRegion, setDetectedRegion] = useState("US");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const { toast } = useToast();

  useEffect(() => {
    initializeCriderChat();
    detectUserRegion();
    loadMessages();
    loadUsers();
    
    // Real-time subscriptions
    const messagesChannel = supabase
      .channel('crider_chat_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'crider_chat_messages'
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const initializeCriderChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user exists in Crider Chat
    const { data: profile } = await supabase
      .from('crider_chat_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      // Auto-add user to Crider Chat
      const { error } = await supabase
        .from('crider_chat_users')
        .insert({
          user_id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url,
          is_synced: true,
          sync_note: 'Auto-added to Crider Chat from CriderGPT'
        });

      if (!error) {
        toast({
          title: "Welcome to Crider Chat! 🎉",
          description: "You've been automatically connected to our social platform",
        });
      }
    }

    setCurrentUser({
      id: user.id,
      display_name: user.user_metadata?.full_name || 'User',
      avatar_url: user.user_metadata?.avatar_url,
      status: 'online'
    });
  };

  const detectUserRegion = async () => {
    try {
      // Auto-detect region using browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding to detect region/country
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            
            setDetectedRegion(data.countryCode || "US");
            
            // Auto-detect language based on region
            const regionLanguages: Record<string, string> = {
              'US': 'en', 'GB': 'en', 'CA': 'en',
              'FR': 'fr', 'DE': 'de', 'ES': 'es',
              'IT': 'it', 'JP': 'ja', 'CN': 'zh',
              'RU': 'ru', 'BR': 'pt', 'MX': 'es'
            };
            
            setPreferredLanguage(regionLanguages[data.countryCode] || 'en');
          } catch (error) {
            console.log('Region detection fallback to US');
          }
        });
      }
    } catch (error) {
      console.log('Using default region settings');
    }
  };

  const translateMessage = async (text: string, targetLang: string) => {
    if (!autoTranslate || targetLang === 'en') return text;
    
    try {
      // Simple translation simulation - in production use Google Translate API
      const translations: Record<string, Record<string, string>> = {
        'hello': { 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo' },
        'goodbye': { 'es': 'adiós', 'fr': 'au revoir', 'de': 'auf wiedersehen' }
      };
      
      let translated = text.toLowerCase();
      Object.entries(translations).forEach(([en, trans]) => {
        if (trans[targetLang]) {
          translated = translated.replace(new RegExp(en, 'gi'), trans[targetLang]);
        }
      });
      
      return translated !== text.toLowerCase() ? translated : `[Auto-translated] ${text}`;
    } catch {
      return text;
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('crider_chat_messages')
      .select(`
        *,
        crider_chat_users(display_name, avatar_url)
      `)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      const processedMessages = await Promise.all(
        data.map(async (msg: any) => ({
          ...msg,
          content: await translateMessage(msg.content, preferredLanguage),
          user_name: msg.crider_chat_users?.display_name || 'Unknown',
          user_avatar: msg.crider_chat_users?.avatar_url
        }))
      );
      setMessages(processedMessages);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('crider_chat_users')
      .select('*')
      .eq('status', 'online');

    if (data) {
      setUsers(data.map(user => ({
        id: user.user_id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        status: user.status as 'online' | 'offline' | 'away',
        location: user.location
      })));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const messageData = {
      user_id: currentUser.id,
      content: newMessage,
      is_ephemeral: false, // Can be toggled
      expires_at: null // Set to 24 hours later for ephemeral messages
    };

    const { error } = await supabase
      .from('crider_chat_messages')
      .insert(messageData);

    if (!error) {
      setNewMessage("");
    } else {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
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
            <p className="text-muted-foreground mb-4">Social messaging platform</p>
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

            <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
              {/* Online Users */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Online ({users.length})</span>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {users.map(user => (
                    <div key={user.id} className="flex flex-col items-center gap-1 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.display_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate max-w-16">{user.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto mb-4 p-2 border rounded">
                {messages.map(message => (
                  <div key={message.id} className={`flex gap-2 ${message.user_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.user_avatar} />
                      <AvatarFallback>{message.user_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col max-w-[70%] ${message.user_id === currentUser?.id ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{message.user_name}</span>
                        {message.is_ephemeral && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            24h
                          </Badge>
                        )}
                      </div>
                      <div className={`p-2 rounded-lg text-sm ${
                        message.user_id === currentUser?.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {message.content}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Type a message... (${preferredLanguage.toUpperCase()})`}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage} size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
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