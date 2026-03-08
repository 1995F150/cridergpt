import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileJson, Trash2, Loader2, MessageSquare, CheckCircle } from 'lucide-react';

interface ConversationImport {
  id: string;
  source: string;
  filename: string;
  message_count: number;
  status: string;
  created_at: string;
}

export function ConversationImporter() {
  const { toast } = useToast();
  const [imports, setImports] = useState<ConversationImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('conversation_imports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setImports(data);
      const total = data.reduce((sum: number, i: any) => sum + (i.message_count || 0), 0);
      setTotalMessages(total);
    }
    setLoading(false);
  };

  const parseChatGPTExport = (json: any[]): { role: string; content: string; timestamp: string | null }[] => {
    const messages: { role: string; content: string; timestamp: string | null }[] = [];

    for (const conversation of json) {
      if (conversation.mapping) {
        for (const nodeId of Object.keys(conversation.mapping)) {
          const node = conversation.mapping[nodeId];
          const msg = node?.message;
          if (msg?.content?.parts?.length > 0 && msg.content.parts[0]) {
            const content = msg.content.parts.filter((p: any) => typeof p === 'string').join('\n');
            if (content.trim()) {
              messages.push({
                role: msg.author?.role === 'assistant' ? 'assistant' : 'user',
                content: content.trim(),
                timestamp: msg.create_time ? new Date(msg.create_time * 1000).toISOString() : null,
              });
            }
          }
        }
      }
    }
    return messages;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ title: 'Invalid file', description: 'Please upload a .json file', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const conversations = Array.isArray(json) ? json : [json];
      const parsedMessages = parseChatGPTExport(conversations);

      if (parsedMessages.length === 0) {
        toast({ title: 'No messages found', description: 'Could not parse any messages from this file', variant: 'destructive' });
        setImporting(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create import record
      const { data: importRecord, error: importError } = await (supabase as any)
        .from('conversation_imports')
        .insert({
          user_id: user.id,
          source: 'chatgpt',
          filename: file.name,
          message_count: parsedMessages.length,
          status: 'processing',
          raw_json: conversations,
        })
        .select()
        .single();

      if (importError) throw importError;

      // Insert parsed messages in batches
      const batchSize = 100;
      for (let i = 0; i < parsedMessages.length; i += batchSize) {
        const batch = parsedMessages.slice(i, i + batchSize).map(msg => ({
          import_id: importRecord.id,
          role: msg.role,
          content: msg.content,
          message_timestamp: msg.timestamp,
        }));

        const { error: msgError } = await (supabase as any)
          .from('imported_messages')
          .insert(batch);

        if (msgError) {
          console.error('Batch insert error:', msgError);
        }
      }

      // Update status
      await (supabase as any)
        .from('conversation_imports')
        .update({ status: 'completed' })
        .eq('id', importRecord.id);

      toast({
        title: 'Import Complete',
        description: `Imported ${parsedMessages.length} messages from ${file.name}`,
      });

      fetchImports();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('conversation_imports')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: 'Deleted', description: 'Import and its messages removed' });
      fetchImports();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            ChatGPT Conversation Import
          </CardTitle>
          <CardDescription>
            Upload your ChatGPT export JSON so CriderGPT can learn from your conversation history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={importing}
                className="cursor-pointer"
              />
            </div>
            {importing && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </div>
            )}
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {totalMessages} total messages imported
            </span>
            <span>{imports.length} imports</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : imports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No imports yet. Upload a ChatGPT JSON export above.</p>
          ) : (
            <div className="space-y-3">
              {imports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileJson className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{imp.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {imp.message_count} messages • {new Date(imp.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={imp.status === 'completed' ? 'default' : 'secondary'}>
                      {imp.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {imp.status}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(imp.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
