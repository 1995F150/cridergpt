import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
}

interface UserDirectoryProps {
  onStartChat: (userId: string, username?: string) => void;
}

export const UserDirectory: React.FC<UserDirectoryProps> = ({ onStartChat }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(u => 
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.user_id.includes(searchTerm)
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username')
        .neq('user_id', user?.id) // Exclude current user
        .order('username');

      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = (profile: UserProfile) => {
    onStartChat(profile.user_id, profile.username || undefined);
  };

  const getInitials = (username: string | null, userId: string) => {
    if (username) {
      return username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (profile: UserProfile) => {
    return profile.username || `User ${profile.user_id.slice(0, 8)}`;
  };

  return (
    <div className="w-80 border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Users</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      <ScrollArea className="h-[calc(100%-140px)]">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredUsers.map((profile) => (
              <Card
                key={profile.id}
                className="mb-2 cursor-pointer transition-all hover:shadow-md hover:bg-muted/50"
                onClick={() => handleStartChat(profile)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(profile.username, profile.user_id)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {getDisplayName(profile)}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          ID: {profile.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChat(profile);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};