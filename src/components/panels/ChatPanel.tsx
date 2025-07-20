import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit,
  Clock,
  Archive,
  Mic
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';

export const ChatPanel: React.FC = () => {
  const { toast } = useToast();
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    isLoading,
    isLoadingConversations,
    createConversation,
    sendMessageWithAI,
    updateConversationTitle,
    deleteConversation,
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentConversation || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    await sendMessageWithAI(currentConversation, userMessage);
  };

  const handleCreateNewChat = async () => {
    const conversation = await createConversation();
    if (conversation) {
      setCurrentConversation(conversation.id);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTitleEdit = async (conversationId: string, title: string) => {
    if (title.trim()) {
      await updateConversationTitle(conversationId, title.trim());
    }
    setEditingTitle(null);
  };

  const handleVoiceToggle = () => {
    setIsVoiceActive(!isVoiceActive);
    toast({
      title: isVoiceActive ? "Voice Mode Disabled" : "Voice Mode Enabled",
      description: isVoiceActive ? "Switched to text mode" : "Voice recognition activated",
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  const currentConversationData = conversations.find(c => c.id === currentConversation);

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Button
              size="sm"
              onClick={handleCreateNewChat}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-120px)]">
          {isLoadingConversations ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className={`mb-2 cursor-pointer transition-all hover:shadow-md ${
                    currentConversation === conversation.id
                      ? 'ring-2 ring-primary shadow-md'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setCurrentConversation(conversation.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingTitle === conversation.id ? (
                          <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={() => handleTitleEdit(conversation.id, newTitle)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleTitleEdit(conversation.id, newTitle);
                              }
                            }}
                            className="h-6 text-sm font-medium"
                            autoFocus
                          />
                        ) : (
                          <h3 className="font-medium text-sm truncate">
                            {conversation.title}
                          </h3>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(conversation.updated_at)}
                          </Badge>
                          {conversation.is_archived && (
                            <Badge variant="outline" className="text-xs">
                              <Archive className="h-3 w-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(conversation.id);
                            setNewTitle(conversation.title);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {currentConversationData?.title || 'Chat'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.length} message{messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isVoiceActive ? "default" : "secondary"} className={isVoiceActive ? "bg-primary" : ""}>
                    {isVoiceActive ? "Voice Active" : "Text Mode"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVoiceToggle}
                    className={`h-8 w-8 p-0 ${isVoiceActive ? 'bg-primary/10' : ''}`}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  {isLoading && (
                    <Badge variant="secondary" className="animate-pulse">
                      AI is typing...
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[80%] ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      <div className={`rounded-lg p-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted border'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                        {message.tokens_used && message.tokens_used > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {message.tokens_used} tokens
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3 border">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s] opacity-60"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s] opacity-80"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce opacity-100"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            {/* Input Area */}
            <div className="p-4 bg-card">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
                <span>Press Enter to send, Shift+Enter for new line</span>
                {isLoading && (
                  <span className="animate-pulse">AI is processing...</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center max-w-md mx-auto p-8">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">
                Welcome to CriderOS Chat
              </h3>
              <p className="text-muted-foreground mb-4">
                Select a conversation from the sidebar to continue chatting, or create a new one to get started.
              </p>
              <Button onClick={handleCreateNewChat} className="gap-2">
                <Plus className="h-4 w-4" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};