import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tokens_used?: number;
  metadata?: any;
  image_url?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    setIsLoadingConversations(true);
    try {
      const response = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/chat-operations?action=conversations`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load conversations');
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, toast]);

  // Load messages for conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/chat-operations?action=messages&conversation_id=${conversationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Create new conversation
  const createConversation = useCallback(async (title: string = 'New Chat', participantUserId?: string) => {
    if (!user) return null;

    try {
      const response = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/chat-operations?action=create_conversation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, participant_user_id: participantUserId }),
        }
      );

      if (!response.ok) throw new Error('Failed to create conversation');
      
      const data = await response.json();
      await loadConversations();
      
      toast({
        title: "Success",
        description: participantUserId ? "DM conversation created" : "New conversation created",
      });
      
      return data.conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, loadConversations]);

  // Upload image to storage
  const uploadImage = useCallback(async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  // Upload any file to storage (PDFs, audio, video, etc.)
  const uploadFile = useCallback(async (file: File, fileType: string) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      // Use user-files bucket for non-images
      const bucket = fileType === 'image' ? 'chat-images' : 'user-files';

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${fileType}`,
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  // Send message
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    role: 'user' | 'assistant' = 'user',
    tokensUsed?: number,
    imageUrl?: string
  ) => {
    if (!user) return null;

    try {
      const response = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/chat-operations?action=send_message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            role,
            content,
            tokens_used: tokensUsed || 0,
            image_url: imageUrl,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      // Update messages if this is the current conversation
      if (conversationId === currentConversation) {
        setMessages(prev => [...prev, data.message]);
      }
      
      return data.message;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, currentConversation]);

  // Send message with AI response
  const sendMessageWithAI = useCallback(async (conversationId: string, userMessage: string, imageUrl?: string, sensorContext?: string) => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      // Send user message
      await sendMessage(conversationId, userMessage, 'user', undefined, imageUrl);

      // Get conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Get AI response
      const aiResponse = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            conversation_history: conversationHistory,
            sensor_context: sensorContext || undefined,
          }),
        }
      );

      if (!aiResponse.ok) throw new Error('Failed to get AI response');
      
      const aiData = await aiResponse.json();
      
      // Send AI response
      await sendMessage(conversationId, aiData.response, 'assistant', aiData.tokens_used);
      
      return aiData;
    } catch (error) {
      console.error('Error in AI conversation:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading, sendMessage, messages, toast]);

  // Update conversation title
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/chat-operations?action=update_conversation`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            title,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update conversation');
      
      await loadConversations();
      
      toast({
        title: "Success",
        description: "Conversation title updated",
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation",
        variant: "destructive",
      });
    }
  }, [user, toast, loadConversations]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/chat-operations?action=delete_conversation&conversation_id=${conversationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete conversation');
      
      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      await loadConversations();
      
      toast({
        title: "Success",
        description: "Conversation deleted",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  }, [user, toast, currentConversation, loadConversations]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.conversation_id === currentConversation) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('chat_conversations_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [user, currentConversation, loadConversations]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation);
    } else {
      setMessages([]);
    }
  }, [currentConversation, loadMessages]);

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    isLoading,
    isLoadingConversations,
    createConversation,
    sendMessage,
    sendMessageWithAI,
    updateConversationTitle,
    deleteConversation,
    loadConversations,
    loadMessages,
    uploadImage,
    uploadFile,
  };
};