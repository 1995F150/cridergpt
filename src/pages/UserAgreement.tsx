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
const AGREEMENT_BASE64 = "Q3JpZGVyR1BUIFVzZXIgQWdyZWVtZW50CgpMYXN0IHVwZGF0ZWQ6IE1hcmNoIDIwMjYKCldlbGNvbWUgdG8gQ3JpZGVyR1BUISBCeSB1c2luZyB0aGlzIHNlcnZpY2UsIHlvdSBhZ3JlZSB0byB0aGVzZSB0ZXJtczoKCjEuIEFsbG93ZWQgVXNlcwotIFlvdSBjYW4gdXNlIENyaWRlckdQVCBmb3IgeW91ciBvd24gcHJvamVjdHMsIGZhcm1pbmcgdG9vbHMsIGxpdmVzdG9jayBtYW5hZ2VtZW50LCBvciBhbnkgcGVyc29uYWwgd29ya2Zsb3dzLgotIERvIG5vdCB1c2UgQ3JpZGVyR1BUIGZvciBpbGxlZ2FsIGFjdGl2aXRpZXMsIHNoYWR5IGJ1c2luZXNzLCBvciBoYXJhc3NtZW50LgoKMi4gQWNjb3VudAotIEtlZXAgeW91ciBsb2dpbiBzYWZlIOKAlCBkbyBub3Qgc2hhcmUgcGFzc3dvcmRzLgotIFlvdSBhcmUgcmVzcG9uc2libGUgZm9yIHdoYXRldmVyIGhhcHBlbnMgb24geW91ciBhY2NvdW50LgoKMy4gUGF5bWVudHMgJiBTdWJzY3JpcHRpb25zCi0gUGxhbnM6IEZyZWUgKCQwKSwgUGx1cyAoJDMvbW8pLCBQcm8gKCQ3L21vKSwgTGlmZXRpbWUgKCQzMCBvbmUtdGltZSkuCi0gTm8gcmVmdW5kcyBpZiB5b3UgZ2V0IGJhbm5lZCBmb3IgdmlvbGF0aW5nIHJ1bGVzLgotIFN1YnNjcmlwdGlvbnMgcmVuZXcgYXV0b21hdGljYWxseSB1bmxlc3MgeW91IGNhbmNlbC4KCjQuIENvbnRlbnQgJiBEYXRhCi0gWW91ciBzdHVmZiBpcyB5b3VyIHN0dWZmLiBXZSBob3N0IGl0LCB3ZSBkbyBub3QgY2xhaW0gaXQuCi0gV2UgdHJ5IHRvIGtlZXAgeW91ciBkYXRhIHNhZmUsIGJ1dCBub3RoaW5nIGlzIDEwMCUgaGFja2VyLXByb29mLgoKNS4gQUkgVXNhZ2UKLSBUaGUgQUkgaXMgaGVyZSB0byBoZWxwIHlvdSwgbm90IHJlcGxhY2UgeW91LgotIERvIG5vdCB0cnkgdG8gcmV2ZXJzZSBlbmdpbmVlciwgY29weSwgb3IgcmVzZWxsIENyaWRlckdQVC4KCjYuIFN1c3BlbnNpb24vVGVybWluYXRpb24KLSBJZiB5b3UgZ2V0IHRveGljLCBzcGFtbXksIG9yIHNrZXRjaHksIHdlIGNhbiBiYW4geW91LgotIElmIHRoYXQgaGFwcGVucywgeW91ciBzdWJzY3JpcHRpb24gaXMgZ29uZSDigJQgbm8gcmVmdW5kcy4KCjcuIFVwZGF0ZXMKLSBJZiB0aGUgcnVsZXMgY2hhbmdlLCB5b3Ugd2lsbCBzZWUgaXQgaGVyZSAoYW5kIG9uIHRoZSBkYXNoYm9hcmQpLgoKOC4gTGlhYmlsaXR5Ci0gVXNlIENyaWRlckdQVCBhdCB5b3VyIG93biByaXNrLgotIFdlIGFyZSBub3QgcmVzcG9uc2libGUgZm9yIGxvc3QgZGF0YSwgYnJva2VuIG1vZHMsIG9yIG90aGVyIGlzc3Vlcy4KCjkuIENvbnRhY3QKLSBRdWVzdGlvbnMsIGJ1Z3MsIG9yIGJ1c2luZXNzIGlucXVpcmllcz8gRW1haWw6CiAgamVzc2llY3JpZGVyM0BnbWFpbC5jb20KCkJ5IGxvZ2dpbmcgaW4gb3IgdXNpbmcgQ3JpZGVyR1BULCB5b3UgYWdyZWUgdG8gYWxsIHRoaXMu";
const AGREEMENT_VERSION = "3.0.0";

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