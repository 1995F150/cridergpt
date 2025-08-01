
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sparkles, Clock, Users, ExternalLink } from "lucide-react";

interface MapBuilderPromoProps {
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

export function MapBuilderPromo({ variant = 'default', className = '' }: MapBuilderPromoProps) {
  const handleLaunchMapBuilder = () => {
    window.open('https://cridergpt-map-builder.lovable.app/', '_blank');
  };

  if (variant === 'compact') {
    return (
      <Card className={`bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-200">Map Builder</h4>
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                Available Now
              </Badge>
            </div>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mb-3">
            Create interactive maps with AI-powered location intelligence
          </p>
          <Button onClick={handleLaunchMapBuilder} size="sm" className="w-full bg-green-600 hover:bg-green-700">
            <ExternalLink className="h-3 w-3 mr-1" />
            Launch Map Builder
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card className={`bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-lg ${className}`}>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <MapPin className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200">
            CriderGPT Map Builder
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-700 mx-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            Available Now
          </Badge>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-green-700 dark:text-green-300 mb-6 text-lg">
            Revolutionary AI-powered mapping platform that transforms how you create, visualize, and interact with geographic data.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Smart Location Intelligence</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <Clock className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Real-time Updates</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <Users className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Collaborative Features</span>
            </div>
          </div>

          <Button onClick={handleLaunchMapBuilder} size="lg" className="bg-green-600 hover:bg-green-700 px-8">
            <ExternalLink className="h-4 w-4 mr-2" />
            Launch Map Builder
          </Button>
          
          <p className="text-xs text-green-600 dark:text-green-400 mt-3">
            Experience the future of AI-powered mapping today
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <MapPin className="h-8 w-8 text-green-600" />
          <div>
            <CardTitle className="text-green-800 dark:text-green-200">CriderGPT Map Builder</CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-700 mt-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Available Now
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-green-700 dark:text-green-300 mb-4">
          Revolutionary AI-powered mapping platform that transforms how you create, visualize, and interact with geographic data. 
          Smart location intelligence meets intuitive design.
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="text-green-700 border-green-300">AI-Powered</Badge>
          <Badge variant="outline" className="text-green-700 border-green-300">Real-time</Badge>
          <Badge variant="outline" className="text-green-700 border-green-300">Collaborative</Badge>
        </div>

        <Button onClick={handleLaunchMapBuilder} className="w-full bg-green-600 hover:bg-green-700">
          <ExternalLink className="h-4 w-4 mr-2" />
          Launch Map Builder
        </Button>
      </CardContent>
    </Card>
  );
}
