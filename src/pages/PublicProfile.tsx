import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flame, Trophy } from 'lucide-react';

interface PublicProfile {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  user_id: string;
}

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url, user_id')
        .eq('username', username)
        .eq('public_profile_enabled', true)
        .maybeSingle();

      if (!prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(prof);

      const { data: s } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', prof.user_id)
        .maybeSingle();
      setStreak(s ?? null);
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
          <p className="text-muted-foreground mb-4">
            This user doesn't have a public profile, or the username is wrong.
          </p>
          <Button onClick={() => navigate('/')}>Go home</Button>
        </Card>
      </div>
    );
  }

  const display = profile.display_name || profile.username;

  return (
    <>
      <Helmet>
        <title>{display} on CriderGPT</title>
        <meta name="description" content={profile.bio || `${display} is on CriderGPT.`} />
        <meta property="og:title" content={`${display} on CriderGPT`} />
        <meta property="og:description" content={profile.bio || ''} />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-12">
        <div className="max-w-xl mx-auto space-y-6">
          <Card className="p-8 text-center space-y-4">
            <Avatar className="h-24 w-24 mx-auto">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">{display[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{display}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            {profile.bio && <p className="text-sm">{profile.bio}</p>}

            {streak && streak.current_streak > 0 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-orange-500">
                  <Flame className="h-5 w-5" />
                  <span className="font-bold">{streak.current_streak}</span>
                  <span className="text-xs text-muted-foreground">day streak</span>
                </div>
                <div className="flex items-center gap-1.5 text-yellow-500">
                  <Trophy className="h-5 w-5" />
                  <span className="font-bold">{streak.longest_streak}</span>
                  <span className="text-xs text-muted-foreground">best</span>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => navigate('/')}>
              Try CriderGPT
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
