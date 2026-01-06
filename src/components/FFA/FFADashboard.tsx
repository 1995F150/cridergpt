import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  Trophy, 
  BookOpen, 
  Camera, 
  FileText,
  Wheat,
  Clock,
  Plus,
  Settings,
  Bell,
  ShieldCheck
} from "lucide-react";
import { useFFAProfile } from "@/hooks/useFFAProfile";
import { useEvents } from "@/hooks/useEvents";
import { useState, useEffect } from "react";
import { FFASetupModal } from "./FFASetupModal";
import { EventModal } from "./EventModal";
import { ChapterRequestAdmin } from "./ChapterRequestAdmin";
import { Loader2 } from "lucide-react";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function FFADashboard() {
  const { user } = useAuth();
  const { profile, chapter, loading: profileLoading, needsSetup, isOfficer, isAdvisor } = useFFAProfile();
  const { events, loading: eventsLoading, getUpcomingEvents, getChapterEvents, createEvent } = useEvents(profile?.chapter_id);
  const { permission, requestPermission, canSendNotifications } = useBrowserNotifications();
  
  const [setupOpen, setSetupOpen] = useState(needsSetup);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is an admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    };
    checkAdmin();
  }, [user]);

  // Sync setupOpen with needsSetup
  useEffect(() => {
    if (needsSetup) {
      setSetupOpen(true);
    }
  }, [needsSetup]);

  const upcomingEvents = getUpcomingEvents(5);
  const chapterEvents = getChapterEvents();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="p-6 space-y-6">
        <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="h-6 w-6" />
              Welcome to FFA Center
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Set up your FFA profile to access chapter features, events, and resources.
            </p>
            <Button onClick={() => setSetupOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Complete FFA Setup
            </Button>
          </CardContent>
        </Card>
        <FFASetupModal open={setupOpen} onOpenChange={setSetupOpen} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Wheat className="h-6 w-6" />
                FFA Chapter Dashboard
              </CardTitle>
              <p className="text-primary-foreground/80 mt-2">
                {chapter?.name || 'Your Chapter'}
                {profile?.officer_role && ` • ${profile.officer_role}`}
                {profile?.is_advisor && ' • Advisor'}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {(isOfficer || isAdvisor) && (
                <Badge variant="secondary" className="bg-background/20 text-primary-foreground">
                  {isAdvisor ? 'Advisor' : profile?.officer_role}
                </Badge>
              )}
              {!canSendNotifications && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={requestPermission}
                  title="Enable notifications for calendar events"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSetupOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className={`grid w-full ${isAdmin || isAdvisor ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="documentation">Docs</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          {(isAdmin || isAdvisor) && (
            <TabsTrigger value="admin" className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Upcoming Events */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setEventModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="p-2 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {event.visibility === 'chapter' ? 'Chapter' : 'Personal'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(event.event_date).toLocaleDateString()}
                          {event.event_time && ` at ${event.event_time}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chapter Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" />
                  Chapter Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium text-sm">{chapter?.name || 'Not set'}</p>
                  <p className="text-xs text-muted-foreground">
                    {chapter?.city && `${chapter.city}, `}{chapter?.state}
                  </p>
                </div>
                {profile?.graduation_year && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Graduation Year</p>
                    <p className="font-medium text-sm">{profile.graduation_year}</p>
                  </div>
                )}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Chapter Events</p>
                  <p className="font-medium text-sm">{chapterEvents.length} events</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setEventModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photos
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Chapter Events
              </CardTitle>
              <Button onClick={() => setEventModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : chapterEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No chapter events yet</p>
                  <Button className="mt-4" onClick={() => setEventModalOpen(true)}>
                    Create First Event
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {chapterEvents.map((event) => (
                    <div key={event.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge>{event.category}</Badge>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(event.event_date).toLocaleDateString()}
                          {event.event_time && ` at ${event.event_time}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation Center
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage chapter records, photos, and historical documents
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Camera className="h-6 w-6 mb-2" />
                  Photo Archive
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  Meeting Minutes
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Trophy className="h-6 w-6 mb-2" />
                  Awards & Recognition
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <BookOpen className="h-6 w-6 mb-2" />
                  Chapter History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Educational Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Agricultural Science</h4>
                  <p className="text-xs text-muted-foreground">Crop science, soil health, plant biology</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Animal Science</h4>
                  <p className="text-xs text-muted-foreground">Livestock management, nutrition, breeding</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Agricultural Business</h4>
                  <p className="text-xs text-muted-foreground">Farm economics, marketing, management</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  FFA Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Leadership Development</h4>
                  <p className="text-xs text-muted-foreground">Officer training, public speaking, teamwork</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Career Exploration</h4>
                  <p className="text-xs text-muted-foreground">Agricultural careers, internships, job shadowing</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Community Service</h4>
                  <p className="text-xs text-muted-foreground">Service learning, community projects</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {(isAdmin || isAdvisor) && (
          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Admin Panel
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review and approve chapter requests from members
                </p>
              </CardHeader>
              <CardContent>
                <ChapterRequestAdmin />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <FFASetupModal open={setupOpen} onOpenChange={setSetupOpen} />
      <EventModal 
        open={eventModalOpen} 
        onOpenChange={setEventModalOpen}
        chapterId={profile?.chapter_id}
        onSave={createEvent}
      />
    </div>
  );
}
