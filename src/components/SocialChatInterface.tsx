import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserPlus, 
  Send, 
  Phone, 
  Video, 
  Users, 
  MessageSquare,
  Check,
  X,
  Search,
  Camera,
  Filter,
  Settings
} from 'lucide-react';
import { StoryManager } from './StoryManager';
import { FriendshipManager } from './FriendshipManager';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  status?: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: User;
  receiver?: User;
}

interface Friend {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  friend?: User;
}

interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  friend?: User;
  lastMessage?: DirectMessage;
}

export const SocialChatInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // States
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [messageFilter, setMessageFilter] = useState('all');

  // Load available users (potential friends)
  const loadUsers = async () => {
    if (!user) return;
    
    try {
      const { data: chatUsers, error } = await supabase
        .from('crider_chat_users')
        .select('user_id, display_name, email, avatar_url, status')
        .neq('user_id', user.id)
        .eq('is_synced', true)
        .order('display_name', { ascending: true });

      if (error) throw error;

      if (chatUsers) {
        const formattedUsers = chatUsers.map(u => ({
          id: u.user_id,
          display_name: u.display_name,
          email: u.email,
          avatar_url: u.avatar_url,
          status: u.status || 'offline'
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Load friends
  const loadFriends = async () => {
    if (!user) return;

    try {
      console.log('Loading friends for user:', user.id);
      
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      console.log('Found friendships:', friendships?.length || 0);

      if (friendships) {
        const friendsWithDetails = await Promise.all(
          friendships.map(async (friendship) => {
            const friendId = friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id;
            
            // Get friend details from crider_chat_users
            const { data: friendData } = await supabase
              .from('crider_chat_users')
              .select('user_id, display_name, email, avatar_url, status')
              .eq('user_id', friendId)
              .single();

            return {
              ...friendship,
              friend: friendData ? {
                id: friendData.user_id,
                display_name: friendData.display_name,
                email: friendData.email,
                avatar_url: friendData.avatar_url,
                status: friendData.status || 'offline'
              } : null
            };
          })
        );

        console.log('Friends with details:', friendsWithDetails.length);
        setFriends(friendsWithDetails.filter(f => f.friend));
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  // Load friend requests
  const loadFriendRequests = async () => {
    if (!user) return;

    try {
      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'pending');

      if (error) throw error;

      if (requests) {
        const requestsWithDetails = await Promise.all(
          requests.map(async (request) => {
            const otherUserId = request.sender_id === user.id ? request.receiver_id : request.sender_id;
            
            const { data: userData } = await supabase
              .from('crider_chat_users')
              .select('user_id, display_name, email, avatar_url')
              .eq('user_id', otherUserId)
              .single();

            return {
              ...request,
              [request.sender_id === user.id ? 'receiver' : 'sender']: userData ? {
                id: userData.user_id,
                display_name: userData.display_name,
                email: userData.email,
                avatar_url: userData.avatar_url
              } : null
            };
          })
        );

        setFriendRequests(requestsWithDetails);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  // Send friend request
  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully."
      });

      loadFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  // Accept/decline friend request
  const handleFriendRequest = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      console.log('Handling friend request:', requestId, action);
      
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: action })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: action === 'accepted' ? "Friend request accepted" : "Friend request declined",
        description: `You have ${action} the friend request.`
      });

      // Reload data in proper order
      await loadFriendRequests();
      if (action === 'accepted') {
        // Add a small delay to ensure trigger has executed
        setTimeout(async () => {
          console.log('Refreshing friends list after acceptance');
          await loadFriends();
          // Also refresh conversations since new friendship might enable direct messaging
          await loadConversations();
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast({
        title: "Error",
        description: "Failed to update friend request",
        variant: "destructive"
      });
    }
  };

  // Load conversations
  const loadConversations = async () => {
    if (!user) return;

    try {
      const { data: convs, error } = await supabase
        .from('direct_conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      if (convs) {
        const conversationsWithDetails = await Promise.all(
          convs.map(async (conv) => {
            const friendId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
            
            // Get friend details
            const { data: friendData } = await supabase
              .from('crider_chat_users')
              .select('user_id, display_name, email, avatar_url, status')
              .eq('user_id', friendId)
              .single();

            // Get last message
            const { data: lastMessage } = await supabase
              .from('direct_messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...conv,
              friend: friendData ? {
                id: friendData.user_id,
                display_name: friendData.display_name,
                email: friendData.email,
                avatar_url: friendData.avatar_url,
                status: friendData.status || 'offline'
              } : null,
              lastMessage
            };
          })
        );

        setConversations(conversationsWithDetails.filter(c => c.friend));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Start conversation with friend
  const startConversation = async (friendId: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('direct_conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${friendId}),and(participant1_id.eq.${friendId},participant2_id.eq.${user.id})`)
        .single();

      if (existingConv) {
        setCurrentConversation(existingConv.id);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('direct_conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: friendId
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversation(newConv.id);
      loadConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  // Load messages for conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Send message with media filter support
  const sendMessage = async (messageType = 'text') => {
    if (!inputMessage.trim() || !currentConversation || !user) return;

    const conversation = conversations.find(c => c.id === currentConversation);
    if (!conversation) return;

    const receiverId = conversation.participant1_id === user.id ? conversation.participant2_id : conversation.participant1_id;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: currentConversation,
          sender_id: user.id,
          receiver_id: receiverId,
          content: inputMessage,
          message_type: messageType
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setInputMessage('');

      // Update conversation last_message_at
      await supabase
        .from('direct_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversation);

      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadUsers();
      loadFriends();
      loadFriendRequests();
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation);
    }
  }, [currentConversation]);

  // Check if user is already a friend or has pending request
  const getUserRelationship = (userId: string) => {
    const isFriend = friends.some(f => f.friend?.id === userId);
    const hasPendingRequest = friendRequests.some(r => 
      (r.sender_id === user?.id && r.receiver_id === userId) ||
      (r.receiver_id === user?.id && r.sender_id === userId)
    );
    return { isFriend, hasPendingRequest };
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
    (u.display_name && u.display_name.toLowerCase().includes(searchUsers.toLowerCase()))
  );

  const filteredMessages = messages.filter(message => {
    if (messageFilter === 'all') return true;
    return message.message_type === messageFilter;
  });

  if (currentConversation) {
    const conversation = conversations.find(c => c.id === currentConversation);
    
    return (
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentConversation(null)}
            >
              ← Back
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={conversation?.friend?.avatar_url} />
              <AvatarFallback>
                {conversation?.friend?.display_name?.[0] || conversation?.friend?.email?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {conversation?.friend?.display_name || conversation?.friend?.email}
              </h3>
              <p className="text-xs text-muted-foreground">
                {conversation?.friend?.status === 'online' ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                toast({
                  title: "Voice Call",
                  description: "Starting voice call with " + conversation?.friend?.display_name,
                });
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                toast({
                  title: "Video Call", 
                  description: "Starting video call with " + conversation?.friend?.display_name,
                });
              }}
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setMessageFilter(messageFilter === 'all' ? 'text' : 'all')}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messageFilter !== 'all' && (
            <div className="mb-4 p-2 bg-muted rounded text-center text-sm">
              Showing {messageFilter} messages only - <button onClick={() => setMessageFilter('all')} className="underline">Show all</button>
            </div>
          )}
          {filteredMessages.map((message) => (
            <div 
              key={message.id}
              className={`mb-4 flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
                <div 
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender_id === user?.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage('text')}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => sendMessage('image')}
              disabled={!inputMessage.trim()}
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button onClick={() => sendMessage('text')} disabled={!inputMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {friendRequests.filter(r => r.receiver_id === user?.id).length > 0 && (
              <Badge className="ml-1 bg-primary text-primary-foreground">
                {friendRequests.filter(r => r.receiver_id === user?.id).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="flex-1">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Your Friends ({friends.length})</h3>
            {friends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>No friends yet</p>
                <p className="text-sm">Add some friends to start chatting!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friendship) => (
                  <div key={friendship.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={friendship.friend?.avatar_url} />
                        <AvatarFallback>
                          {friendship.friend?.display_name?.[0] || friendship.friend?.email?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {friendship.friend?.display_name || friendship.friend?.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {friendship.friend?.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => startConversation(friendship.friend?.id!)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Voice Call",
                            description: "Starting voice call with " + friendship.friend?.display_name,
                          });
                        }}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Video Call",
                            description: "Starting video call with " + friendship.friend?.display_name,
                          });
                        }}
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="flex-1">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Friend Requests</h3>
            
            {/* Incoming Requests */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Incoming Requests</h4>
              {friendRequests.filter(r => r.receiver_id === user?.id).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.sender?.avatar_url} />
                      <AvatarFallback>
                        {request.sender?.display_name?.[0] || request.sender?.email?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {request.sender?.display_name || request.sender?.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Sent {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleFriendRequest(request.id, 'accepted')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleFriendRequest(request.id, 'declined')}
                      className="border-red-500 text-red-500 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Outgoing Requests */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Sent Requests</h4>
              {friendRequests.filter(r => r.sender_id === user?.id).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.receiver?.avatar_url} />
                      <AvatarFallback>
                        {request.receiver?.display_name?.[0] || request.receiver?.email?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {request.receiver?.display_name || request.receiver?.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Sent {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discover" className="flex-1">
          <div className="p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <h3 className="font-semibold mb-4">Discover People</h3>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((discoveredUser) => {
                  const { isFriend, hasPendingRequest } = getUserRelationship(discoveredUser.id);
                  
                  return (
                    <div key={discoveredUser.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={discoveredUser.avatar_url} />
                          <AvatarFallback>
                            {discoveredUser.display_name?.[0] || discoveredUser.email[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {discoveredUser.display_name || discoveredUser.email}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {discoveredUser.email}
                          </div>
                        </div>
                      </div>
                      {isFriend ? (
                        <Badge variant="secondary">Friends</Badge>
                      ) : hasPendingRequest ? (
                        <Badge variant="outline">Request Sent</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => sendFriendRequest(discoveredUser.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add Friend
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="chats" className="flex-1">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Recent Conversations</h3>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p>No conversations yet</p>
                <p className="text-sm">Start chatting with your friends!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setCurrentConversation(conversation.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={conversation.friend?.avatar_url} />
                        <AvatarFallback>
                          {conversation.friend?.display_name?.[0] || conversation.friend?.email?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">
                          {conversation.friend?.display_name || conversation.friend?.email}
                        </div>
                        {conversation.lastMessage && (
                          <div className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conversation.last_message_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};