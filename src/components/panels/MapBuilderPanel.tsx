
import { MapBuilderPromo } from "@/components/MapBuilderPromo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Layers, Navigation, Zap, Globe, Smartphone } from "lucide-react";

export function MapBuilderPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">CriderGPT Map Builder</h1>
        <p className="text-muted-foreground">
          Revolutionary AI-powered mapping platform coming soon to CriderGPT
        </p>
      </div>

      <MapBuilderPromo variant="featured" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-lg text-blue-800 dark:text-blue-200">Smart Location Intelligence</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              AI-powered location analysis, geocoding, and spatial intelligence for better decision making.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-lg text-purple-800 dark:text-purple-200">Dynamic Layer Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-purple-700 dark:text-purple-300 text-sm">
              Create, customize, and manage multiple map layers with real-time data visualization.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Navigation className="h-6 w-6 text-orange-600" />
              <CardTitle className="text-lg text-orange-800 dark:text-orange-200">Advanced Routing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 dark:text-orange-300 text-sm">
              AI-optimized route planning with traffic analysis and alternative path suggestions.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-teal-600" />
              <CardTitle className="text-lg text-teal-800 dark:text-teal-200">Real-time Updates</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-teal-700 dark:text-teal-300 text-sm">
              Live data synchronization and instant updates across all connected devices and users.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-emerald-600" />
              <CardTitle className="text-lg text-emerald-800 dark:text-emerald-200">Global Coverage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-emerald-700 dark:text-emerald-300 text-sm">
              Worldwide mapping data with local insights and cultural context awareness.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200 dark:border-pink-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-pink-600" />
              <CardTitle className="text-lg text-pink-800 dark:text-pink-200">Mobile Optimized</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-pink-700 dark:text-pink-300 text-sm">
              Responsive design with touch-friendly interface and offline capability support.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Development Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-green-100 text-green-700">Phase 1</Badge>
              <span className="font-medium">Core Mapping Engine & AI Integration</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">Phase 2</Badge>
              <span className="font-medium">Advanced Analytics & Collaboration Tools</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">Phase 3</Badge>
              <span className="font-medium">Enterprise Features & API Access</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
