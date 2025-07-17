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
const AGREEMENT_BASE64 = "Q3JpZGVyT1MgVXNlciBBZ3JlZW1lbnQKCkVmZmVjdGl2ZSBEYXRlOiBKYW51YXJ5IDEsIDIwMjUKClRoaXMgVXNlciBBZ3JlZW1lbnQgKCJBZ3JlZW1lbnQiKSBpcyBlbnRlcmVkIGludG8gYnkgYW5kIGJldHdlZW4geW91ICgiVXNlciIpIGFuZCBDcmlkZXJPUyAoIkNvbXBhbnkiKS4gQnkgdXNpbmcgQ3JpZGVyT1MsIHlvdSBhZ3JlZSB0byBiZSBib3VuZCBieSB0aGUgdGVybXMgYW5kIGNvbmRpdGlvbnMgb2YgdGhpcyBBZ3JlZW1lbnQuCgoxLiBBY2NlcHRhbmNlIG9mIFRlcm1zCkJ5IGFjY2Vzc2luZyBvciB1c2luZyBDcmlkZXJPUywgeW91IGFncmVlIHRvIGNvbXBseSB3aXRoIGFuZCBiZSBib3VuZCBieSB0aGlzIEFncmVlbWVudC4KCjIuIERlc2NyaXB0aW9uIG9mIFNlcnZpY2UKQ3JpZGVyT1MgaXMgYSBjb21wdXRlciBvcGVyYXRpbmcgc3lzdGVtIGFuZCBzb2Z0d2FyZSBwbGF0Zm9ybSBkZXNpZ25lZCB0byBwcm92aWRlIHVzZXJzIHdpdGggYWR2YW5jZWQgY29tcHV0aW5nIGNhcGFiaWxpdGllcy4KCjMuIFVzZXIgUmVzcG9uc2liaWxpdGllcwpZb3UgYWdyZWUgdG86Ci0gVXNlIENyaWRlck9TIGluIGFjY29yZGFuY2Ugd2l0aCBhbGwgYXBwbGljYWJsZSBsYXdzIGFuZCByZWd1bGF0aW9ucwotIE5vdCBlbmdhZ2UgaW4gYW55IGlsbGVnYWwgb3IgaGFybWZ1bCBhY3Rpdml0aWVzCi0gTWFpbnRhaW4gdGhlIHNlY3VyaXR5IG9mIHlvdXIgYWNjb3VudCBhbmQgcGFzc3dvcmQKCjQuIERhdGEgUHJpdmFjeQpXZSByZXNwZWN0IHlvdXIgcHJpdmFjeSBhbmQgYXJlIGNvbW1pdHRlZCB0byBwcm90ZWN0aW5nIHlvdXIgcGVyc29uYWwgaW5mb3JtYXRpb24uCgo1LiBMaW1pdGF0aW9uIG9mIExpYWJpbGl0eQpDcmlkZXJPUyBzaGFsbCBub3QgYmUgbGlhYmxlIGZvciBhbnkgaW5kaXJlY3QsIGluY2lkZW50YWwsIHNwZWNpYWwsIG9yIGNvbnNlcXVlbnRpYWwgZGFtYWdlcy4KCjYuIFRlcm1pbmF0aW9uCkVpdGhlciBwYXJ0eSBtYXkgdGVybWluYXRlIHRoaXMgQWdyZWVtZW50IGF0IGFueSB0aW1lIHdpdGggb3Igd2l0aG91dCBub3RpY2UuCgo3LiBHb3Zlcm5pbmcgTGF3ClRoaXMgQWdyZWVtZW50IHNoYWxsIGJlIGdvdmVybmVkIGJ5IGFuZCBjb25zdHJ1ZWQgaW4gYWNjb3JkYW5jZSB3aXRoIHRoZSBsYXdzIG9mIFtZb3VyIEp1cmlzZGljdGlvbl0uCgo4LiBBbWVuZG1lbnRzCkNyaWRlck9TIHJlc2VydmVzIHRoZSByaWdodCB0byBtb2RpZnkgdGhpcyBBZ3JlZW1lbnQgYXQgYW55IHRpbWUuCgpCeSBjbGlja2luZyAiSSBBY2NlcHQiLCB5b3UgYWNrbm93bGVkZ2UgdGhhdCB5b3UgaGF2ZSByZWFkLCB1bmRlcnN0b29kLCBhbmQgYWdyZWUgdG8gYmUgYm91bmQgYnkgdGhpcyBBZ3JlZW1lbnQu";
const AGREEMENT_VERSION = "1.0.0";

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
      const { error } = await supabase
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