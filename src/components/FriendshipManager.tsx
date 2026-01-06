import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus,
  UserX,
  Heart,
  Shield,
  Search,
  Eye,
  EyeOff,
  UserCheck,
  UserMinus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  status?: string;
}

interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user?: User;
}

interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  following_user?: User;
  follower_user?: User;
}

interface FriendshipManagerProps {
  friends: Array<{ friend?: User }>;
  onFriendshipUpdate: () => void;
}

export const FriendshipManager: React.FC<FriendshipManagerProps> = ({ 
  friends, 
  onFriendshipUpdate 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [recommendations, setRecommendations] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load blocked users
  const loadBlockedUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', user.id);

      if (error) throw error;

      if (data) {
        const formattedBlocked = await Promise.all(
          data.map(async (block) => {
            const { data: userData } = await supabase
              .from('crider_chat_users')
              .select('user_id, display_name, email, avatar_url')
              .eq('user_id', block.blocked_id)
              .maybeSingle();

            return {
              ...block,
              blocked_user: userData ? {
                id: userData.user_id,
                display_name: userData.display_name,
                email: userData.email,
                avatar_url: userData.avatar_url
              } : null
            };
          })
        );
        setBlockedUsers(formattedBlocked.filter(b => b.blocked_user));
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  // Load following/followers
  const loadFollows = async () => {
    if (!user) return;

    try {
      // Load who I'm following
      const { data: followingData, error: followingError } = await supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      // Load my followers
      const { data: followersData, error: followersError } = await supabase
        .from('user_follows')
        .select('*')
        .eq('following_id', user.id);

      if (followersError) throw followersError;

      if (followingData) {
        const formattedFollowing = await Promise.all(
          followingData.map(async (follow) => {
            const { data: userData } = await supabase
              .from('crider_chat_users')
              .select('user_id, display_name, email, avatar_url')
              .eq('user_id', follow.following_id)
              .maybeSingle();

            return {
              ...follow,
              following_user: userData ? {
                id: userData.user_id,
                display_name: userData.display_name,
                email: userData.email,
                avatar_url: userData.avatar_url
              } : null
            };
          })
        );
        setFollowing(formattedFollowing.filter(f => f.following_user));
      }

      if (followersData) {
        const formattedFollowers = await Promise.all(
          followersData.map(async (follow) => {
            const { data: userData } = await supabase
              .from('crider_chat_users')
              .select('user_id, display_name, email, avatar_url')
              .eq('user_id', follow.follower_id)
              .maybeSingle();

            return {
              ...follow,
              follower_user: userData ? {
                id: userData.user_id,
                display_name: userData.display_name,
                email: userData.email,
                avatar_url: userData.avatar_url
              } : null
            };
          })
        );
        setFollowers(formattedFollowers.filter(f => f.follower_user));
      }
    } catch (error) {
      console.error('Error loading follows:', error);
    }
  };

  // Load friend recommendations
  const loadRecommendations = async () => {
    if (!user) return;

    try {
      // Get users who are not already friends, not blocked, and not following
      const friendIds = friends.map(f => f.friend?.id).filter(Boolean);
      const blockedIds = blockedUsers.map(b => b.blocked_id);
      const followingIds = following.map(f => f.following_id);
      
      const excludeIds = [...friendIds, ...blockedIds, ...followingIds, user.id];

      const { data, error } = await supabase
        .from('crider_chat_users')
        .select('user_id, display_name, email, avatar_url')
        .not('user_id', 'in', `(${excludeIds.join(',')})`)
        .eq('is_synced', true)
        .limit(10);

      if (error) throw error;

      if (data) {
        const formattedUsers = data.map(u => ({
          id: u.user_id,
          display_name: u.display_name,
          email: u.email,
          avatar_url: u.avatar_url
        }));
        setRecommendations(formattedUsers);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  // Block user
  const blockUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: userId
        });

      if (error) throw error;

      toast({
        title: "User blocked",
        description: "User has been blocked successfully."
      });

      loadBlockedUsers();
      onFriendshipUpdate();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    }
  };

  // Unblock user
  const unblockUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      toast({
        title: "User unblocked",
        description: "User has been unblocked successfully."
      });

      loadBlockedUsers();
      onFriendshipUpdate();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive"
      });
    }
  };

  // Follow user
  const followUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        });

      if (error) throw error;

      toast({
        title: "Now following",
        description: "You are now following this user."
      });

      loadFollows();
      loadRecommendations();
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive"
      });
    }
  };

  // Unfollow user
  const unfollowUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;

      toast({
        title: "Unfollowed",
        description: "You are no longer following this user."
      });

      loadFollows();
      loadRecommendations();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive"
      });
    }
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user.id})`);

      if (error) throw error;

      toast({
        title: "Friend removed",
        description: "User has been removed from your friends list."
      });

      onFriendshipUpdate();
      loadRecommendations();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadBlockedUsers();
      loadFollows();
    }
  }, [user]);

  useEffect(() => {
    loadRecommendations();
  }, [friends, blockedUsers, following]);

  const filteredRecommendations = recommendations.filter(rec =>
    rec.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rec.display_name && rec.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Friendship Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="friends" className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
              <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="blocked">Blocked ({blockedUsers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="mt-4">
              <ScrollArea className="h-80">
                {friends.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No friends yet. Start by sending friend requests!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friendship) => {
                      const friend = friendship.friend;
                      if (!friend) return null;
                      
                      return (
                        <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={friend.avatar_url} />
                              <AvatarFallback>
                                {friend.display_name?.[0] || friend.email[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold text-sm">
                                {friend.display_name || friend.email}
                              </h4>
                              <p className="text-xs text-muted-foreground">{friend.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => blockUser(friend.id)}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFriend(friend.id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="following" className="mt-4">
              <ScrollArea className="h-80">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Following ({following.length})</h4>
                    {following.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Not following anyone yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {following.map((follow) => (
                          <div key={follow.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={follow.following_user?.avatar_url} />
                                <AvatarFallback>
                                  {follow.following_user?.display_name?.[0] || follow.following_user?.email[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {follow.following_user?.display_name || follow.following_user?.email}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unfollowUser(follow.following_id)}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Followers ({followers.length})</h4>
                    {followers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No followers yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {followers.map((follow) => (
                          <div key={follow.id} className="flex items-center gap-2 p-2 border rounded">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={follow.follower_user?.avatar_url} />
                              <AvatarFallback>
                                {follow.follower_user?.display_name?.[0] || follow.follower_user?.email[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {follow.follower_user?.display_name || follow.follower_user?.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="discover" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Search className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search for people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-80">
                  {filteredRecommendations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'No users found' : 'No recommendations available'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredRecommendations.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={rec.avatar_url} />
                              <AvatarFallback>
                                {rec.display_name?.[0] || rec.email[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold text-sm">
                                {rec.display_name || rec.email}
                              </h4>
                              <p className="text-xs text-muted-foreground">{rec.email}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => followUser(rec.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Follow
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="blocked" className="mt-4">
              <ScrollArea className="h-80">
                {blockedUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No blocked users.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((blocked) => (
                      <div key={blocked.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={blocked.blocked_user?.avatar_url} />
                            <AvatarFallback>
                              {blocked.blocked_user?.display_name?.[0] || blocked.blocked_user?.email[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-sm">
                              {blocked.blocked_user?.display_name || blocked.blocked_user?.email}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Blocked on {new Date(blocked.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unblockUser(blocked.blocked_id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};