import heroImage from "@/assets/crider-os-hero.jpg";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
const Index = () => {
  return <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Header />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="CriderOS Dashboard" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyber-blue to-tech-accent bg-clip-text text-transparent">
              Welcome to CriderOS
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your Personal AI Assistant for Project Management, FS22/FS25 Mod Deployment, and Automation
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Badge variant="secondary" className="bg-cyber-blue/10 text-cyber-blue border-cyber-blue/20">
                AI-Powered
              </Badge>
              <Badge variant="secondary" className="bg-tech-accent/10 text-tech-accent border-tech-accent/20">
                Mod Deployment
              </Badge>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                API Management
              </Badge>
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                Automation
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                Voice Synthesis
              </Badge>
            </div>
            <div className="flex gap-4">
              <a href="https://buy.stripe.com/3cI8wRbZCblO4mmg8EdZ608" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-cyber-blue to-tech-accent text-background font-semibold rounded-lg hover:opacity-90 transition-opacity">
                Invest in CriderOS
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Application Layout */}
      <div className="flex flex-1 h-full overflow-hidden bg-zinc-950 rounded-sm">
        <Sidebar />
      </div>
      
      <Footer />
    </div>;
};
export default Index;