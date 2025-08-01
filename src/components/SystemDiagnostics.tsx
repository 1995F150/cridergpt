
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, XCircle, Activity, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DiagnosticResult {
  service: string;
  status: 'healthy' | 'degraded' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

interface SystemReport {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  results: DiagnosticResult[];
  summary: {
    totalChecks: number;
    healthyServices: number;
    degradedServices: number;
    errorServices: number;
  };
  usageStats: {
    totalUsers: number;
    activeUsersLast24h: number;
    totalAIRequests: number;
    totalTTSRequests: number;
    stripeCustomers: number;
  };
  recommendations: string[];
}

export function SystemDiagnostics() {
  const [report, setReport] = useState<SystemReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-diagnostics');
      
      if (error) {
        throw error;
      }

      setReport(data);
      
      toast({
        title: "Diagnostics Complete",
        description: `System status: ${data.overallStatus.toUpperCase()}`,
        variant: data.overallStatus === 'critical' ? 'destructive' : 'default',
      });

    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Failed",
        description: error.message || "Unable to run system diagnostics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'border-green-500 bg-green-50';
      case 'degraded': return 'border-yellow-500 bg-yellow-50';
      case 'critical': return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">CriderGPT System Diagnostics</h1>
            <p className="text-muted-foreground">Real-time system health monitoring and diagnostics</p>
          </div>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {report && (
        <>
          {/* Overall Status */}
          <Card className={`border-2 ${getOverallStatusColor(report.overallStatus)}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(report.overallStatus)}
                  <div>
                    <CardTitle className="text-2xl">
                      System Status: {report.overallStatus.toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      Last checked: {new Date().toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={report.overallStatus === 'healthy' ? 'default' : 'destructive'}>
                  {report.summary.healthyServices}/{report.summary.totalChecks} Services Healthy
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{report.summary.healthyServices}</div>
                  <div className="text-sm text-muted-foreground">Healthy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{report.summary.degradedServices}</div>
                  <div className="text-sm text-muted-foreground">Degraded</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{report.summary.errorServices}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>
              
              <Progress 
                value={(report.summary.healthyServices / report.summary.totalChecks) * 100} 
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Service Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.results.map((result, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      {result.service}
                    </CardTitle>
                    <Badge variant={result.status === 'healthy' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                  {result.details && (
                    <div className="text-xs bg-muted p-2 rounded mt-2">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>Current platform usage metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{report.usageStats.totalUsers}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{report.usageStats.activeUsersLast24h}</div>
                  <div className="text-sm text-muted-foreground">Active (24h)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{report.usageStats.totalAIRequests}</div>
                  <div className="text-sm text-muted-foreground">AI Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{report.usageStats.totalTTSRequests}</div>
                  <div className="text-sm text-muted-foreground">TTS Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{report.usageStats.stripeCustomers}</div>
                  <div className="text-sm text-muted-foreground">Stripe Customers</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Recommendations
                </CardTitle>
                <CardDescription>
                  Suggested actions to improve system health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!report && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready for System Check</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run Diagnostics" to perform a comprehensive health check of all CriderGPT systems.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
