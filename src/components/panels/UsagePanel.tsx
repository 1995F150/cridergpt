import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, User } from "lucide-react";

interface TokenUsage {
  id: number;
  query: string;
  model: string;
  tokens_used: number;
  created_at: string;
}

interface TTSRequest {
  id: number;
  text: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  user_id: string;
  username: string;
  total_tokens: number;
  total_tts_requests: number;
}

export function UsagePanel() {
  const { user } = useAuth();
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([]);
  const [ttsRequests, setTTSRequests] = useState<TTSRequest[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUsageData();
      
      // Set up real-time subscriptions
      const tokenChannel = supabase
        .channel('token-usage-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'openai_requests',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newRecord = payload.new as TokenUsage;
            setTokenUsage(prev => [newRecord, ...prev.slice(0, 9)]);
          }
        )
        .subscribe();

      const ttsChannel = supabase
        .channel('tts-requests-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'text_to_speech_requests',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newRecord = payload.new as TTSRequest;
            setTTSRequests(prev => [newRecord, ...prev.slice(0, 9)]);
          }
        )
        .subscribe();

      // Cleanup function
      return () => {
        supabase.removeChannel(tokenChannel);
        supabase.removeChannel(ttsChannel);
      };
    }
  }, [user]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      
      // Fetch token usage from openai_requests
      const { data: tokenData } = await supabase
        .from('openai_requests')
        .select('id, query, model, tokens_used, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch TTS requests
      const { data: ttsData } = await supabase
        .from('text_to_speech_requests')
        .select('id, text, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, user_id, username');

      // Fetch usage statistics for all users
      const { data: allTokenUsage } = await supabase
        .from('openai_requests')
        .select('user_id, tokens_used');

      const { data: allTtsRequests } = await supabase
        .from('text_to_speech_requests')
        .select('user_id');

      // Process profiles data to calculate totals
      const processedProfiles = profilesData?.map(profile => {
        const userTokens = allTokenUsage?.filter(usage => usage.user_id === profile.user_id) || [];
        const userTtsRequests = allTtsRequests?.filter(req => req.user_id === profile.user_id) || [];
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          username: profile.username || 'Unknown User',
          total_tokens: userTokens.reduce((sum, usage) => sum + (usage.tokens_used || 0), 0),
          total_tts_requests: userTtsRequests.length
        };
      }).filter(profile => profile.total_tokens > 0 || profile.total_tts_requests > 0) || [];

      setTokenUsage(tokenData || []);
      setTTSRequests(ttsData || []);
      setUserProfiles(processedProfiles);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTokens = tokenUsage.reduce((sum, usage) => sum + (usage.tokens_used || 0), 0);

  if (loading) {
    return (
      <div className="panel h-full w-full p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="panel h-full w-full p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">Total Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalTokens.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-primary">TTS Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{ttsRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Recent Token Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenUsage.length === 0 ? (
              <p className="text-muted-foreground">No token usage found</p>
            ) : (
              tokenUsage.map((usage) => (
                <div key={usage.id} className="border-b border-border pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {usage.model}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {usage.tokens_used} tokens
                    </span>
                  </div>
                  <p className="text-sm text-foreground truncate" title={usage.query}>
                    {usage.query}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(usage.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Recent TTS Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ttsRequests.length === 0 ? (
              <p className="text-muted-foreground">No TTS requests found</p>
            ) : (
              ttsRequests.map((request) => (
                <div key={request.id} className="border-b border-border pb-3 last:border-b-0">
                  <p className="text-sm text-foreground truncate" title={request.text}>
                    {request.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <User className="h-5 w-5" />
              User Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userProfiles.length === 0 ? (
              <p className="text-muted-foreground">No user data found</p>
            ) : (
              userProfiles.map((profile) => (
                <div key={profile.id} className="border-b border-border pb-3 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">
                      {profile.username}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tokens:</span>
                      <span className="text-foreground">{profile.total_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TTS:</span>
                      <span className="text-foreground">{profile.total_tts_requests}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}