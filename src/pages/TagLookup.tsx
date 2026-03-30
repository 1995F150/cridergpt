import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Scan, Phone, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';

export default function TagLookup() {
  const { tagId } = useParams<{ tagId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tagId) return;
    lookupTag();
  }, [tagId]);

  const lookupTag = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('tag-lookup', {
        body: { tag_id: tagId },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to look up tag');
    } finally {
      setLoading(false);
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

        {error && (
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

              <Button className="w-full" onClick={() => navigate('/')}>
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
    </div>
  );
}
