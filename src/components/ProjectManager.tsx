import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Project {
  id: number;
  name: string;
  status: 'active' | 'completed' | 'pending';
  progress: number;
  type: 'fs22-mod' | 'fs25-mod' | 'api-integration' | 'automation';
  lastUpdated: Date;
}

export function ProjectManager() {
  const [projects] = useState<Project[]>([
    {
      id: 1,
      name: "FS25 Harvester Mod",
      status: 'active',
      progress: 75,
      type: 'fs25-mod',
      lastUpdated: new Date('2024-01-15')
    },
    {
      id: 2,
      name: "SMS Auto-Response System",
      status: 'completed',
      progress: 100,
      type: 'automation',
      lastUpdated: new Date('2024-01-10')
    },
    {
      id: 3,
      name: "Weather API Integration",
      status: 'pending',
      progress: 25,
      type: 'api-integration',
      lastUpdated: new Date('2024-01-12')
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-cyber-blue text-background';
      case 'completed': return 'bg-green-500 text-background';
      case 'pending': return 'bg-yellow-500 text-background';
      default: return 'bg-secondary';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fs22-mod': return 'FS22 Mod';
      case 'fs25-mod': return 'FS25 Mod';
      case 'api-integration': return 'API';
      case 'automation': return 'Automation';
      default: return type;
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-cyber-blue">Project Manager</span>
          <Button size="sm" className="bg-cyber-blue hover:bg-cyber-blue-dark">
            New Project
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">{project.name}</h3>
              <div className="flex space-x-2">
                <Badge variant="secondary" className="bg-tech-gray-light">
                  {getTypeLabel(project.type)}
                </Badge>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-cyber-blue font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2">
                <div className="h-full bg-gradient-to-r from-cyber-blue to-tech-accent rounded-full transition-all" />
              </Progress>
              <p className="text-xs text-muted-foreground">
                Last updated: {project.lastUpdated.toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-2 mt-3">
              <Button variant="outline" size="sm" className="border-cyber-blue/20 text-cyber-blue">
                View Details
              </Button>
              {project.status === 'active' && (
                <Button variant="outline" size="sm" className="border-tech-accent/20 text-tech-accent">
                  Deploy
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}