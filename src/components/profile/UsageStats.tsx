
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function UsageStats() {
  // Mock data - in a real app, this would come from your usage tracking
  const stats = {
    currentLevel: 3,
    totalRequests: 1247,
    monthlyLimit: 5000,
    tokensUsed: 89500,
    tokenLimit: 100000,
    filesUploaded: 23,
    storageUsed: "2.3 GB",
    storageLimit: "10 GB"
  };

  const requestsPercentage = (stats.totalRequests / stats.monthlyLimit) * 100;
  const tokensPercentage = (stats.tokensUsed / stats.tokenLimit) * 100;
  const storagePercentage = (2.3 / 10) * 100; // Convert GB to percentage

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            CriderRank Status
            <Badge variant="secondary">Level {stats.currentLevel}</Badge>
          </CardTitle>
          <CardDescription>
            Your current tier and benefits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You're a Level {stats.currentLevel} user with access to advanced features and higher usage limits.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
          <CardDescription>
            Your usage statistics for this month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>API Requests</span>
              <span>{stats.totalRequests.toLocaleString()} / {stats.monthlyLimit.toLocaleString()}</span>
            </div>
            <Progress value={requestsPercentage} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tokens Used</span>
              <span>{stats.tokensUsed.toLocaleString()} / {stats.tokenLimit.toLocaleString()}</span>
            </div>
            <Progress value={tokensPercentage} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Storage Used</span>
              <span>{stats.storageUsed} / {stats.storageLimit}</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>
            Your recent activity across different features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stats.filesUploaded}</p>
              <p className="text-xs text-muted-foreground">Files Uploaded</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">156</p>
              <p className="text-xs text-muted-foreground">Calculations Made</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">42</p>
              <p className="text-xs text-muted-foreground">Projects Created</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">89</p>
              <p className="text-xs text-muted-foreground">AI Conversations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
