import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Trophy, 
  Calendar, 
  Clock,
  User,
  Award,
  FileText,
  Plus,
  Download
} from "lucide-react";

export function FFARecordBook() {
  const [newActivity, setNewActivity] = useState({
    title: "",
    date: "",
    hours: "",
    description: "",
    category: "SAE"
  });

  const [activities, setActivities] = useState<any[]>([]);

  const [achievements, setAchievements] = useState<any[]>([]);

  const handleAddActivity = () => {
    if (newActivity.title && newActivity.date && newActivity.hours) {
      const activity = {
        id: Date.now(),
        title: newActivity.title,
        date: newActivity.date,
        hours: parseInt(newActivity.hours),
        category: newActivity.category,
        description: newActivity.description
      };
      setActivities(prev => [...prev, activity]);
      setNewActivity({
        title: "",
        date: "",
        hours: "",
        description: "",
        category: "SAE"
      });
    }
  };

  const getTotalHours = (category?: string) => {
    return activities
      .filter(activity => !category || activity.category === category)
      .reduce((total, activity) => total + activity.hours, 0);
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <BookOpen className="h-5 w-5" />
            FFA Record Book
            <Badge className="bg-ffa-blue text-white">Historian</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track your SAE activities, FFA involvement, and achievements
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-ffa-blue/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">SAE Hours</p>
                        <p className="text-2xl font-bold text-ffa-blue">{getTotalHours("SAE")}</p>
                      </div>
                      <Clock className="h-8 w-8 text-ffa-blue" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-ffa-gold/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">FFA Activities</p>
                        <p className="text-2xl font-bold text-ffa-gold">{getTotalHours("FFA Activities")}</p>
                      </div>
                      <Trophy className="h-8 w-8 text-ffa-gold" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-ffa-field/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                        <p className="text-2xl font-bold text-ffa-field">{getTotalHours()}</p>
                      </div>
                      <Award className="h-8 w-8 text-ffa-field" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <div className="text-center py-6">
                        <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No activities recorded yet</p>
                        <p className="text-sm text-muted-foreground">Add your first activity to start tracking!</p>
                      </div>
                    ) : (
                      activities.slice(0, 3).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-ffa-sky/5 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{activity.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {activity.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{activity.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-ffa-navy">{activity.hours}h</p>
                        </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              {/* Add New Activity */}
              <Card className="border-ffa-gold/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Plus className="h-5 w-5" />
                    Add New Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Activity Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter activity title"
                        value={newActivity.title}
                        onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newActivity.date}
                        onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hours">Hours</Label>
                      <Input
                        id="hours"
                        type="number"
                        placeholder="Hours spent"
                        value={newActivity.hours}
                        onChange={(e) => setNewActivity({...newActivity, hours: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={newActivity.category}
                        onChange={(e) => setNewActivity({...newActivity, category: e.target.value})}
                      >
                        <option value="SAE">SAE</option>
                        <option value="FFA Activities">FFA Activities</option>
                        <option value="Community Service">Community Service</option>
                        <option value="Leadership">Leadership</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the activity..."
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleAddActivity} className="bg-ffa-gold hover:bg-ffa-harvest text-white">
                    Add Activity
                  </Button>
                </CardContent>
              </Card>

              {/* Activities List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Activity Log
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Activities Recorded</h3>
                      <p className="text-muted-foreground">Start building your FFA record by adding activities above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                      <div key={activity.id} className="p-4 border border-ffa-sky/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{activity.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {activity.category}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-ffa-navy">{activity.hours} hours</p>
                            <p className="text-xs text-muted-foreground">{activity.date}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    FFA Achievements & Recognition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {achievements.length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                      <p className="text-muted-foreground">Your FFA achievements and recognitions will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {achievements.map((achievement, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-ffa-blue/5 to-ffa-gold/5 border border-ffa-gold/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-ffa-navy">{achievement.title}</h3>
                          <Badge className="bg-ffa-gold text-white">{achievement.year}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    FFA Goals & Planning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-ffa-field/10 rounded-lg">
                      <h3 className="font-semibold text-ffa-field mb-2">State Degree Goal</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Working toward Virginia FFA State Degree - requires 300 hours of SAE
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-ffa-field h-2 rounded-full" 
                          style={{width: `${Math.min((getTotalHours("SAE") / 300) * 100, 100)}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getTotalHours("SAE")} / 300 hours completed
                      </p>
                    </div>

                    <div className="p-4 bg-ffa-blue/10 rounded-lg">
                      <h3 className="font-semibold text-ffa-blue mb-2">Chapter Historian Excellence</h3>
                      <p className="text-sm text-muted-foreground">
                        Document 12 major chapter events and maintain comprehensive photo archive
                      </p>
                    </div>

                    <div className="p-4 bg-ffa-gold/10 rounded-lg">
                      <h3 className="font-semibold text-ffa-harvest mb-2">Career Development</h3>
                      <p className="text-sm text-muted-foreground">
                        Participate in 3 Career Development Events this year
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}