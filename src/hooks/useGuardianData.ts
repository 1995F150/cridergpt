import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface GuardianRelationship {
  id: string;
  guardian_id: string;
  child_id: string | null;
  child_email: string | null;
  child_phone: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  invite_code: string | null;
  relationship_label: string;
  monitoring_enabled: boolean;
  created_at: string;
  updated_at: string;
  child_profile?: {
    email: string;
    display_name?: string;
  };
}

export interface ChildActivityLog {
  id: string;
  child_id: string;
  activity_type: 'chat_message' | 'file_upload' | 'login' | 'feature_access' | 'ai_interaction';
  activity_content: string | null;
  metadata: Record<string, unknown>;
  ai_safety_score: number | null;
  ai_flags: string[];
  created_at: string;
}

export interface GuardianAlert {
  id: string;
  guardian_id: string;
  child_id: string;
  alert_type: 'content_warning' | 'usage_spike' | 'late_night_usage' | 'concerning_topic' | 'manual_check';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  activity_log_id: string | null;
  acknowledged: boolean;
  created_at: string;
}

export function useGuardianData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [relationships, setRelationships] = useState<GuardianRelationship[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GuardianRelationship[]>([]);
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch guardian relationships where user is the guardian
  const fetchRelationships = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('guardian_relationships')
      .select('*')
      .eq('guardian_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching relationships:', error);
      return;
    }

    setRelationships((data || []) as GuardianRelationship[]);
  };

  // Fetch pending invites where user is the child (by email)
  const fetchPendingInvites = async () => {
    if (!user?.email) return;

    const { data, error } = await supabase
      .from('guardian_relationships')
      .select('*')
      .eq('child_email', user.email)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching pending invites:', error);
      return;
    }

    setPendingInvites((data || []) as GuardianRelationship[]);
  };

  // Fetch alerts for guardian
  const fetchAlerts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('guardian_alerts')
      .select('*')
      .eq('guardian_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching alerts:', error);
      return;
    }

    setAlerts((data || []) as GuardianAlert[]);
  };

  // Create invite for a child
  const createInvite = async (childEmail: string, childPhone?: string, relationshipLabel: string = 'Parent') => {
    if (!user) return null;

    // Generate 6-digit invite code
    const inviteCode = Math.random().toString().slice(2, 8);

    const { data, error } = await supabase
      .from('guardian_relationships')
      .insert({
        guardian_id: user.id,
        child_email: childEmail,
        child_phone: childPhone || null,
        invite_code: inviteCode,
        relationship_label: relationshipLabel,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }

    toast({
      title: 'Invite Sent',
      description: `Invite code: ${inviteCode}`
    });

    await fetchRelationships();
    return data;
  };

  // Accept an invite (as child)
  const acceptInvite = async (inviteCode: string) => {
    if (!user) return false;

    const { data: invite, error: findError } = await supabase
      .from('guardian_relationships')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('status', 'pending')
      .single();

    if (findError || !invite) {
      toast({
        title: 'Invalid Code',
        description: 'This invite code is invalid or expired.',
        variant: 'destructive'
      });
      return false;
    }

    const { error } = await supabase
      .from('guardian_relationships')
      .update({
        child_id: user.id,
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    toast({
      title: 'Connected!',
      description: 'You are now connected to your guardian.'
    });

    await fetchPendingInvites();
    return true;
  };

  // Reject an invite
  const rejectInvite = async (relationshipId: string) => {
    const { error } = await supabase
      .from('guardian_relationships')
      .update({ status: 'rejected' })
      .eq('id', relationshipId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchPendingInvites();
    return true;
  };

  // Revoke monitoring access (as child)
  const revokeAccess = async (relationshipId: string) => {
    const { error } = await supabase
      .from('guardian_relationships')
      .update({ status: 'revoked' })
      .eq('id', relationshipId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    toast({
      title: 'Access Revoked',
      description: 'Guardian monitoring has been disabled.'
    });

    return true;
  };

  // Toggle monitoring (as guardian)
  const toggleMonitoring = async (relationshipId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('guardian_relationships')
      .update({ monitoring_enabled: enabled })
      .eq('id', relationshipId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }

    await fetchRelationships();
    return true;
  };

  // Acknowledge an alert
  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('guardian_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }

    await fetchAlerts();
    return true;
  };

  // Get unacknowledged alert count
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRelationships(), fetchPendingInvites(), fetchAlerts()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const alertsChannel = supabase
      .channel('guardian_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guardian_alerts',
          filter: `guardian_id=eq.${user.id}`
        },
        (payload) => {
          const newAlert = payload.new as GuardianAlert;
          setAlerts(prev => [newAlert, ...prev]);
          
          // Show toast for new alerts
          toast({
            title: `${newAlert.severity.toUpperCase()}: ${newAlert.title}`,
            description: newAlert.description || undefined,
            variant: newAlert.severity === 'critical' ? 'destructive' : 'default'
          });
        }
      )
      .subscribe();

    const relationshipsChannel = supabase
      .channel('guardian_relationships_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guardian_relationships'
        },
        () => {
          fetchRelationships();
          fetchPendingInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(relationshipsChannel);
    };
  }, [user]);

  return {
    relationships,
    pendingInvites,
    alerts,
    loading,
    unacknowledgedCount,
    createInvite,
    acceptInvite,
    rejectInvite,
    revokeAccess,
    toggleMonitoring,
    acknowledgeAlert,
    refreshData: () => Promise.all([fetchRelationships(), fetchPendingInvites(), fetchAlerts()])
  };
}
