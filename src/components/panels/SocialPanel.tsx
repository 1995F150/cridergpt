import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialChatInterface } from '@/components/SocialChatInterface';
import { VideoCallInterface } from '@/components/VideoCallInterface';
import { SnapchatLikeInterface } from '@/components/SnapchatLikeInterface';
import { UserDirectory } from '@/components/UserDirectory';
import { StoryManager } from '@/components/StoryManager';
import { MessageCircle, Users, Camera, Video, BookOpen } from 'lucide-react';

export function SocialPanel() {
  const [selectedFriend, setSelectedFriend] = useState<{id: string, name: string} | null>(null);
  const [activeVideoCall, setActiveVideoCall] = useState(false);

  const handleStartVideoCall = (friendId: string, friendName: string) => {
    setSelectedFriend({id: friendId, name: friendName});
    setActiveVideoCall(true);
  };

  const handleEndVideoCall = () => {
    setActiveVideoCall(false);
    setSelectedFriend(null);
  };

  // If there's an active video call, show the video interface
  if (activeVideoCall && selectedFriend) {
    return (
      <VideoCallInterface
        friendId={selectedFriend.id}
        friendName={selectedFriend.name}
        onCallEnd={handleEndVideoCall}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Crider Chat</h2>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="camera" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video Call
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Stories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <SocialChatInterface />
        </TabsContent>

        <TabsContent value="camera" className="space-y-4">
          <SnapchatLikeInterface />
        </TabsContent>

        <TabsContent value="directory" className="space-y-4">
          <UserDirectory onStartChat={(userId, username) => {
            console.log('Starting chat with:', userId, username);
            // Handle chat start logic here
          }} />
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <VideoCallInterface 
            friendName="Select a friend to call"
          />
        </TabsContent>

        <TabsContent value="stories" className="space-y-4">
          <StoryManager friends={[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}