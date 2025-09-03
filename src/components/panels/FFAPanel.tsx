import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Wheat, 
  BookOpen, 
  Calculator, 
  Calendar,
  Trophy,
  Users,
  FileText,
  Award
} from "lucide-react";
import { FFADashboard } from "@/components/FFA/FFADashboard";
import { AgricultureCalculator } from "@/components/FFA/AgricultureCalculator";
import { FFARecordBook } from "@/components/FFA/FFARecordBook";

export function FFAPanel() {
  return (
    <div className="h-full w-full">
      {/* FFA Header Banner */}
      <div className="bg-gradient-to-r from-ffa-blue via-ffa-navy to-ffa-gold p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wheat className="h-8 w-8" />
              FFA Center
            </h1>
            <p className="text-blue-100 mt-2">
              Future Farmers of America - Agricultural Education Excellence
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                <Award className="h-4 w-4 mr-1" />
                Jessie Crider - Chapter Historian 2025-2026
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Southwest Virginia Chapter</p>
            <p className="text-blue-200">Serving Agriculture Since 1928</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 bg-ffa-sky/10">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              Ag Calculator
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Record Book
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="competitions" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Competitions
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FFADashboard />
          </TabsContent>

          <TabsContent value="calculator">
            <AgricultureCalculator />
          </TabsContent>

          <TabsContent value="records">
            <FFARecordBook />
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-ffa-navy">
                  <Calendar className="h-5 w-5" />
                  FFA Events & Calendar
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track important FFA events, competitions, and deadlines
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-ffa-gold mb-4" />
                  <h3 className="text-lg font-semibold text-ffa-navy mb-2">Event Calendar Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Full event management and calendar integration will be available soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-ffa-navy">
                  <Trophy className="h-5 w-5" />
                  Career Development Events
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track competition participation and results
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-ffa-blue/20">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-ffa-blue mb-2">Livestock Judging</h3>
                      <p className="text-sm text-muted-foreground">
                        Evaluate and rank different livestock breeds
                      </p>
                      <Badge className="mt-2 bg-ffa-gold text-white">Active</Badge>
                    </CardContent>
                  </Card>

                  <Card className="border-ffa-field/20">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-ffa-field mb-2">Agricultural Sales</h3>
                      <p className="text-sm text-muted-foreground">
                        Sales presentation and communication skills
                      </p>
                      <Badge variant="outline">Available</Badge>
                    </CardContent>
                  </Card>

                  <Card className="border-ffa-harvest/20">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-ffa-harvest mb-2">Farm Business Management</h3>
                      <p className="text-sm text-muted-foreground">
                        Agricultural business analysis and planning
                      </p>
                      <Badge variant="outline">Available</Badge>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-ffa-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-ffa-navy">
                    <BookOpen className="h-5 w-5" />
                    Educational Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-ffa-sky/10 rounded-lg">
                    <h4 className="font-medium text-sm">Agricultural Science</h4>
                    <p className="text-xs text-muted-foreground">Crop science, soil health, plant biology</p>
                  </div>
                  <div className="p-3 bg-ffa-corn/10 rounded-lg">
                    <h4 className="font-medium text-sm">Animal Science</h4>
                    <p className="text-xs text-muted-foreground">Livestock management, nutrition, breeding</p>
                  </div>
                  <div className="p-3 bg-ffa-field/10 rounded-lg">
                    <h4 className="font-medium text-sm">Agricultural Business</h4>
                    <p className="text-xs text-muted-foreground">Farm economics, marketing, management</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-ffa-gold/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-ffa-navy">
                    <Award className="h-5 w-5" />
                    FFA Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-ffa-gold/10 rounded-lg">
                    <h4 className="font-medium text-sm">Leadership Development</h4>
                    <p className="text-xs text-muted-foreground">Officer training, public speaking, teamwork</p>
                  </div>
                  <div className="p-3 bg-ffa-harvest/10 rounded-lg">
                    <h4 className="font-medium text-sm">Career Exploration</h4>
                    <p className="text-xs text-muted-foreground">Agricultural careers, internships, job shadowing</p>
                  </div>
                  <div className="p-3 bg-ffa-navy/10 rounded-lg">
                    <h4 className="font-medium text-sm">Community Service</h4>
                    <p className="text-xs text-muted-foreground">Service learning, community projects</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}