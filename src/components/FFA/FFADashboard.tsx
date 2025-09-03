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
  Tractor,
  Leaf,
  Award,
  Clock,
  MapPin
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function FFADashboard() {
  const { user } = useAuth();

  const upcomingEvents = [
    {
      title: "State FFA Convention",
      date: "March 15, 2025",
      location: "Richmond, VA",
      type: "Convention"
    },
    {
      title: "Livestock Judging Contest",
      date: "April 2, 2025", 
      location: "VT Campus",
      type: "Competition"
    },
    {
      title: "Agricultural Education Week",
      date: "February 22-28, 2025",
      location: "Statewide",
      type: "Awareness"
    }
  ];

  const historianTasks = [
    {
      task: "Document State Convention",
      priority: "High",
      dueDate: "March 16, 2025",
      status: "Pending"
    },
    {
      task: "Create Chapter Newsletter",
      priority: "Medium", 
      dueDate: "February 1, 2025",
      status: "In Progress"
    },
    {
      task: "Update Photo Archive",
      priority: "Medium",
      dueDate: "January 31, 2025", 
      status: "Completed"
    }
  ];

  const recentActivities = [
    {
      title: "Winter Leadership Conference Photos",
      date: "January 10, 2025",
      type: "Documentation"
    },
    {
      title: "Chapter Meeting Minutes", 
      date: "January 8, 2025",
      type: "Records"
    },
    {
      title: "Agricultural Career Fair Coverage",
      date: "December 15, 2024",
      type: "Event"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-ffa-blue to-ffa-gold text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Wheat className="h-6 w-6" />
                FFA Chapter Dashboard
              </CardTitle>
              <p className="text-blue-100 mt-2">
                Jessie Crider - Chapter Historian 2025-2026
              </p>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              <Award className="h-4 w-4 mr-1" />
              Officer
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Historian Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-ffa-navy">
                  <FileText className="h-5 w-5" />
                  Historian Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {historianTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-ffa-sky/10 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.task}</p>
                        <p className="text-xs text-muted-foreground">Due: {task.dueDate}</p>
                      </div>
                      <Badge 
                        variant={task.status === "Completed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-ffa-navy">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-2 border border-ffa-gold/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs border-ffa-blue">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {event.date}
                        <MapPin className="h-3 w-3 ml-2" />
                        {event.location}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-ffa-navy">
                  <Camera className="h-5 w-5" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="p-2 bg-ffa-field/10 rounded-lg">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{activity.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                FFA Events Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {upcomingEvents.map((event, index) => (
                  <div key={index} className="p-4 border border-ffa-gold/30 rounded-lg bg-gradient-to-r from-ffa-sky/5 to-ffa-corn/5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-ffa-navy">{event.title}</h3>
                      <Badge className="bg-ffa-blue text-white">{event.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    </div>
                    <Button size="sm" className="mt-3 bg-ffa-gold hover:bg-ffa-harvest text-white">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
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
                <Button variant="outline" className="h-20 flex-col border-ffa-blue hover:bg-ffa-sky/10">
                  <Camera className="h-6 w-6 mb-2 text-ffa-blue" />
                  Photo Archive
                </Button>
                <Button variant="outline" className="h-20 flex-col border-ffa-gold hover:bg-ffa-corn/10">
                  <FileText className="h-6 w-6 mb-2 text-ffa-harvest" />
                  Meeting Minutes
                </Button>
                <Button variant="outline" className="h-20 flex-col border-ffa-field hover:bg-ffa-field/10">
                  <Trophy className="h-6 w-6 mb-2 text-ffa-field" />
                  Awards & Recognition
                </Button>
                <Button variant="outline" className="h-20 flex-col border-ffa-navy hover:bg-ffa-navy/10">
                  <BookOpen className="h-6 w-6 mb-2 text-ffa-navy" />
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
                <CardTitle className="flex items-center gap-2 text-ffa-navy">
                  <BookOpen className="h-5 w-5" />
                  Agricultural Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Tractor className="h-4 w-4 mr-2" />
                  Equipment Management
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Leaf className="h-4 w-4 mr-2" />
                  Crop Planning
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Livestock Records
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-ffa-navy">
                  <Award className="h-5 w-5" />
                  FFA Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Trophy className="h-4 w-4 mr-2" />
                  Competition Tracker
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Record Book
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Event Planner
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}