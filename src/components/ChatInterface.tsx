import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Send, 
  Phone, 
  Video, 
  Users, 
  MessageSquare,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  user_id: string;
}

interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  status?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export const ChatInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Load users from Supabase
  const loadUsers = async () => {
    try {
      console.log('Loading users from crider_chat_users...');
      const { data: chatUsers, error } = await supabase
        .from('crider_chat_users')
        .select('user_id, display_name, email, avatar_url, status')
        .eq('is_synced', true)
        .order('display_name', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }

      if (chatUsers) {
        const formattedUsers = chatUsers.map(u => ({
          id: u.user_id,
          display_name: u.display_name,
          email: u.email,
          avatar_url: u.avatar_url,
          status: u.status || 'offline'
        }));
        setUsers(formattedUsers);
        console.log(`Loaded ${formattedUsers.length} users`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Loading Error",
        description: "Could not load users from database",
        variant: "destructive"
      });
    }
  };

  // Load conversations
  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Create new conversation
  const createNewConversation = async (participantUserId?: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('Creating new conversation...', { participantUserId });
      
      const { data, error } = await supabase.functions.invoke('chat-operations', {
        body: { 
          action: 'create_conversation',
          title: participantUserId ? 'New Chat with User' : 'New Chat',
          participant_user_id: participantUserId
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create conversation');
      }
      
      if (data?.conversation) {
        setConversations(prev => [data.conversation, ...prev]);
        setCurrentConversation(data.conversation.id);
        toast({
          title: "Success",
          description: "New conversation created"
        });
      } else {
        throw new Error('No conversation data returned');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: `Failed to create conversation: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversation || !user) return;

    try {
      const { data, error } = await supabase.functions.invoke('chat-operations', {
        body: {
          action: 'send_message',
          conversation_id: currentConversation,
          role: 'user',
          content: inputMessage
        }
      });

      if (error) throw error;

      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        setInputMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Type-safe mapping to ensure role is properly typed
      const typedMessages = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        created_at: msg.created_at,
        user_id: msg.user_id
      }));
      
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      loadConversations();
      
      toast({
        title: "Success",
        description: "Conversation deleted"
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  };

  // Update conversation title
  const updateConversationTitle = async (conversationId: string) => {
    if (!newTitle.trim()) {
      setEditingTitle(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ title: newTitle.trim() })
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      loadConversations();
      setEditingTitle(null);
      
      toast({
        title: "Success",
        description: "Conversation title updated"
      });
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadUsers();
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation);
    }
  }, [currentConversation]);

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
    (u.display_name && u.display_name.toLowerCase().includes(searchUsers.toLowerCase()))
  );

  if (!currentConversation) {
    return (
      <div className="h-full flex">
        {/* Users List */}
        <div className="w-1/2 border-r">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Active Users ({users.length})</h3>
              <Button 
                size="sm" 
                onClick={() => createNewConversation()}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Chat
              </Button>
            </div>
            <Input
              placeholder="Search users..."
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
              className="mb-3"
            />
          </div>
          
          <ScrollArea className="h-full">
            {filteredUsers.map((chatUser) => (
              <div 
                key={chatUser.id}
                className="p-3 border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => createNewConversation(chatUser.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {chatUser.display_name ? chatUser.display_name[0] : chatUser.email[0]}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {chatUser.display_name || chatUser.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {chatUser.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Phone className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Video className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>No users found</p>
                <p className="text-sm">Try adjusting your search</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Conversations List */}
        <div className="w-1/2">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Recent Conversations</h3>
          </div>
          
          <ScrollArea className="h-full">
            {conversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="text-lg font-semibold mb-2">No conversations yet</h4>
                  <p className="text-muted-foreground mb-4">
                    Start a conversation with someone from the user list
                  </p>
                  <Button onClick={() => createNewConversation()} disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Conversation
                  </Button>
                </div>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div 
                  key={conversation.id}
                  className="p-3 border-b hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                  onClick={() => setCurrentConversation(conversation.id)}
                >
                  <div className="flex-1">
                    {editingTitle === conversation.id ? (
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={() => updateConversationTitle(conversation.id)}
                        onKeyPress={(e) => e.key === 'Enter' && updateConversationTitle(conversation.id)}
                        className="text-sm"
                        autoFocus
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{conversation.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(conversation.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitle(conversation.id);
                        setNewTitle(conversation.title);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </div>
    );
  }

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
          <h3 className="font-semibold">
            {conversations.find(c => c.id === currentConversation)?.title}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] p-3 rounded-lg ${
                message.role === 'user' 
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
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!inputMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};