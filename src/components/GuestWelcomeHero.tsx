import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, Tractor, Flame, Mic, BookOpen, Calculator, 
  PawPrint, Wrench, ArrowRight, Shield, Tag, Star,
  Users, ChevronRight
} from 'lucide-react';

interface GuestWelcomeHeroProps {
  onSuggestionClick: (message: string) => void;
  messagesRemaining: number;
}

const quickStarts = [
  { icon: Tractor, label: "Plan crop rotation", prompt: "Help me plan a 3-year crop rotation for 50 acres in Virginia", color: "text-green-500" },
  { icon: Flame, label: "Welding rod guide", prompt: "What's the best welding rod for mild steel and what settings should I use?", color: "text-orange-500" },
  { icon: BookOpen, label: "FFA speech tips", prompt: "What should I say in my FFA Creed speaking contest?", color: "text-blue-500" },
  { icon: PawPrint, label: "Livestock advice", prompt: "What vaccines does a newborn calf need in the first 30 days?", color: "text-red-500" },
  { icon: Wrench, label: "Diesel troubleshoot", prompt: "My diesel tractor is blowing white smoke on cold starts. What should I check?", color: "text-slate-400" },
  { icon: Mic, label: "Voltage calculator", prompt: "Calculate voltage drop for 100ft of 12AWG wire at 20 amps", color: "text-yellow-500" },
];

const featureHighlights = [
  { icon: Calculator, title: "30+ Calculators", desc: "Soil health, voltage, spray mix, finance" },
  { icon: PawPrint, title: "Livestock Tracker", desc: "NFC tag scanning, health records, weights" },
  { icon: BookOpen, title: "FFA Dashboard", desc: "Record book, SAE logs, chapter events" },
  { icon: Shield, title: "Guardian Mode", desc: "Parental monitoring & activity alerts" },
];

const testimonials = [
  { text: "Best tool for tracking my cattle herd. NFC tags changed everything.", role: "Cattle Rancher, VA" },
  { text: "Used this for my SAE project and creed practice. Saved me hours.", role: "FFA Member, WV" },
  { text: "The welding calculators are actually accurate. Better than most apps.", role: "Welder, KY" },
];

export function GuestWelcomeHero({ onSuggestionClick, messagesRemaining }: GuestWelcomeHeroProps) {
  return (
    <div className="flex flex-col items-center px-4 py-6 md:py-10 max-w-3xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <img 
          src="/cridergpt-logo.png" 
          alt="CriderGPT — Free AI for Farming, Welding & FFA" 
          className="h-16 w-16 md:h-20 md:w-20 object-contain mx-auto"
          loading="eager"
        />
        <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
          Your AI Partner for Farming, Welding & FFA
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
          30+ tools built for people who work with their hands. 
          Livestock tracking with NFC smart tags, calculators, FFA record books & more.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs md:text-sm px-3 py-1.5">
            <Sparkles className="h-3 w-3 mr-1.5" />
            {messagesRemaining} free messages — no signup needed
          </Badge>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex gap-6 md:gap-10 justify-center">
        {[
          { value: "30+", label: "Built-in tools" },
          { value: "Free", label: "No card needed" },
          { value: "105K+", label: "Snapchat reach" },
          { value: "$3/mo", label: "Pro plans from" },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className="text-lg md:text-xl font-bold text-foreground tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick start prompts */}
      <div className="w-full space-y-2">
        <p className="text-xs font-medium text-muted-foreground text-center uppercase tracking-wider">Try asking — it's free</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {quickStarts.map((qs, i) => (
            <Button
              key={i}
              variant="outline"
              className="text-left h-auto py-2.5 px-3 gap-2.5 justify-start border-border hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
              onClick={() => onSuggestionClick(qs.prompt)}
            >
              <qs.icon className={`h-4 w-4 shrink-0 ${qs.color}`} />
              <span className="text-xs md:text-sm text-foreground">{qs.label}</span>
              <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
            </Button>
          ))}
        </div>
      </div>

      {/* NFC Smart Tags CTA */}
      <Card className="w-full border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">NFC Smart Livestock Tags</h3>
            <p className="text-xs text-muted-foreground">Scan & track animals instantly. $3.50/tag — ships to your door.</p>
          </div>
          <Button size="sm" variant="default" className="shrink-0" onClick={() => window.location.href = '/store'}>
            Shop <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Feature cards */}
      <div className="w-full space-y-2">
        <p className="text-xs font-medium text-muted-foreground text-center uppercase tracking-wider">What's inside</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {featureHighlights.map((f, i) => (
            <Card key={i} className="border-border/50 bg-card/50 hover:bg-accent/30 transition-colors duration-200">
              <CardContent className="p-3 text-center space-y-1.5">
                <f.icon className="h-5 w-5 mx-auto text-primary" />
                <h3 className="text-xs md:text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Social proof / Testimonials */}
      <div className="w-full space-y-3">
        <p className="text-xs font-medium text-muted-foreground text-center uppercase tracking-wider">What people are saying</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {testimonials.map((t, i) => (
            <Card key={i} className="border-border/50 bg-card/50">
              <CardContent className="p-3 space-y-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-xs text-foreground leading-relaxed">"{t.text}"</p>
                <p className="text-[10px] text-muted-foreground">— {t.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sign up CTA */}
      <div className="text-center space-y-3 pb-2 w-full">
        <Button 
          size="lg" 
          className="w-full sm:w-auto px-8"
          onClick={() => window.location.href = '/auth'}
        >
          <Users className="h-4 w-4 mr-2" />
          Create Free Account
        </Button>
        <p className="text-xs text-muted-foreground">
          No credit card required • Unlock saved chats, livestock tracking & more
        </p>
      </div>
    </div>
  );
}
