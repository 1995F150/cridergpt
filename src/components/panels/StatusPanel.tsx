import { Card, CardContent } from "@/components/ui/card";

export function StatusPanel() {
  return (
    <div className="panel h-full w-full p-8">
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-cyber-blue mb-4">System Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyber-blue">3</div>
              <div className="text-sm text-muted-foreground">Active Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-tech-accent">2</div>
              <div className="text-sm text-muted-foreground">API Keys</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">5</div>
              <div className="text-sm text-muted-foreground">Files Uploaded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">12</div>
              <div className="text-sm text-muted-foreground">Automations</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}