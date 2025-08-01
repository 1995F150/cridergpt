
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, FileText, Zap, TrendingUp, Clock } from "lucide-react";
import { MapBuilderPromo } from "@/components/MapBuilderPromo";

export function StatusPanel() {
  const stats = [
    {
      title: "Active Sessions",
      value: "1,247",
      change: "+12%",
      icon: Activity,
      color: "text-green-600"
    },
    {
      title: "Total Users",
      value: "10,892",
      change: "+8%",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Files Processed",
      value: "45,231",
      change: "+23%",
      icon: FileText,
      color: "text-purple-600"
    },
    {
      title: "AI Responses",
      value: "127,549",
      change: "+18%",
      icon: Zap,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Status</h1>
        <p className="text-muted-foreground">
          Real-time system performance and usage statistics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="text-xs">
                      {stat.change}
                    </Badge>
                  </div>
                </div>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Response Time</span>
                <span className="text-sm font-medium">0.8s avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium">99.9%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium">0.1%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">CPU Usage</span>
                <span className="text-sm font-medium">42%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>System health check completed</span>
                <span className="text-muted-foreground ml-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Database backup successful</span>
                <span className="text-muted-foreground ml-auto">15m ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>AI model updated</span>
                <span className="text-muted-foreground ml-auto">1h ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Security scan completed</span>
                <span className="text-muted-foreground ml-auto">3h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MapBuilderPromo />
    </div>
  );
}
