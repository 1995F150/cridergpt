import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Calculator, 
  FileText, 
  FolderOpen, 
  Users, 
  Image, 
  Code, 
  Camera,
  Video,
  Mic,
  Map,
  DollarSign,
  Star,
  Settings,
  HelpCircle,
  Lightbulb,
  Zap
} from "lucide-react";

export default function HelpPanel() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Crider OS Help Center
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        <Tabs defaultValue="overview" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="tools">Tools & Calculators</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-4 overflow-y-auto h-full">
            <div className="text-center space-y-4">
              <Lightbulb className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Welcome to Crider OS</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Your all-in-one platform for agriculture, mechanics, education, and professional workflows.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="bg-primary/10 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Quick Start Guide</h3>
                <ol className="space-y-2 text-sm">
                  <li>1. <strong>Navigation:</strong> Use the sidebar to access different panels and features</li>
                  <li>2. <strong>AI Assistant:</strong> Chat with CriderGPT for technical help and guidance</li>
                  <li>3. <strong>Social Features:</strong> Connect with friends, share photos, and video chat</li>
                  <li>4. <strong>Calculators:</strong> Access specialized tools for your field of work</li>
                  <li>5. <strong>Projects:</strong> Manage your work and educational projects</li>
                </ol>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      AI & Communication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• CriderGPT for technical assistance</p>
                    <p>• Social chat with friends</p>
                    <p>• Video calling and media sharing</p>
                    <p>• Knowledge base access</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Professional Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• Electrical and welding calculators</p>
                    <p>• Financial planning tools</p>
                    <p>• Agricultural planning</p>
                    <p>• Vehicle maintenance tracking</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6 mt-4 overflow-y-auto h-full">
            <h2 className="text-xl font-bold">Communication Features</h2>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    CriderGPT (AI Assistant)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold">What you can ask:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Technical troubleshooting for equipment</li>
                      <li>• Welding parameters and techniques</li>
                      <li>• Electrical calculations and wiring</li>
                      <li>• Agricultural planning and crop management</li>
                      <li>• FFA project guidance</li>
                    </ul>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm"><strong>Example:</strong> "Help me troubleshoot a hydraulic leak on my John Deere 5075E"</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Crider Chat (Social)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold">Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Send friend requests and chat messages</li>
                      <li>• Share photos and videos instantly</li>
                      <li>• Video calling with camera controls</li>
                      <li>• Snapchat-like camera features</li>
                      <li>• Stories and media sharing</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border-l-4 border-yellow-400">
                    <p className="text-sm"><strong>Note:</strong> Camera and microphone permissions are required for video calls and photo sharing.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6 mt-4 overflow-y-auto h-full">
            <h2 className="text-xl font-bold">Tools & Calculators</h2>
            
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Electrical Calculators
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• <strong>Voltage Calculator:</strong> Calculate voltage drop, current, power</p>
                  <p>• <strong>Wire Sizing:</strong> Determine proper wire gauge for circuits</p>
                  <p>• <strong>Load Calculations:</strong> Calculate electrical loads and panel requirements</p>
                  <p>• <strong>Example Use:</strong> "Calculate voltage drop for 100ft of 12AWG wire at 20 amps"</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Welding & Mechanics
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• <strong>Welding Calculator:</strong> Determine amperage, wire speed, gas flow</p>
                  <p>• <strong>Material Calculations:</strong> Steel thickness, joint preparations</p>
                  <p>• <strong>Mechanical Calculations:</strong> Torque, pressure, flow rates</p>
                  <p>• <strong>Example Use:</strong> "What settings for MIG welding 1/4 inch steel?"</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Financial Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• <strong>Loan Calculator:</strong> Monthly payments, interest calculations</p>
                  <p>• <strong>Investment Calculator:</strong> ROI, compound interest</p>
                  <p>• <strong>Budget Tracker:</strong> Expense tracking and planning</p>
                  <p>• <strong>Currency Converter:</strong> Real-time exchange rates</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    FFA Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• <strong>Record Book:</strong> Track SAE projects and activities</p>
                  <p>• <strong>Crop Planner:</strong> Plan planting schedules and rotations</p>
                  <p>• <strong>Livestock Tracker:</strong> Monitor animal health and records</p>
                  <p>• <strong>Agriculture Calculator:</strong> Yield calculations, fertilizer rates</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-4 overflow-y-auto h-full">
            <h2 className="text-xl font-bold">Advanced Features</h2>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Code Generation & Projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">Generate custom applications and manage technical projects.</p>
                  <div>
                    <h4 className="font-semibold text-sm">Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Generate web applications and scripts</li>
                      <li>• Project management and tracking</li>
                      <li>• Code templates for common tasks</li>
                      <li>• Integration with development tools</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    AI Image & Document Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">Upload images and documents for AI-powered analysis and troubleshooting.</p>
                  <div>
                    <h4 className="font-semibold text-sm">Capabilities:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Analyze equipment photos for diagnostics</li>
                      <li>• Read and interpret technical documents</li>
                      <li>• Generate images for presentations</li>
                      <li>• OCR text extraction from images</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Invoice & Business Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">Professional invoicing and business management tools.</p>
                  <div>
                    <h4 className="font-semibold text-sm">Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Create professional invoices</li>
                      <li>• Customer and project tracking</li>
                      <li>• Payment processing integration</li>
                      <li>• Export to PDF and accounting software</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Use specific model numbers when asking for help</li>
                  <li>• Upload clear photos for better AI analysis</li>
                  <li>• Save frequently used calculations as presets</li>
                  <li>• Connect with classmates and colleagues for collaboration</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}