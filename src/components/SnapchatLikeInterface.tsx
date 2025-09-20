import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CameraSystem } from '@/components/CameraSystem';
import { Camera, Video, Send, Users, MessageCircle } from 'lucide-react';

export function SnapchatLikeInterface() {
  const [showCamera, setShowCamera] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [capturedMedia, setCapturedMedia] = useState<{
    type: 'photo' | 'video';
    data: string | Blob;
  } | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Load friends list
  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;

    try {
      // Get friendships where current user is involved
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          user1_id,
          user2_id,
          crider_chat_users!friendships_user1_id_fkey(user_id, display_name, avatar_url),
          crider_chat_users!friendships_user2_id_fkey(user_id, display_name, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      // Extract friend data
      const friendsList = friendships?.map(friendship => {
        const isUser1 = friendship.user1_id === user.id;
        const friendData = isUser1 
          ? friendship.crider_chat_users[1] // user2 data
          : friendship.crider_chat_users[0]; // user1 data
        
        return friendData;
      }).filter(Boolean) || [];

      setFriends(friendsList);
      console.log('👥 Loaded friends:', friendsList.length);
      
    } catch (error) {
      console.error('❌ Error loading friends:', error);
    }
  };

  const handlePhotoCapture = (imageData: string) => {
    setCapturedMedia({
      type: 'photo',
      data: imageData
    });
    console.log('📸 Photo captured for sharing');
  };

  const handleVideoCapture = (videoBlob: Blob) => {
    setCapturedMedia({
      type: 'video',
      data: videoBlob
    });
    console.log('🎥 Video captured for sharing');
  };

  const uploadMedia = async (mediaData: string | Blob, fileName: string): Promise<string | null> => {
    try {
      let fileData: File;
      
      if (typeof mediaData === 'string') {
        // Convert base64 to blob for photos
        const response = await fetch(mediaData);
        const blob = await response.blob();
        fileData = new File([blob], fileName, { type: 'image/jpeg' });
      } else {
        // Video blob
        fileData = new File([mediaData], fileName, { type: 'video/webm' });
      }

      const filePath = `${user?.id}/${Date.now()}-${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(filePath, fileData);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      return null;
    }
  };

  const sendToFriends = async () => {
    if (!capturedMedia || selectedFriends.size === 0 || !user) {
      toast({
        title: "Cannot Send",
        description: "Please select friends and capture media first",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📤 Sending media to', selectedFriends.size, 'friends');
      
      // Upload media to storage
      const fileName = capturedMedia.type === 'photo' ? 'snap.jpg' : 'snap.webm';
      const mediaUrl = await uploadMedia(capturedMedia.data, fileName);
      
      if (!mediaUrl) {
        throw new Error('Failed to upload media');
      }

      // Send to each selected friend
      const sendPromises = Array.from(selectedFriends).map(async (friendId) => {
        // Create direct conversation if it doesn't exist
        const conversationData = {
          participant1_id: user.id < friendId ? user.id : friendId,
          participant2_id: user.id < friendId ? friendId : user.id,
          last_message_at: new Date().toISOString()
        };

        const { data: conversation, error: convError } = await supabase
          .from('direct_conversations')
          .upsert(conversationData, { 
            onConflict: 'participant1_id,participant2_id' 
          })
          .select()
          .single();

        if (convError) throw convError;

        // Send the message with media
        const messageData = {
          conversation_id: conversation.id,
          sender_id: user.id,
          receiver_id: friendId,
          content: capturedMedia.type === 'photo' ? '📸 Sent a photo' : '🎥 Sent a video',
          message_type: capturedMedia.type === 'photo' ? 'image' : 'video',
          // Store media URL in metadata or separate field
        };

        return supabase
          .from('direct_messages')
          .insert(messageData);
      });

      await Promise.all(sendPromises);
      
      toast({
        title: "Media Sent!",
        description: `Sent ${capturedMedia.type} to ${selectedFriends.size} friend(s)`,
      });

      // Reset state
      setCapturedMedia(null);
      setSelectedFriends(new Set());
      setShowCamera(false);
      
    } catch (error) {
      console.error('❌ Error sending media:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send media to friends",
        variant: "destructive"
      });
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelection = new Set(selectedFriends);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriends(newSelection);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">📸 Crider Snap</h1>
        <p className="text-muted-foreground">
          Share photos and videos with your friends instantly
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-20 flex-col gap-2">
              <Camera className="h-8 w-8" />
              <span>Take Photo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>📸 Capture & Share</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Camera Interface */}
              <CameraSystem
                onPhotoCapture={handlePhotoCapture}
                onVideoCapture={handleVideoCapture}
                mode="both"
                showControls={true}
              />

              {/* Friend Selection */}
              {capturedMedia && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Send to Friends
                    </CardTitle>
                    <CardDescription>
                      Select friends to share your {capturedMedia.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Friends List */}
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {friends.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            No friends found. Add friends to start sharing!
                          </p>
                        ) : (
                          friends.map((friend) => (
                            <div
                              key={friend.user_id}
                              onClick={() => toggleFriendSelection(friend.user_id)}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedFriends.has(friend.user_id)
                                  ? 'bg-primary/10 border-primary'
                                  : 'bg-muted/30 hover:bg-muted/50'
                              }`}
                            >
                              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                {friend.avatar_url ? (
                                  <img 
                                    src={friend.avatar_url} 
                                    alt={friend.display_name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium">
                                    {friend.display_name?.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium">{friend.display_name}</span>
                              {selectedFriends.has(friend.user_id) && (
                                <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Send Button */}
                      <Button
                        onClick={sendToFriends}
                        disabled={selectedFriends.size === 0}
                        className="w-full"
                        size="lg"
                      >
                        <Send className="h-5 w-5 mr-2" />
                        Send to {selectedFriends.size} friend(s)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button size="lg" className="h-20 flex-col gap-2" variant="outline">
          <MessageCircle className="h-8 w-8" />
          <span>View Chats</span>
        </Button>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <Camera className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Instant Photos</h3>
              <p className="text-sm text-muted-foreground">
                Take and share photos instantly with friends
              </p>
            </div>
            <div className="text-center space-y-2">
              <Video className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Video Messages</h3>
              <p className="text-sm text-muted-foreground">
                Record and send video messages in real-time
              </p>
            </div>
            <div className="text-center space-y-2">
              <Users className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold">Friend Sharing</h3>
              <p className="text-sm text-muted-foreground">
                Share with multiple friends at once
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}