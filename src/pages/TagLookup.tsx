import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Scan, Phone, ShieldCheck, AlertTriangle, Tag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';
import { toast } from '@/hooks/use-toast';

type ClaimStatus = 'idle' | 'available' | 'mine' | 'taken' | 'unknown';

export default function TagLookup() {
  const { tagId: rawTagId } = useParams<{ tagId: string }>();
  // Strip wrapping braces, whitespace, and decode URI components defensively.
  // Some NFC tags / QR codes encode the ID as "{CriderGPT-XXXXXX}" which breaks lookup.
  const tagId = rawTagId
    ? decodeURIComponent(rawTagId).trim().replace(/^[{<\[]+|[}>\]]+$/g, '').trim()
    : rawTagId;
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Claim flow state (only meaningful on /livestockID/:tagId path)
  const isLivestockRoute = location.pathname.startsWith('/livestockID/');
  const [poolTag, setPoolTag] = useState<any>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle');
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!tagId) return;
    lookupTag();
  }, [tagId]);

  // After auth resolves, if we were waiting to claim, resume the flow
  useEffect(() => {
    if (!authLoading && user && isLivestockRoute && tagId) {
      const pending = sessionStorage.getItem('pendingClaimTag');
      if (pending === tagId) {
        sessionStorage.removeItem('pendingClaimTag');
        // Re-evaluate the pool status now that we're signed in
        evaluatePoolTag();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const lookupTag = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('tag-lookup', {
        body: { tag_id: tagId },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        // Tag not found via tag-lookup (no animal yet). Check the pool.
        if (isLivestockRoute) {
          await evaluatePoolTag();
        } else {
          setError(data.error);
        }
      } else {
        setResult(data);
        if (isLivestockRoute) {
          // Animal exists. If current user is owner → mine; else taken
          if (data.authorized) setClaimStatus('mine');
          else setClaimStatus('taken');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to look up tag');
    } finally {
      setLoading(false);
    }
  };

  const evaluatePoolTag = async () => {
    if (!tagId) return;
    try {
      const { data, error: poolErr } = await (supabase as any)
        .from('livestock_tag_pool')
        .select('*')
        .eq('tag_id', tagId)
        .maybeSingle();
      if (poolErr) throw poolErr;

      if (!data) {
        setClaimStatus('unknown');
        setError('Invalid or unknown tag');
        return;
      }

      setPoolTag(data);
      const status = data.status as string;
      if (status === 'available' || status === 'programmed') {
        setClaimStatus('available');
        setError(null);
        // Auto-open claim dialog if user is signed in
        if (user) setShowClaimDialog(true);
      } else if (status === 'assigned') {
        // Tag is in pool & assigned but no animal record found via tag-lookup.
        // This is a rare edge case — show taken.
        setClaimStatus('taken');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check tag pool');
      setClaimStatus('unknown');
    }
  };

  const handleClaimClick = () => {
    if (!user) {
      // Stash the pending tag ID, redirect to auth, return here after login
      sessionStorage.setItem('pendingClaimTag', tagId!);
      navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setShowClaimDialog(true);
  };

  const confirmClaim = async () => {
    if (!user || !tagId) return;
    setClaiming(true);
    try {
      const { data, error: claimErr } = await supabase.functions.invoke('claim-tag', {
        body: { tag_id: tagId },
      });
      if (claimErr) throw claimErr;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Tag added to your account!', description: `${tagId} is now linked to you.` });
      setShowClaimDialog(false);
      // Send them to the livestock panel to create the animal
      navigate(`/livestockID?newTag=${encodeURIComponent(tagId)}`);
    } catch (err: any) {
      toast({
        title: 'Could not claim tag',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO page="tag-lookup" />
      <div className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" /> Smart ID Lookup
            </h1>
            <p className="text-sm text-muted-foreground">CriderGPT Livestock Tag</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Tag ID display */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Tag ID</p>
            <p className="text-2xl font-mono font-bold text-primary">{tagId}</p>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground">Looking up tag...</p>
            </CardContent>
          </Card>
        )}

        {/* Available tag — claim CTA (livestockID route only) */}
        {!loading && isLivestockRoute && claimStatus === 'available' && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-5 w-5 text-primary" /> Tag Detected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                This Smart ID tag is unclaimed. Add it to your account to start tracking an animal.
              </p>
              <Button className="w-full h-11" onClick={handleClaimClick}>
                {user ? 'Add this tag to my account' : 'Sign in to claim this tag'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Tag: <span className="font-mono">{tagId}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tag is taken (and not by current user) */}
        {!loading && isLivestockRoute && claimStatus === 'taken' && !result && (
          <Card className="border-amber-500/40">
            <CardContent className="p-6 text-center space-y-3">
              <ShieldCheck className="h-10 w-10 text-amber-500 mx-auto" />
              <p className="font-semibold">This tag is already registered</p>
              <p className="text-sm text-muted-foreground">
                Another user owns this Smart ID. If you believe this is an error, contact support.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Unknown / not in pool */}
        {!loading && claimStatus === 'unknown' && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="font-semibold text-destructive">Invalid or unknown tag</p>
              <p className="text-xs text-muted-foreground">
                We couldn't find <span className="font-mono">{tagId}</span> in the CriderGPT system.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Generic error (non-livestockID routes) */}
        {!loading && error && claimStatus === 'idle' && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="font-semibold text-destructive">Tag Not Found</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">
                If you found this animal, please contact the owner through CriderGPT.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Public view — limited info for unauthorized scanners */}
        {result && !result.authorized && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" /> Registered Animal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-primary/5 rounded-lg p-4 text-center space-y-2">
                <p className="text-4xl">🐮</p>
                <p className="font-semibold">{result.animal_name || 'Registered Livestock'}</p>
                <Badge>{result.species}</Badge>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <p className="font-medium">This animal is registered in the CriderGPT Smart ID system.</p>
                <p className="text-muted-foreground">
                  If you found this animal wandering or lost, please contact the owner:
                </p>
              </div>

              {result.owner_contact && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3 space-y-1 text-sm">
                    <p className="font-medium">Owner: {result.owner_name || 'Registered Owner'}</p>
                    {result.owner_contact.phone && (
                      <a href={`tel:${result.owner_contact.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                        <Phone className="h-4 w-4" /> {result.owner_contact.phone}
                      </a>
                    )}
                    {result.owner_contact.email && (
                      <p className="text-muted-foreground">{result.owner_contact.email}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {!result.owner_contact && (
                <p className="text-xs text-muted-foreground text-center">
                  Owner contact info is private. Sign in to the CriderGPT app to view more details if you have access.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Authorized view — full profile */}
        {result && result.authorized && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                ✅ Full Animal Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{result.animal?.name || '—'}</span></div>
                <div><span className="text-muted-foreground">Species:</span> <span className="font-medium">{result.animal?.species}</span></div>
                <div><span className="text-muted-foreground">Breed:</span> <span className="font-medium">{result.animal?.breed || '—'}</span></div>
                <div><span className="text-muted-foreground">Sex:</span> <span className="font-medium">{result.animal?.sex || '—'}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{result.animal?.status}</Badge></div>
                <div><span className="text-muted-foreground">Tag:</span> <span className="font-mono text-xs">{result.animal?.tag_id}</span></div>
              </div>

              {result.animal?.notes && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{result.animal.notes}</p>
              )}

              <Button className="w-full" onClick={() => navigate('/livestockID')}>
                Open Full Profile in App
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Branding footer */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-muted-foreground">Powered by</p>
          <p className="font-bold text-primary">CriderGPT Smart ID System</p>
          <Button variant="link" size="sm" onClick={() => navigate('/store')}>
            Get Smart Tags for Your Herd →
          </Button>
        </div>
      </div>

      {/* Claim confirmation dialog */}
      <AlertDialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Tag detected: <span className="font-mono">{tagId}</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add this tag to your account? Once added, you'll be able to register
              an animal and track its health, weights, and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={claiming}>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmClaim(); }} disabled={claiming}>
              {claiming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : 'Yes, add it'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
