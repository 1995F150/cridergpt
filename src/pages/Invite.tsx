import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReferral } from '@/hooks/useReferral';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Copy, Share2, Gift, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Invite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { code, shareUrl, usesCount, loading, copyShareUrl, nativeShare } = useReferral();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Sign in to grab your invite link</h1>
          <p className="text-muted-foreground mb-4">Every friend you invite earns you both bonus credits.</p>
          <Button onClick={() => navigate('/auth')}>Sign in</Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Invite friends to CriderGPT — earn rewards</title>
        <meta name="description" content="Invite your friends to CriderGPT and earn bonus credits when they join." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Growth program
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Bring your people in</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Send your link. When a friend signs up, you both get bonus credits and they get a
              jump-start trial.
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="h-4 w-4 text-primary" /> Your invite link
            </div>
            <div className="flex gap-2">
              <Input value={loading ? 'Generating...' : shareUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="secondary"
                onClick={async () => {
                  const ok = await copyShareUrl();
                  if (ok) {
                    setCopied(true);
                    toast.success('Link copied');
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <Button className="w-full" size="lg" onClick={nativeShare}>
              <Share2 className="h-4 w-4 mr-2" /> Share link
            </Button>
            {code && (
              <p className="text-center text-xs text-muted-foreground">
                Or share your code: <span className="font-mono font-bold text-foreground">{code}</span>
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Friends invited</div>
                <div className="text-3xl font-bold">{usesCount}</div>
              </div>
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <h2 className="font-semibold">How it works</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Send your link by text, Snap, or share it on TikTok.</li>
              <li>Your friend signs up and the invite gets credited automatically.</li>
              <li>You both get bonus credits when they activate.</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
