import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ImagePlus,
  X,
  Users
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';
import { UserDirectory } from '@/components/UserDirectory';

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
    uploadImage,
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage) || !currentConversation || isLoading) return;

    const userMessage = inputMessage.trim();
    let imageUrl: string | undefined;

    // Upload image if selected
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) return; // Upload failed
    }

    setInputMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    
    await sendMessageWithAI(currentConversation, userMessage || "Image", imageUrl);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateNewChat = async () => {
    const conversation = await createConversation();
    if (conversation) {
      setCurrentConversation(conversation.id);
    }
  };

  const handleStartDM = async (userId: string, username?: string) => {
    const title = username ? `DM with ${username}` : `DM with User`;
    const conversation = await createConversation(title, userId);
    if (conversation) {
      setCurrentConversation(conversation.id);
      toast({
        title: "DM Started",
        description: `Started conversation with ${username || 'user'}`,
      });
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
      {/* Sidebar with Tabs */}
      <div className="w-80 border-r border-border bg-card">
        <Tabs defaultValue="conversations" className="h-full">
          <div className="p-4 border-b border-border">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conversations" className="text-xs">
                <MessageSquare className="h-4 w-4 mr-1" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs">
                <Users className="h-4 w-4 mr-1" />
                Users
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="conversations" className="mt-0 h-[calc(100%-80px)]">
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

            <ScrollArea className="h-[calc(100%-80px)]">
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
          </TabsContent>

          <TabsContent value="users" className="mt-0 h-[calc(100%-80px)]">
            <UserDirectory onStartChat={handleStartDM} />
          </TabsContent>
        </Tabs>
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
                        {message.image_url && (
                          <div className="mb-2">
                            <img 
                              src={message.image_url} 
                              alt="Chat image" 
                              className="max-w-sm max-h-64 rounded-lg object-cover cursor-pointer"
                              onClick={() => window.open(message.image_url, '_blank')}
                            />
                          </div>
                        )}
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        )}
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
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <img 
                      src={imagePreview} 
                      alt="Selected image" 
                      className="max-w-32 max-h-32 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Image ready to send</p>
                      <p className="text-xs text-muted-foreground">{selectedImage?.name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={removeSelectedImage}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="px-3"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
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