import { useState } from 'react';
import { useGuardianData, GuardianRelationship } from '@/hooks/useGuardianData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AddChildModal } from './AddChildModal';
import { ChildActivityCard } from './ChildActivityCard';
import { ActivityTimeline } from './ActivityTimeline';
import { AlertsPanel } from './AlertsPanel';
import { ChildAcceptInvite } from './ChildAcceptInvite';
import { 
  Shield, 
  UserPlus, 
  Bell, 
  Users, 
  Activity,
  Loader2,
  RefreshCw
} from 'lucide-react';

export function GuardianDashboard() {
  const { 
    relationships, 
    alerts, 
    loading, 
    unacknowledgedCount,
    toggleMonitoring,
    acknowledgeAlert,
    refreshData
  } = useGuardianData();
  
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<GuardianRelationship | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeRelationships = relationships.filter(r => r.status === 'accepted');
  const pendingRelationships = relationships.filter(r => r.status === 'pending');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Guardian Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Monitor and protect your children's activity
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setAddChildOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Child
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected Children</p>
                <p className="text-3xl font-bold">{activeRelationships.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-3xl font-bold">{pendingRelationships.length}</p>
              </div>
              <UserPlus className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className={unacknowledgedCount > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread Alerts</p>
                <p className="text-3xl font-bold">{unacknowledgedCount}</p>
              </div>
              <Bell className={`h-8 w-8 ${unacknowledgedCount > 0 ? 'text-destructive' : 'text-muted-foreground/30'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="children" className="space-y-4">
        <TabsList>
          <TabsTrigger value="children" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Children
            {pendingRelationships.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingRelationships.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="ml-1">{unacknowledgedCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            My Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="space-y-4">
          {relationships.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No children connected</h3>
                <p className="text-muted-foreground mb-4">
                  Add a child to start monitoring their activity
                </p>
                <Button onClick={() => setAddChildOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Child
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relationships.map((relationship) => (
                <ChildActivityCard
                  key={relationship.id}
                  relationship={relationship}
                  onToggleMonitoring={toggleMonitoring}
                  onViewDetails={setSelectedChild}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel alerts={alerts} onAcknowledge={acknowledgeAlert} />
        </TabsContent>

        <TabsContent value="my-status">
          <Card>
            <CardHeader>
              <CardTitle>Your Monitoring Status</CardTitle>
              <CardDescription>
                See if any guardians are monitoring your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChildAcceptInvite />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Child Modal */}
      <AddChildModal open={addChildOpen} onOpenChange={setAddChildOpen} />

      {/* Child Details Sheet */}
      <Sheet open={!!selectedChild} onOpenChange={() => setSelectedChild(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {selectedChild?.child_email || 'Activity Details'}
            </SheetTitle>
          </SheetHeader>
          {selectedChild?.child_id && (
            <div className="mt-6">
              <ActivityTimeline childId={selectedChild.child_id} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
