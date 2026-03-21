import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Sparkles, Users, TrendingUp, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPageSEO } from '@/config/seo';

export default function SnapchatLensPage() {
  const navigate = useNavigate();
  const seo = getPageSEO('snapchat-lens');

  const stats = [
    { label: 'Reach', value: '3,100+', icon: Users },
    { label: 'Plays', value: '3,088', icon: TrendingUp },
    { label: 'Audience', value: '75% US Gamers', icon: Sparkles },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Vibe Check Bot — CriderGPT Snapchat Lens",
    "applicationCategory": "EntertainmentApplication",
    "operatingSystem": "Snapchat",
    "description": "AI-powered personality quiz Snapchat Lens by CriderGPT. Try the Vibe Check Bot filter!",
    "author": {
      "@type": "Person",
      "name": "Jessie Crider"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <link rel="canonical" href={seo.canonical} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:image" content={seo.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src="/cridergpt-logo.png" alt="CriderGPT" className="h-8 w-8" />
            <span className="font-bold text-foreground">CriderGPT</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-20 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge className="bg-[#FFFC00]/10 text-[#FFFC00] border-[#FFFC00]/30 text-sm px-4 py-1.5">
              <Camera className="h-4 w-4 mr-2" />
              Snapchat Lens
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
              Vibe Check Bot
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              AI-powered personality quiz filter by CriderGPT. Find out your vibe — scan the Snapcode or tap below to try it!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                size="lg"
                className="bg-[#FFFC00] text-black hover:bg-[#FFFC00]/90 font-bold text-base gap-2"
                onClick={() => window.open('https://www.snapchat.com/unlock/?type=SNAPCODE&uuid=69214abb13a347b2a0b85923e2b99c02&metadata=01', '_blank')}
              >
                <Camera className="h-5 w-5" />
                Try on Snapchat
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="font-bold text-base gap-2"
                onClick={() => navigate('/')}
              >
                <Sparkles className="h-5 w-5" />
                Try CriderGPT Free
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-10 px-4 border-t border-border bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-foreground text-center mb-6">Lens Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-5 text-center">
                    <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About CriderGPT CTA */}
        <section className="py-12 px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Built by Jessie Crider</h2>
            <p className="text-muted-foreground">
              CriderGPT is a free AI assistant for farming, welding, FFA, and practical trades. 
              30+ tools, livestock tracking, AI chat, and more — built by an FFA Historian from Southwest Virginia.
            </p>
            <Button size="lg" onClick={() => navigate('/')} className="font-bold gap-2">
              <Sparkles className="h-5 w-5" />
              Open CriderGPT — It's Free
            </Button>
          </div>
        </section>

        {/* SEO Content */}
        <section className="py-8 px-4 border-t border-border bg-muted/20">
          <div className="max-w-2xl mx-auto space-y-4 text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground">What is the Vibe Check Bot?</h3>
            <p>
              The Vibe Check Bot is a Snapchat Lens created by CriderGPT. It uses an AI-powered personality quiz format 
              to give you a fun, shareable "vibe check" result. Popular with gamers and the rural community, this filter 
              has reached over 3,000 users with strong engagement among US-based audiences.
            </p>
            <h3 className="font-semibold text-foreground">How do I use the CriderGPT Snapchat Lens?</h3>
            <p>
              Open Snapchat, tap the camera, and search for "Vibe Check Bot" or "CriderGPT" in the lens explorer. 
              You can also scan the Snapcode from this page. Point the camera at yourself and the AI quiz will analyze your vibe!
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-border text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} CriderGPT by Jessie Crider. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
