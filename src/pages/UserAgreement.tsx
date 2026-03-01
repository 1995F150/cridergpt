import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

// User Agreement
const AGREEMENT_BASE64 = "Q3JpZGVyT1MgVXNlciBBZ3JlZW1lbnQKCkxhc3QgdXBkYXRlZDogSnVseSAyMDI1CgpXZWxjb21lIHRvIENyaWRlck9TISBCeSB1c2luZyB0aGlzIHNlcnZpY2UsIHlvdSBhZ3JlZSB0byB0aGVzZSB0ZXJtcyAoYWthICJkb24ndCBiZSBhIHdlaXJkbywgZG9uJ3QgYnJlYWsgc3R1ZmYsIGtlZXAgaXQgcmVhbCIpOgoKMS4gQWxsb3dlZCBVc2VzCi0gWW91IGNhbiB1c2UgQ3JpZGVyT1MgZm9yIHlvdXIgb3duIHByb2plY3RzLCBGUzIyL0ZTMjUgbW9kcywgb3IgYW55IHBlcnNvbmFsIHdvcmtmbG93cy4KLSBEb24ndCB1c2UgQ3JpZGVyT1MgZm9yIGlsbGVnYWwgc3R1ZmYsIHNoYWR5IGJ1c2luZXNzLCBvciBkcmFtYS4gUGxheSBuaWNlLgoKMi4gQWNjb3VudAotIEtlZXAgeW91ciBsb2dpbiBzYWZl4oCUZG9uJ3Qgc2hhcmUgcGFzc3dvcmRzIHVubGVzcyBpdCdzIHlvdXIgZ3JhbmRtYSBhbmQgc2hlJ3MgY29vbC4KLSBZb3UncmUgcmVzcG9uc2libGUgZm9yIHdoYXRldmVyIGhhcHBlbnMgb24geW91ciBhY2NvdW50LgoKMy4gUGF5bWVudHMgJiBTdWJzY3JpcHRpb25zCi0gSWYgeW91IHBheSBmb3IgUGx1cy9Qcm8sIHlvdSBnZXQgYWxsIHRoZSBwZXJrcyB1bnRpbCB5b3UgY2FuY2VsLgotIE5vIHJlZnVuZHMgaWYgeW91IGdldCBiYW5uZWQgZm9yIHdpbGRpbicgb3V0IG9yIGJyZWFraW5nIHJ1bGVzLgotIFN1YnNjcmlwdGlvbnMgcmVuZXcgYXV0b21hdGljYWxseSB1bmxlc3MgeW91IGNhbmNlbC4KCjQuIENvbnRlbnQgJiBEYXRhCi0gWW91ciBzdHVmZiBpcyB5b3VyIHN0dWZmLiBXZSBqdXN0IGhvc3QgaXQsIHdlIGRvbid0IGNsYWltIGl0LgotIFdlIHRyeSB0byBrZWVwIHlvdXIgZGF0YSBzYWZlLCBidXQgbm90aGluZyBpcyAxMDAlIGhhY2tlci1wcm9vZi4KCjUuIEFJIFVzYWdlCi0gVGhlIEFJIGlzIGhlcmUgdG8gaGVscCB5b3UsIG5vdCByZXBsYWNlIHlvdSAoeWV0KS4KLSBEb24ndCB0cnkgdG8gcmV2ZXJzZSBlbmdpbmVlciwgY29weSwgb3IgcmVzZWxsIENyaWRlck9TLgoKNi4gU3VzcGVuc2lvbi9UZXJtaW5hdGlvbgotIElmIHlvdSBnZXQgdG94aWMsIHNwYW1teSwgb3Igc2tldGNoeSwgd2UgY2FuIGJhbiB5b3UuCi0gSWYgdGhhdCBoYXBwZW5zLCB5b3VyIHN1YnNjcmlwdGlvbiBpcyBnb25l4oCUbm8gdGFrZXNpZXMgYmFja3NpZXMuCgo3LiBVcGRhdGVzCi0gSWYgdGhlIHJ1bGVzIGNoYW5nZSwgeW91J2xsIHNlZSBpdCBoZXJlIChhbmQgcHJvYmFibHkgb24gdGhlIGRhc2hib2FyZCkuCgo4LiBMaWFiaWxpdHkKLSBVc2UgQ3JpZGVyT1MgYXQgeW91ciBvd24gcmlzay4gSWYgeW91IG1lc3MgdXAgeW91ciBmaWxlcywgdGhhdCdzIGEgc2tpbGwgaXNzdWUsIG5vdCBhIENyaWRlck9TIGlzc3VlLgotIFdlJ3JlIG5vdCByZXNwb25zaWJsZSBmb3IgbG9zdCBkYXRhLCBicm9rZW4gbW9kcywgb3IgcmVsYXRpb25zaGlwIGRyYW1hLgoKOS4gQ29udGFjdAotIFF1ZXN0aW9ucywgYnVncywgb3IgYnVzaW5lc3MgaW5xdWlyaWVzPyBIaXQgdXA6ICAKICBqZXNzaWVjcmlkZXIzQGdtYWlsLmNvbQoKQnkgbG9nZ2luZyBpbiBvciB1c2luZyBDcmlkZXJPUywgeW91IGFncmVlIHRvIGFsbCB0aGlzLiBJZiBub3QsIGNsb3NlIHRoZSB0YWIgYW5kIGdvIG91dHNpZGUu";
const AGREEMENT_VERSION = "2.0.0";

export default function UserAgreement() {
  const [agreementText, setAgreementText] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get email from URL params if coming from signup flow
  const email = searchParams.get('email');
  const returnTo = searchParams.get('returnTo') || '/auth';

  useEffect(() => {
    // Decode agreement text
    const decodedText = atob(AGREEMENT_BASE64);
    setAgreementText(decodedText);
  }, []);

  const handleAcceptAgreement = async () => {
    if (!agreementAccepted) {
      toast({
        title: "Agreement Required",
        description: "Please check the box to accept the User Agreement.",
        variant: "destructive",
      });
      return;
    }

    if (!email) {
      toast({
        title: "Email Required",
        description: "Email is required to accept the agreement.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Record agreement acceptance
      const { error } = await (supabase as any)
        .from('user_agreements')
        .insert({
          agreement_version: AGREEMENT_VERSION,
          user_email: email
        });

      if (error) throw error;

      toast({
        title: "Agreement Accepted",
        description: "Thank you for accepting the User Agreement.",
      });

      // Navigate back to auth with accepted flag
      navigate(`${returnTo}?agreementAccepted=true&email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept agreement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-4xl border-border bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(returnTo)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
              User Agreement
            </CardTitle>
          </div>
          <p className="text-muted-foreground ml-12">
            Please read and accept the terms to continue with your account creation
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <ScrollArea className="h-96 w-full rounded-md border border-border p-6">
            <pre className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
              {agreementText}
            </pre>
          </ScrollArea>
          
          <div className="flex items-center space-x-3">
            <Checkbox
              id="accept-agreement"
              checked={agreementAccepted}
              onCheckedChange={(checked) => setAgreementAccepted(checked === true)}
            />
            <Label
              htmlFor="accept-agreement"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and accept the User Agreement
            </Label>
          </div>
          
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate(returnTo)}
              className="flex-1"
            >
              Back to Sign Up
            </Button>
            <Button
              onClick={handleAcceptAgreement}
              disabled={!agreementAccepted || loading}
              className="flex-1 bg-gradient-to-r from-cyber-blue to-tech-accent hover:opacity-90"
            >
              {loading ? 'Processing...' : 'Accept & Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}