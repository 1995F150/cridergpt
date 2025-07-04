import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

interface APIKey {
  id: number;
  name: string;
  key: string;
  usage: number;
  limit: number;
  createdAt: Date;
  status: 'active' | 'expired' | 'disabled';
}

export function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: 1,
      name: "OpenAI GPT-4",
      key: "sk-...xyz123",
      usage: 1500,
      limit: 10000,
      createdAt: new Date('2024-01-01'),
      status: 'active'
    },
    {
      id: 2,
      name: "Weather API",
      key: "wk-...abc456",
      usage: 250,
      limit: 1000,
      createdAt: new Date('2024-01-05'),
      status: 'active'
    }
  ]);

  const [newKeyName, setNewKeyName] = useState("");

  const generateNewKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey: APIKey = {
      id: apiKeys.length + 1,
      name: newKeyName,
      key: `ck-${Math.random().toString(36).substring(2, 15)}`,
      usage: 0,
      limit: 5000,
      createdAt: new Date(),
      status: 'active'
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-background';
      case 'expired': return 'bg-red-500 text-background';
      case 'disabled': return 'bg-gray-500 text-background';
      default: return 'bg-secondary';
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5 text-cyber-blue" />
          <span className="text-cyber-blue">API Key Manager</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="API Key Name..."
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="bg-input border-border focus:ring-cyber-blue"
          />
          <Button 
            onClick={generateNewKey}
            className="bg-cyber-blue hover:bg-cyber-blue-dark"
          >
            Generate
          </Button>
        </div>

        <div className="space-y-3">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">{apiKey.name}</h3>
                <Badge className={getStatusColor(apiKey.status)}>
                  {apiKey.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <code className="bg-tech-gray px-2 py-1 rounded text-sm font-mono text-cyber-blue">
                    {apiKey.key}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(apiKey.key)}
                    className="border-cyber-blue/20 text-cyber-blue"
                  >
                    Copy
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Usage: {apiKey.usage.toLocaleString()} / {apiKey.limit.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Created: {apiKey.createdAt.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="w-full bg-tech-gray rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyber-blue to-tech-accent h-2 rounded-full transition-all"
                    style={{ width: `${(apiKey.usage / apiKey.limit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}