import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, ExternalLink, Search, CheckCircle2, Settings } from 'lucide-react';

const cloudServices = [
  {
    id: 'geforce-now',
    name: 'GeForce NOW',
    description: 'Stream PC games from your library',
    url: 'https://play.geforcenow.com/',
    logo: '🎮',
    features: ['1080p/60fps Free', '4K/120fps Priority', 'RTX ON', 'No Downloads']
  },
  {
    id: 'xbox-cloud',
    name: 'Xbox Cloud Gaming',
    description: 'Play Xbox games in your browser',
    url: 'https://www.xbox.com/play',
    logo: '🎯',
    features: ['Game Pass Library', '1080p/60fps', 'Touch Controls', 'Cross-Save']
  },
  {
    id: 'amazon-luna',
    name: 'Amazon Luna',
    description: 'Cloud gaming service by Amazon',
    url: 'https://luna.amazon.com/',
    logo: '☁️',
    features: ['4K/60fps', 'Luna Controller', 'Prime Gaming', 'Multiple Channels']
  },
  {
    id: 'playstation-plus',
    name: 'PlayStation Plus Premium',
    description: 'Stream PlayStation games',
    url: 'https://www.playstation.com/ps-plus/',
    logo: '🎮',
    features: ['PS5 Games', 'PS4 Library', '1080p/60fps', 'Cloud Saves']
  }
];

export function CloudGamingPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const filteredServices = cloudServices.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-2">
          <Cloud className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cloud Gaming</h1>
            <p className="text-sm text-muted-foreground">Play any game on any device via cloud streaming</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="services">Cloud Services</TabsTrigger>
            <TabsTrigger value="settings">My Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cloud gaming services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredServices.map((service) => (
                <Card 
                  key={service.id}
                  className={`transition-all hover:shadow-lg cursor-pointer ${
                    selectedService === service.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{service.logo}</span>
                        <div>
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {service.description}
                          </CardDescription>
                        </div>
                      </div>
                      {selectedService === service.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {service.features.map((feature, idx) => (
                          <Badge key={idx} variant="secondary">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      <Button 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(service.url, '_blank');
                        }}
                      >
                        Launch {service.name}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  How Cloud Gaming Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">1. Choose a Service:</strong> Select a cloud gaming platform above
                </p>
                <p>
                  <strong className="text-foreground">2. Sign In:</strong> Create an account or log in to the service
                </p>
                <p>
                  <strong className="text-foreground">3. Pick Your Game:</strong> Browse their library and select a game
                </p>
                <p>
                  <strong className="text-foreground">4. Start Playing:</strong> Games run on remote servers and stream to your device
                </p>
                <div className="mt-4 p-3 bg-card rounded-md border border-border">
                  <p className="text-foreground font-medium mb-2">Requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Stable internet connection (15+ Mbps recommended)</li>
                    <li>Modern web browser or dedicated app</li>
                    <li>Optional: Controller for best experience</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>Cloud Gaming Preferences</CardTitle>
                </div>
                <CardDescription>
                  Configure your preferred cloud gaming settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Service</label>
                  <div className="grid gap-2">
                    {cloudServices.map((service) => (
                      <Button
                        key={service.id}
                        variant={selectedService === service.id ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setSelectedService(service.id)}
                      >
                        <span className="mr-2">{service.logo}</span>
                        {service.name}
                        {selectedService === service.id && (
                          <CheckCircle2 className="ml-auto h-4 w-4" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-3">Quick Launch</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Save your preferred service for quick access
                  </p>
                  <Button 
                    className="w-full"
                    disabled={!selectedService}
                    onClick={() => {
                      if (selectedService) {
                        const service = cloudServices.find(s => s.id === selectedService);
                        if (service) {
                          localStorage.setItem('preferred-cloud-gaming', service.id);
                          window.open(service.url, '_blank');
                        }
                      }
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Launch Preferred Service
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-lg">Pro Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Use an Ethernet connection for best performance</p>
                <p>• Close background apps to improve stream quality</p>
                <p>• Most services offer free trials - try before subscribing</p>
                <p>• GeForce NOW lets you play games you already own</p>
                <p>• Xbox Cloud Gaming is included with Game Pass Ultimate</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
