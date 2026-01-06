import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  School, 
  RefreshCw,
  Wheat
} from 'lucide-react';

interface ChapterRequest {
  id: string;
  user_id: string;
  chapter_name: string;
  state: string;
  city: string | null;
  school_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

export function ChapterRequestAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ChapterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chapter_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as ChapterRequest[]) || []);
    } catch (error: any) {
      console.error('Error fetching chapter requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chapter requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request: ChapterRequest) => {
    setProcessingId(request.id);
    try {
      // First, create the chapter
      const { error: chapterError } = await supabase.from('chapters').insert({
        name: request.chapter_name,
        state: request.state,
        city: request.city,
      });

      if (chapterError) throw chapterError;

      // Then update the request status
      const { error: updateError } = await supabase
        .from('chapter_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes[request.id] || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({
        title: 'Chapter Approved!',
        description: `${request.chapter_name} has been added to the database.`,
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error approving chapter:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve chapter.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: ChapterRequest) => {
    if (!adminNotes[request.id]?.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('chapter_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes[request.id],
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Request Rejected',
        description: 'The chapter request has been rejected.',
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting chapter:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wheat className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Chapter Requests</h2>
          <Badge variant="outline">{pendingRequests.length} pending</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {pendingRequests.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-muted-foreground">No pending chapter requests!</p>
          </CardContent>
        </Card>
      )}

      {pendingRequests.map((request) => (
        <Card key={request.id} className="border-amber-500/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{request.chapter_name}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {request.city ? `${request.city}, ` : ''}{request.state}
                  </span>
                  {request.school_name && (
                    <span className="flex items-center gap-1">
                      <School className="h-4 w-4" />
                      {request.school_name}
                    </span>
                  )}
                </CardDescription>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Submitted: {new Date(request.created_at).toLocaleDateString()}
            </div>

            <Textarea
              placeholder="Admin notes (required for rejection)..."
              value={adminNotes[request.id] || ''}
              onChange={(e) => setAdminNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
              className="min-h-[60px]"
            />

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleApprove(request)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve & Add Chapter
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleReject(request)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {processedRequests.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mt-8">Processed Requests</h3>
          <div className="space-y-2">
            {processedRequests.slice(0, 10).map((request) => (
              <Card key={request.id} className="opacity-70">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{request.chapter_name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {request.city ? `${request.city}, ` : ''}{request.state}
                      </span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.admin_notes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Note: {request.admin_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
