import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Bot, Code, Database, Upload, Zap, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface FixxyMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'code' | 'sql' | 'deployment' | 'api' | 'text';
  metadata?: any;
}

interface FixxyBotProps {
  isOpen: boolean;
  onClose: () => void;
}

const FixxyBot: React.FC<FixxyBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<FixxyMessage[]>([
    {
      id: '1',
      role: 'system',
      content: '🔧 **Fixxy Bot Online** - I have full developer access and can:\n\n• Generate and deploy code\n• Execute SQL queries and database operations\n• Access all CriderOS APIs\n• Debug and fix system issues\n• Deploy changes in real-time\n\nWhat would you like me to help you with?',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeCode = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: { prompt: `Execute this code: ${code}` }
      });
      
      if (error) throw error;
      return data.generatedText;
    } catch (error) {
      console.error('Code execution error:', error);
      return `Error executing code: ${error.message}`;
    }
  };

  const executeSQLQuery = async (query: string) => {
    try {
      // Use supabase functions for SQL execution
      const { data, error } = await supabase.functions.invoke('execute-sql', {
        body: { query }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('SQL execution error:', error);
      return { success: false, error: error.message };
    }
  };

  const deployChanges = async (changes: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('deploy-changes', {
        body: { changes }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Deployment error:', error);
      return { success: false, error: error.message };
    }
  };

  const processFixxyRequest = async (userInput: string) => {
    setIsLoading(true);
    
    try {
      // Determine the type of request
      const lowerInput = userInput.toLowerCase();
      let operationType = 'text';
      let result = '';

      if (lowerInput.includes('autonomous') || lowerInput.includes('monitor') || lowerInput.includes('start fixxy')) {
        operationType = 'deployment';
        // Start autonomous mode
        const { data, error } = await supabase.functions.invoke('fixxy-autonomous', {
          body: { action: 'start_autonomous_mode' }
        });
        
        if (error) throw error;
        result = `🤖 **Autonomous Mode Activated**\n\n${data.message}\n\n**Active Tasks:**\n${data.tasks.map(t => `• ${t.description}`).join('\n')}\n\nFixxy is now monitoring your system 24/7 and will automatically fix issues, push updates, and maintain optimal performance.`;
      } else if (lowerInput.includes('status') || lowerInput.includes('what are you doing')) {
        operationType = 'api';
        const { data, error } = await supabase.functions.invoke('fixxy-autonomous', {
          body: { action: 'get_status' }
        });
        
        if (error) throw error;
        result = `📊 **Fixxy Status Report**\n\n**Status:** ${data.status}\n**Last Check:** ${new Date(data.last_check).toLocaleString()}\n\n**Recent Activities:**\n${data.recent_fixes?.map(f => `• Fixed: ${f.issue_type}`).join('\n') || 'No recent fixes'}\n\n${data.recent_updates?.map(u => `• Updated: ${u.update_type}`).join('\n') || 'No recent updates'}`;
      } else if (lowerInput.includes('sql') || lowerInput.includes('database') || lowerInput.includes('query')) {
        operationType = 'sql';
        // Extract SQL query if present
        const sqlMatch = userInput.match(/```sql\n([\s\S]*?)\n```/) || userInput.match(/`([^`]*)`/);
        if (sqlMatch) {
          const sqlQuery = sqlMatch[1];
          const { data, error } = await supabase.functions.invoke('execute-sql', {
            body: { query: sqlQuery }
          });
          
          if (error) throw error;
          result = `**SQL Query Executed:**\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\n**Result:** ${JSON.stringify(data, null, 2)}`;
        } else {
          result = 'Please provide the SQL query you want me to execute. Use backticks or code blocks to format it.';
        }
      } else if (lowerInput.includes('code') || lowerInput.includes('function') || lowerInput.includes('component')) {
        operationType = 'code';
        const { data, error } = await supabase.functions.invoke('generate-code', {
          body: { prompt: userInput }
        });
        
        if (error) throw error;
        result = `**Code Generated:**\n\n${data.generatedText}`;
      } else if (lowerInput.includes('deploy') || lowerInput.includes('update') || lowerInput.includes('fix') || lowerInput.includes('push')) {
        operationType = 'deployment';
        const { data, error } = await supabase.functions.invoke('deploy-changes', {
          body: { changes: userInput }
        });
        
        if (error) throw error;
        result = `**Deployment Completed:**\n\n${JSON.stringify(data, null, 2)}`;
      } else {
        // General AI response for troubleshooting and support
        const { data, error } = await supabase.functions.invoke('chat-with-ai', {
          body: { 
            message: `As Fixxy Bot, an autonomous AI developer with full system access, help with: ${userInput}. I can monitor systems, fix issues automatically, execute SQL, generate code, and deploy changes. How can I solve this problem?` 
          }
        });
        
        if (error) throw error;
        result = data.response;
      }

      const newMessage: FixxyMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result,
        timestamp: new Date(),
        type: operationType as any
      };

      setMessages(prev => [...prev, newMessage]);
      
    } catch (error) {
      console.error('Fixxy processing error:', error);
      const errorMessage: FixxyMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ **Error:** ${error.message}\n\nI encountered an issue processing your request. Please try again or provide more details.`,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Fixxy Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: FixxyMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    await processFixxyRequest(input);
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'code': return <Code className="w-4 h-4" />;
      case 'sql': return <Database className="w-4 h-4" />;
      case 'deployment': return <Upload className="w-4 h-4" />;
      case 'api': return <Zap className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getMessageBadge = (type?: string) => {
    switch (type) {
      case 'code': return <Badge variant="secondary">CODE</Badge>;
      case 'sql': return <Badge variant="outline">SQL</Badge>;
      case 'deployment': return <Badge variant="default">DEPLOY</Badge>;
      case 'api': return <Badge variant="destructive">API</Badge>;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <CardTitle className="text-xl">Fixxy Bot - Developer Support</CardTitle>
            <Badge variant="secondary">Full Access</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs text-primary-foreground font-medium">U</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        {getMessageIcon(message.type)}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex-1 max-w-[80%] ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.role !== 'user' && getMessageBadge(message.type)}
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'system'
                        ? 'bg-secondary border'
                        : 'bg-muted'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Fixxy to fix, deploy, query, or code anything..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="h-[60px] px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          
          <div className="text-xs text-muted-foreground text-center">
            Fixxy has full developer access: Code Generation • SQL Execution • API Access • Real-time Deployment
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FixxyBot;