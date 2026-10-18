import { historyFetch } from '@/utils/chatRequest';
import { mergeMessages, selectionKey, recordedModel } from '@/utils/chatHistory';
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  tokens_used?: number;
  metadata?: { model?: string; provider?: string; answer_origin?: string; [key: string]: unknown };
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

type AiBackendMode = "auto" | "cloud" | "local";

type AiRequestBody = {
  message: string;
  conversation_history: Array<{ role: "user" | "assistant"; content: string }>;
  sensor_context?: string;
  image_url?: string;
};

type AiResponseShape = {
  response: string;
  tokens_used?: number;
  model?: string;
  source?: "local" | "cloud";
  error?: string;
};

const SUPABASE_FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_BASE ?? "https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1";

const AI_BACKEND_MODE: AiBackendMode = (import.meta.env.VITE_AI_BACKEND_MODE as AiBackendMode) ?? "auto";

/**
 * Point this to either:
 * - a LOCAL copy of chat-with-ai, if you run that function locally
 * - OR your own local server endpoint, like http://192.168.1.50:8000/chat
 *
 * Example:
 * VITE_LOCAL_CHAT_URL=http://192.168.1.50:8000/chat
 * or
 * VITE_LOCAL_CHAT_URL=http://192.168.1.50:54321/functions/v1/chat-with-ai
 */
const LOCAL_CHAT_URL = import.meta.env.VITE_LOCAL_CHAT_URL ?? "";

export const useChat = () => {
  const { user } = useAuth();
  const ownerId = user?.id;
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const [conversationQuery, setConversationQuery] = useState('');
  const [nextConversationOffset, setNextConversationOffset] = useState<number | null>(null);
  const [nextMessageCursor, setNextMessageCursor] = useState<{ created_at: string; id: string } | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const selectedRef = useRef(currentConversation); selectedRef.current = currentConversation;
  const userRef = useRef(user?.id); userRef.current = user?.id;
  const messageGeneration = useRef(0);
  const conversationGeneration = useRef(0);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const token = await getAccessToken();

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [getAccessToken]);

  const loadConversations = useCallback(async (offset = 0) => {
    if (!user) return;
    const generation = ++conversationGeneration.current;
    const owner = user.id;
    setIsLoadingConversations(true);
    try {
      const params = new URLSearchParams({ action: 'conversations', limit: '40', offset: String(offset), q: conversationQuery });
      const response = await historyFetch(`${SUPABASE_FUNCTIONS_BASE}/chat-operations?${params}`, { headers: await getAuthHeaders() });
      if (!response.ok) throw new Error('Could not load conversation history.');
      const data = await response.json();
      if (generation !== conversationGeneration.current || userRef.current !== owner) return;
      setConversations(previous => offset ? [...new Map([...previous, ...(data.conversations || [])].map(c => [c.id, c])).values()] : data.conversations || []);
      setNextConversationOffset(data.next_offset ?? null);
    } catch {
      if (generation === conversationGeneration.current && userRef.current === owner) toast({ title: 'History unavailable', description: 'Could not load conversations. Try refreshing history.', variant: 'destructive' });
    } finally { if (generation === conversationGeneration.current) setIsLoadingConversations(false); }
  }, [user, conversationQuery, getAuthHeaders, toast]);

  const loadMessages = useCallback(async (conversationId: string, before?: { created_at: string; id: string }) => {
    if (!user) return;
    const generation = ++messageGeneration.current;
    const owner = user.id;
    setIsLoadingMessages(true); setHistoryError(null);
    try {
      const params = new URLSearchParams({ action: 'messages', conversation_id: conversationId, limit: '60' });
      if (before) params.set('before', JSON.stringify(before));
      const response = await historyFetch(`${SUPABASE_FUNCTIONS_BASE}/chat-operations?${params}`, { headers: await getAuthHeaders() });
      if (!response.ok) throw new Error('Could not load this conversation.');
      const data = await response.json();
      if (generation !== messageGeneration.current || userRef.current !== owner || selectedRef.current !== conversationId) return;
      setMessages(previous => mergeMessages(data.messages || [], previous));
      setNextMessageCursor(data.next_before ?? null);
    } catch {
      if (generation === messageGeneration.current && userRef.current === owner && selectedRef.current === conversationId) setHistoryError('Messages could not be loaded. Retry before sending another message.');
    } finally { if (generation === messageGeneration.current) setIsLoadingMessages(false); }
  }, [user, getAuthHeaders]);

  const createConversation = useCallback(
    async (title: string = "New Chat", participantUserId?: string) => {
      if (!user) return null;

      try {
        const response = await historyFetch(`${SUPABASE_FUNCTIONS_BASE}/chat-operations?action=create_conversation`, {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ title, participant_user_id: participantUserId }),
        });

        if (!response.ok) throw new Error("Failed to create conversation");

        const data = await response.json();
        await loadConversations();

        toast({
          title: "Success",
          description: participantUserId ? "DM conversation created" : "New conversation created",
        });

        return data.conversation;
      } catch (error) {
        console.error("Error creating conversation:", error);
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, toast, loadConversations, getAuthHeaders],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!user) return null;

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage.from("chat-images").upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(fileName);

        return urlData.publicUrl;
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: "Error",
          description: "Failed to upload image",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, toast],
  );

  const uploadFile = useCallback(
    async (file: File, fileType: string) => {
      if (!user) return null;

      try {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const bucket = fileType === "image" ? "chat-images" : "user-files";

        const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

        return urlData.publicUrl;
      } catch (error) {
        console.error(`Error uploading ${fileType}:`, error);
        toast({
          title: "Error",
          description: `Failed to upload ${fileType}`,
          variant: "destructive",
        });
        return null;
      }
    },
    [user, toast],
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      role: "user" | "assistant" = "user",
      tokensUsed?: number,
      imageUrl?: string,
      metadata?: Record<string, unknown>,
      clientMessageId?: string,
    ) => {
      if (!user || userRef.current !== user.id) return null;

      try {
        const response = await historyFetch(`${SUPABASE_FUNCTIONS_BASE}/chat-operations?action=send_message`, {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            conversation_id: conversationId,
            role,
            content,
            tokens_used: tokensUsed || 0,
            image_url: imageUrl,
            metadata,
            client_message_id: clientMessageId || (typeof metadata?.request_id === "string" && /^[a-f0-9-]{36}$/i.test(metadata.request_id) ? metadata.request_id : crypto.randomUUID()),
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const data = await response.json();

        if (userRef.current === user.id && conversationId === selectedRef.current) {
          setMessages((prev) => mergeMessages(prev, [data.message]));
        }

        return data.message;
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, toast, getAuthHeaders],
  );

  const callCloudAI = useCallback(
    async (body: AiRequestBody): Promise<AiResponseShape> => {
      const response = await historyFetch(`${SUPABASE_FUNCTIONS_BASE}/chat-with-ai`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Cloud AI failed: ${response.status} ${text}`);
      }

      const data = await response.json();
      return {
        ...data,
        source: "cloud",
      };
    },
    [getAuthHeaders],
  );

  const callLocalAI = useCallback(
    async (body: AiRequestBody): Promise<AiResponseShape> => {
      if (!LOCAL_CHAT_URL) {
        throw new Error("VITE_LOCAL_CHAT_URL is not configured");
      }

      const token = await getAccessToken();

      const response = await historyFetch(LOCAL_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Local AI failed: ${response.status} ${text}`);
      }

      const data = await response.json();
      return {
        ...data,
        source: "local",
      };
    },
    [getAccessToken],
  );

  const getAIResponse = useCallback(
    async (body: AiRequestBody): Promise<AiResponseShape> => {
      if (AI_BACKEND_MODE === "local") {
        return await callLocalAI(body);
      }

      if (AI_BACKEND_MODE === "cloud") {
        return await callCloudAI(body);
      }

      try {
        return await callLocalAI(body);
      } catch (localError) {
        console.warn("Local AI failed, falling back to cloud:", localError);
        return await callCloudAI(body);
      }
    },
    [callLocalAI, callCloudAI],
  );

  const sendMessageWithAI = useCallback(
    async (conversationId: string, userMessage: string, imageUrl?: string, sensorContext?: string) => {
      if (!user || isLoading) return null;

      setIsLoading(true);

      try {
        const savedUserMessage = await sendMessage(conversationId, userMessage, "user", undefined, imageUrl);

        if (!savedUserMessage) {
          throw new Error("Failed to save user message");
        }

        const conversationHistory = [
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          {
            role: "user" as const,
            content: userMessage,
          },
        ];

        const aiData = await getAIResponse({
          message: userMessage,
          conversation_history: conversationHistory,
          sensor_context: sensorContext || undefined,
          image_url: imageUrl,
        });

        if (!aiData?.response) {
          throw new Error(aiData?.error || "AI returned no response");
        }

        await sendMessage(conversationId, aiData.response, "assistant", aiData.tokens_used, undefined, recordedModel(aiData));

        return aiData;
      } catch (error) {
        console.error("Error in AI conversation:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to get AI response",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, isLoading, sendMessage, messages, toast, getAIResponse],
  );

  const updateConversationTitle = useCallback(
    async (conversationId: string, title: string) => {
      if (!user) return;

      try {
        const response = await historyFetch(`${SUPABASE_FUNCTIONS_BASE}/chat-operations?action=update_conversation`, {
          method: "PUT",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            conversation_id: conversationId,
            title,
          }),
        });

        if (!response.ok) throw new Error("Failed to update conversation");

        await loadConversations();

        toast({
          title: "Success",
          description: "Conversation title updated",
        });
      } catch (error) {
        console.error("Error updating conversation:", error);
        toast({
          title: "Error",
          description: "Failed to update conversation",
          variant: "destructive",
        });
      }
    },
    [user, toast, loadConversations, getAuthHeaders],
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      try {
        const response = await historyFetch(
          `${SUPABASE_FUNCTIONS_BASE}/chat-operations?action=delete_conversation&conversation_id=${conversationId}`,
          {
            method: "DELETE",
            headers: await getAuthHeaders(),
          },
        );

        if (!response.ok) throw new Error("Failed to delete conversation");

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
        console.error("Error deleting conversation:", error);
        toast({
          title: "Error",
          description: "Failed to delete conversation",
          variant: "destructive",
        });
      }
    },
    [user, toast, currentConversation, loadConversations, getAuthHeaders],
  );

  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.conversation_id === currentConversation) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return mergeMessages(prev, [newMessage]);
            });
          }
        },
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel("chat_conversations_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_conversations",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [user, currentConversation, loadConversations]);

  useEffect(() => {
    messageGeneration.current++; conversationGeneration.current++;
    setConversations([]); setMessages([]); setNextMessageCursor(null); setNextConversationOffset(null); setHistoryError(null);
    let saved: string | null = null;
    try { if (ownerId) saved = localStorage.getItem(selectionKey(ownerId)); } catch { /* storage may be disabled */ }
    setCurrentConversation(saved); selectedRef.current = saved;
  }, [ownerId]);

  useEffect(() => { const timer = setTimeout(() => { if (user) void loadConversations(); }, 250); return () => clearTimeout(timer); }, [user, loadConversations]);

  useEffect(() => {
    setMessages([]); setNextMessageCursor(null); setHistoryError(null);
    messageGeneration.current++;
    if (currentConversation && ownerId) void loadMessages(currentConversation);
    try {
      if (ownerId) {
        if (currentConversation) localStorage.setItem(selectionKey(ownerId), currentConversation);
        else localStorage.removeItem(selectionKey(ownerId));
      }
    } catch { /* chat works without local storage */ }
  }, [currentConversation, ownerId, loadMessages]);

  return {
    conversations,
    conversationQuery, setConversationQuery,
    nextConversationOffset, nextMessageCursor, isLoadingMessages, historyError,
    loadMoreConversations: () => nextConversationOffset !== null && loadConversations(nextConversationOffset),
    loadOlderMessages: () => currentConversation && nextMessageCursor && loadMessages(currentConversation, nextMessageCursor),
    currentConversation,
    setCurrentConversation,
    messages,
    isLoading,
    isLoadingConversations,
    aiBackendMode: AI_BACKEND_MODE,
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
