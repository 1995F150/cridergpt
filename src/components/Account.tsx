
import { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface AccountProps {
  session: Session;
}

export function Account({ session }: AccountProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to CriderGPT</CardTitle>
            <CardDescription>
              You are logged in as {session.user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => navigate('/memorial')}
                variant="outline"
                className="h-20"
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">Memorial</div>
                  <div className="text-sm text-muted-foreground">View memorial panel</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/story')}
                variant="outline"
                className="h-20"
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">Origin Story</div>
                  <div className="text-sm text-muted-foreground">Learn our story</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/dedication')}
                variant="outline"
                className="h-20"
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">Dedication</div>
                  <div className="text-sm text-muted-foreground">Special message</div>
                </div>
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button onClick={handleSignOut} variant="destructive" className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
