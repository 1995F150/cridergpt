import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserCog, Ban, CheckCircle, Shield, ShieldAlert, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  tier: string | null;
  status: string | null;
  stripe_subscription_status: string | null;
  created_at?: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map<string, string>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role));

      setUsers(profiles || []);
      setUserRoles(roleMap);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: 'admin' | 'moderator' | 'user') {
    try {
      // Delete existing role
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Insert new role
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: newRole,
      });

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser?.id,
        action: 'update_user_role',
        target_type: 'user',
        target_id: userId,
        details: { new_role: newRole },
      });

      setUserRoles((prev) => new Map(prev).set(userId, newRole));
      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  }

  async function updateUserStatus(userId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: currentUser?.id,
        action: newStatus === 'banned' ? 'ban_user' : 'update_user_status',
        target_type: 'user',
        target_id: userId,
        details: { new_status: newStatus },
      });

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, status: newStatus } : u))
      );

      toast({
        title: 'Status Updated',
        description: `User status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.user_id.toLowerCase().includes(search.toLowerCase());
    
    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && userRoles.get(user.user_id) === roleFilter;
  });

  const getRoleBadge = (userId: string) => {
    const role = userRoles.get(userId) || 'user';
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      admin: { color: 'bg-red-500/10 text-red-500', icon: <Shield className="h-3 w-3" /> },
      moderator: { color: 'bg-yellow-500/10 text-yellow-500', icon: <ShieldAlert className="h-3 w-3" /> },
      user: { color: 'bg-blue-500/10 text-blue-500', icon: <User className="h-3 w-3" /> },
    };
    const v = variants[role] || variants.user;
    return (
      <Badge className={`${v.color} gap-1`}>
        {v.icon}
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || 'active';
    const colors: Record<string, string> = {
      active: 'bg-green-500/10 text-green-500',
      warned: 'bg-yellow-500/10 text-yellow-500',
      banned: 'bg-red-500/10 text-red-500',
    };
    return <Badge className={colors[s] || colors.active}>{s}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          User Management ({users.length} users)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.slice(0, 50).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username || 'No username'}
                    <div className="text-xs text-muted-foreground truncate max-w-32">
                      {user.user_id}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.user_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.tier || 'free'}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.stripe_subscription_status || 'none'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Select
                        value={userRoles.get(user.user_id) || 'user'}
                        onValueChange={(value) =>
                          updateUserRole(user.user_id, value as 'admin' | 'moderator' | 'user')
                        }
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {user.status !== 'banned' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateUserStatus(user.user_id, 'banned')}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(user.user_id, 'active')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length > 50 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing 50 of {filteredUsers.length} users
          </p>
        )}
      </CardContent>
    </Card>
  );
}
