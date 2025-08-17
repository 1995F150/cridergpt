
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TikTokFollowNotification } from "@/components/TikTokFollowNotification";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Tractor, Wrench, Zap, FileText, Clock } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const features = [
    {
      icon: <Tractor className="h-8 w-8 text-primary" />,
      title: "Farming Calculators",
      description: "Seeding rates, fertilizer application, irrigation requirements, and profitability analysis"
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Welding Calculators", 
      description: "MIG/TIG/Stick parameter calculations, voltage/amperage settings, and heat input analysis"
    },
    {
      icon: <Wrench className="h-8 w-8 text-primary" />,
      title: "Mechanics Calculators",
      description: "Torque specifications, hydraulic calculations, belt ratios, and fluid capacities"
    },
    {
      icon: <Calculator className="h-8 w-8 text-primary" />,
      title: "Voltage Calculators",
      description: "Ohm's Law, power calculations, AC analysis, and voltage drop calculations"
    },
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Maintenance Logs",
      description: "Track vehicle maintenance, equipment hours, fuel usage, and service intervals"
    },
    {
      icon: <Clock className="h-8 w-8 text-primary" />,
      title: "Time & Cost Tracking",
      description: "Monitor project costs, material usage, and labor time for accurate job estimates"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Welcome to CriderGPT
              </h1>
              <p className="text-xl text-muted-foreground mb-2">
                Your comprehensive calculator and log system for farming, welding, and vehicle maintenance
              </p>
              <p className="text-muted-foreground">
                Professional-grade tools designed for accuracy and efficiency in the field
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {features.map((feature, index) => (
                <Card key={index} className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-center text-primary">Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">
                  Use the sidebar to access calculators and tools. Each calculator provides step-by-step breakdowns 
                  and professional recommendations to help you make informed decisions.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calculator className="h-4 w-4" />
                    Precise Calculations
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Detailed Logs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Time Tracking
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
      
      <TikTokFollowNotification />
    </div>
  );
};

export default Index;
