import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Users, Send, Clock, CheckCircle, AlertCircle, Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    subject: 'Welcome to CriderGPT!',
    body: `Hi there!

Welcome to CriderGPT! We're thrilled to have you join our community.

Here's what you can do with CriderGPT:
• Chat with our AI assistant
• Use specialized calculators
• Access FFA tools and resources
• And much more!

If you have any questions, feel free to reach out.

Best regards,
The CriderGPT Team`
  },
  {
    id: 'update',
    name: 'Feature Update',
    subject: 'New Features Available on CriderGPT!',
    body: `Hi there!

We've just released some exciting new features:

[Feature 1]
[Feature 2]
[Feature 3]

Log in now to check them out!

Best regards,
The CriderGPT Team`
  },
  {
    id: 'maintenance',
    name: 'Maintenance Notice',
    subject: 'Scheduled Maintenance Notice',
    body: `Hi there!

We wanted to let you know that CriderGPT will be undergoing scheduled maintenance:

Date: [DATE]
Time: [TIME]
Expected Duration: [DURATION]

During this time, the service may be temporarily unavailable. We apologize for any inconvenience.

Best regards,
The CriderGPT Team`
  },
  {
    id: 'custom',
    name: 'Custom Message',
    subject: '',
    body: ''
  }
];

interface BroadcastHistory {
  id: string;
  subject: string;
  recipients: number;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
}

export function EmailBroadcast() {
  const { user } = useAuth();
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [sendPushNotification, setSendPushNotification] = useState(false);

  useEffect(() => {
    fetchRecipientCount();
    fetchHistory();
  }, [targetAudience]);

  useEffect(() => {
    const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template && template.id !== 'custom') {
      setSubject(template.subject);
      setBody(template.body);
    }
  }, [selectedTemplate]);

  const fetchRecipientCount = async () => {
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      if (targetAudience !== 'all') {
        query = query.eq('current_plan', targetAudience);
      }
      
      const { count } = await query;
      setRecipientCount(count || 0);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('broadcast_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching broadcast history:', error);
        return;
      }

      if (data) {
        setHistory(data.map(item => ({
          id: item.id,
          subject: item.subject,
          recipients: item.recipients_count,
          sent_at: item.sent_at,
          status: item.status as 'sent' | 'failed' | 'pending'
        })));
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSendBroadcast = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please fill in both subject and message body');
      return;
    }

    setSending(true);
    try {
      // This would call an edge function to send emails via Resend
      const { data, error } = await supabase.functions.invoke('send-broadcast', {
        body: {
          targetAudience,
          subject,
          body,
          sendPushNotification
        }
      });

      if (error) throw error;

      // If push notifications are enabled, also insert into user_notifications table
      if (sendPushNotification) {
        // Get all user IDs based on target audience
        let query = supabase.from('profiles').select('user_id');
        if (targetAudience !== 'all') {
          query = query.eq('current_plan', targetAudience);
        }
        
        const { data: users } = await query;
        
        if (users && users.length > 0) {
          // Insert notifications for all target users
          const notifications = users.map(u => ({
            user_id: u.user_id,
            type: 'broadcast',
            title: subject,
            message: body.substring(0, 200),
            data: { targetAudience, sentBy: user?.id }
          }));
          
          await supabase.from('user_notifications').insert(notifications);
        }
      }

      toast.success(`Broadcast queued for ${recipientCount} recipients${sendPushNotification ? ' (with push notifications)' : ''}`);
      setSubject('');
      setBody('');
      setSelectedTemplate('custom');
      setSendPushNotification(false);
      fetchHistory();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Failed to send broadcast. Make sure the edge function is deployed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Mail className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Email Broadcasting</h2>
          <p className="text-sm text-muted-foreground">Send mass emails to your users</p>
        </div>
      </div>

      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose" className="gap-2">
            <Send className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column - Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Broadcast Settings</CardTitle>
                <CardDescription>Configure your email broadcast</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="free">Free Tier Only</SelectItem>
                      <SelectItem value="plus">Plus Tier Only</SelectItem>
                      <SelectItem value="pro">Pro Tier Only</SelectItem>
                      <SelectItem value="lifetime">Lifetime Members</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {recipientCount} recipients
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TEMPLATES.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Push Notification Toggle */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label htmlFor="push-notification" className="font-medium">Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">Also send browser push notifications</p>
                      </div>
                    </div>
                    <Switch
                      id="push-notification"
                      checked={sendPushNotification}
                      onCheckedChange={setSendPushNotification}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Compose */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compose Message</CardTitle>
                <CardDescription>Write your broadcast message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Email subject line..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Message Body</Label>
                  <Textarea
                    id="body"
                    placeholder="Write your message..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                </div>

                <Button 
                  onClick={handleSendBroadcast} 
                  disabled={sending || recipientCount === 0}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {recipientCount} Recipients
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Broadcast History</CardTitle>
              <CardDescription>Previous email broadcasts</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No broadcasts sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(item => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        {item.status === 'sent' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{item.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.recipients} recipients • {new Date(item.sent_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={item.status === 'sent' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
