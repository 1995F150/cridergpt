import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Users, DollarSign, Copy, LogOut, Trash2, UserPlus } from 'lucide-react';

interface SpendingGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string | null;
  role: string;
  joined_at: string;
}

interface SpendingEntry {
  id: string;
  group_id: string;
  spent_by: string;
  spent_on: string | null;
  amount: number;
  category: string;
  store_location: string | null;
  note: string | null;
  spent_date: string;
  created_at: string;
}

const CATEGORIES = [
  'general', 'food', 'gifts', 'gas', 'entertainment',
  'groceries', 'clothing', 'travel', 'bills', 'other'
];

export function SharedSpending() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<SpendingGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SpendingGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Create group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Join group form
  const [joinCode, setJoinCode] = useState('');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Add entry form
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('general');
  const [entryStore, setEntryStore] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entrySpentOn, setEntrySpentOn] = useState<string>('');
  const [addEntryOpen, setAddEntryOpen] = useState(false);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMembers(selectedGroup.id);
      fetchEntries(selectedGroup.id);
    }
  }, [selectedGroup]);

  async function fetchGroups() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('spending_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Filter to only groups user is a member of
      const { data: memberData } = await (supabase as any)
        .from('spending_group_members')
        .select('group_id')
        .eq('user_id', user!.id);

      const memberGroupIds = new Set((memberData || []).map((m: any) => m.group_id));
      const myGroups = (data as SpendingGroup[]).filter(g => memberGroupIds.has(g.id));
      setGroups(myGroups);
      if (myGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(myGroups[0]);
      }
    }
    setLoading(false);
  }

  async function fetchMembers(groupId: string) {
    const { data } = await (supabase as any)
      .from('spending_group_members')
      .select('*')
      .eq('group_id', groupId);
    setMembers(data || []);
  }

  async function fetchEntries(groupId: string) {
    const { data } = await (supabase as any)
      .from('spending_entries')
      .select('*')
      .eq('group_id', groupId)
      .order('spent_date', { ascending: false });
    setEntries(data || []);
  }

  async function createGroup() {
    if (!newGroupName.trim() || !user) return;

    const { data: group, error } = await (supabase as any)
      .from('spending_groups')
      .insert({ name: newGroupName.trim(), description: newGroupDesc.trim() || null, created_by: user.id })
      .select()
      .single();

    if (error) { toast.error('Failed to create group'); return; }

    // Auto-join as creator
    await (supabase as any)
      .from('spending_group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        display_name: user.user_metadata?.full_name || user.email,
        role: 'owner'
      });

    setNewGroupName('');
    setNewGroupDesc('');
    setCreateDialogOpen(false);
    toast.success('Group created!');
    fetchGroups();
    setSelectedGroup(group);
  }

  async function joinGroup() {
    if (!joinCode.trim() || !user) return;

    const { data: group } = await (supabase as any)
      .from('spending_groups')
      .select('*')
      .eq('invite_code', joinCode.trim().toLowerCase())
      .single();

    if (!group) { toast.error('Invalid invite code'); return; }

    const { error } = await (supabase as any)
      .from('spending_group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        display_name: user.user_metadata?.full_name || user.email,
        role: 'member'
      });

    if (error) {
      if (error.code === '23505') toast.error('Already in this group');
      else toast.error('Failed to join');
      return;
    }

    setJoinCode('');
    setJoinDialogOpen(false);
    toast.success(`Joined "${group.name}"!`);
    fetchGroups();
    setSelectedGroup(group);
  }

  async function addEntry() {
    if (!entryAmount || !selectedGroup || !user) return;

    const { error } = await (supabase as any)
      .from('spending_entries')
      .insert({
        group_id: selectedGroup.id,
        spent_by: user.id,
        spent_on: entrySpentOn || null,
        amount: parseFloat(entryAmount),
        category: entryCategory,
        store_location: entryStore.trim() || null,
        note: entryNote.trim() || null,
        spent_date: entryDate
      });

    if (error) { toast.error('Failed to add entry'); return; }

    setEntryAmount('');
    setEntryStore('');
    setEntryNote('');
    setEntrySpentOn('');
    setAddEntryOpen(false);
    toast.success('Entry added!');
    fetchEntries(selectedGroup.id);
  }

  async function deleteEntry(id: string) {
    await (supabase as any).from('spending_entries').delete().eq('id', id);
    toast.success('Entry deleted');
    if (selectedGroup) fetchEntries(selectedGroup.id);
  }

  async function leaveGroup(groupId: string) {
    if (!user) return;
    await (supabase as any)
      .from('spending_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);
    toast.success('Left group');
    setSelectedGroup(null);
    fetchGroups();
  }

  function getMemberName(userId: string) {
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || 'Unknown';
  }

  function getUserTotals() {
    const totals: Record<string, number> = {};
    entries.forEach(e => {
      totals[e.spent_by] = (totals[e.spent_by] || 0) + Number(e.amount);
    });
    return totals;
  }

  const groupTotal = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const userTotals = getUserTotals();

  if (!user) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Sign in to use Shared Spending.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Shared Spending</h1>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Group</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Spending Group</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Group Name</Label>
                  <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Me & Sarah" />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Track our spending" />
                </div>
                <Button onClick={createGroup} className="w-full">Create Group</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Join Group</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Join a Group</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Invite Code</Label>
                  <Input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter invite code" />
                </div>
                <Button onClick={joinGroup} className="w-full">Join</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {groups.length === 0 && !loading ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No groups yet. Create one or join with an invite code!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Group selector */}
          {groups.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {groups.map(g => (
                <Button
                  key={g.id}
                  variant={selectedGroup?.id === g.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGroup(g)}
                >
                  {g.name}
                </Button>
              ))}
            </div>
          )}

          {selectedGroup && (
            <Tabs defaultValue="entries" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="entries">Spending</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>

              {/* SPENDING TAB */}
              <TabsContent value="entries" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Group total: <span className="font-bold text-foreground">${groupTotal.toFixed(2)}</span>
                  </p>
                  <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Spending Entry</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>Amount ($)</Label>
                          <Input type="number" step="0.01" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                          <Label>Spent On (who)</Label>
                          <Select value={entrySpentOn} onValueChange={setEntrySpentOn}>
                            <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                            <SelectContent>
                              {members.filter(m => m.user_id !== user.id).map(m => (
                                <SelectItem key={m.user_id} value={m.user_id}>
                                  {m.display_name || 'Member'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select value={entryCategory} onValueChange={setEntryCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => (
                                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Store / Location</Label>
                          <Input value={entryStore} onChange={e => setEntryStore(e.target.value)} placeholder="Walmart, Amazon, etc." />
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                        </div>
                        <div>
                          <Label>Note</Label>
                          <Textarea value={entryNote} onChange={e => setEntryNote(e.target.value)} placeholder="What was it for?" rows={2} />
                        </div>
                        <Button onClick={addEntry} className="w-full">Add Entry</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {entries.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      No spending entries yet. Add one!
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="hidden md:table-cell">Store</TableHead>
                          <TableHead className="hidden md:table-cell">Note</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map(e => (
                          <TableRow key={e.id}>
                            <TableCell className="text-xs">{e.spent_date}</TableCell>
                            <TableCell className="text-xs">{getMemberName(e.spent_by)}</TableCell>
                            <TableCell className="text-xs">{e.spent_on ? getMemberName(e.spent_on) : '—'}</TableCell>
                            <TableCell className="font-semibold">${Number(e.amount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs capitalize">{e.category}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{e.store_location || '—'}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{e.note || '—'}</TableCell>
                            <TableCell>
                              {e.spent_by === user.id && (
                                <Button variant="ghost" size="icon" onClick={() => deleteEntry(e.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* SUMMARY TAB */}
              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Spending Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-primary/10">
                        <DollarSign className="h-6 w-6 mx-auto text-primary mb-1" />
                        <div className="text-2xl font-bold text-foreground">${groupTotal.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Total Spent</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-secondary/10">
                        <Users className="h-6 w-6 mx-auto text-secondary mb-1" />
                        <div className="text-2xl font-bold text-foreground">{members.length}</div>
                        <div className="text-xs text-muted-foreground">Members</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Per Person</h3>
                      {members.map(m => (
                        <div key={m.user_id} className="flex justify-between items-center p-2 rounded bg-muted/50">
                          <span className="text-sm">{m.display_name || 'Member'}</span>
                          <span className="font-semibold">${(userTotals[m.user_id] || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Category breakdown */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">By Category</h3>
                      {CATEGORIES.filter(c => entries.some(e => e.category === c)).map(cat => {
                        const catTotal = entries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
                        return (
                          <div key={cat} className="flex justify-between items-center p-2 rounded bg-muted/50">
                            <Badge variant="outline" className="capitalize">{cat}</Badge>
                            <span className="font-semibold">${catTotal.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MEMBERS TAB */}
              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Members</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedGroup.invite_code);
                          toast.success('Invite code copied!');
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" /> {selectedGroup.invite_code}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {members.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                        <div>
                          <span className="font-medium text-sm">{m.display_name || 'Member'}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">{m.role}</Badge>
                        </div>
                        {m.user_id === user.id && m.role !== 'owner' && (
                          <Button variant="ghost" size="sm" onClick={() => leaveGroup(selectedGroup.id)}>
                            <LogOut className="h-4 w-4 mr-1" /> Leave
                          </Button>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-2">
                      Share the invite code above so others can join this group.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
