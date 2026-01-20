import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGuardianData, GuardianRelationship } from '@/hooks/useGuardianData';
import { Shield, Check, X, Loader2, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ChildAcceptInvite() {
  const { pendingInvites, acceptInvite, rejectInvite, loading } = useGuardianData();
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || inviteCode.length !== 6) return;

    setSubmitting(true);
    await acceptInvite(inviteCode);
    setSubmitting(false);
    setInviteCode('');
  };

  const handleAccept = async (invite: GuardianRelationship) => {
    if (!invite.invite_code) return;
    setActioningId(invite.id);
    await acceptInvite(invite.invite_code);
    setActioningId(null);
  };

  const handleReject = async (invite: GuardianRelationship) => {
    setActioningId(invite.id);
    await rejectInvite(invite.id);
    setActioningId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enter Invite Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            Have an Invite Code?
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code given to you by your guardian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCodeSubmit} className="flex gap-2">
            <Input
              placeholder="123456"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="font-mono text-lg tracking-widest text-center"
            />
            <Button type="submit" disabled={submitting || inviteCode.length !== 6}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Pending Invites
            </CardTitle>
            <CardDescription>
              Review monitoring requests from guardians
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Guardian Request</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {invite.relationship_label}
                      </Badge>
                      <span>wants to monitor your activity</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(invite)}
                    disabled={actioningId === invite.id}
                  >
                    {actioningId === invite.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite)}
                    disabled={actioningId === invite.id}
                  >
                    {actioningId === invite.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* What Gets Monitored Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>What gets monitored:</strong> Chat messages, file uploads, AI interactions, and usage patterns.
            Your guardian will be notified if concerning content is detected. You can revoke access at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
