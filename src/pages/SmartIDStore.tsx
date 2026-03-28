import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Tag, Shield, Droplets, Smartphone, Minus, Plus, ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const UNIT_PRICE = 3.50;
const PRICE_ID = 'price_1TG6EVP90uC07RqG2lDCdUdH';

const faqs = [
  { q: 'What is a Smart Livestock Tag?', a: 'An NFC-enabled ear tag that connects to the CriderGPT Smart ID system. Scan with any NFC-capable phone to instantly pull up animal records, health history, and more.' },
  { q: 'How does the NFC tag work?', a: 'Each tag contains an NFC sticker embedded in a durable ear tag. Simply tap your phone against the tag to read the animal\'s digital profile.' },
  { q: 'Are the tags weather-resistant?', a: 'Yes. Each tag is coated with a protective clear coat that shields the NFC sticker from rain, mud, sun, and everyday wear.' },
  { q: 'What phone do I need?', a: 'Any NFC-capable smartphone (most modern Android phones and iPhone 7+). No special app needed beyond the CriderGPT platform.' },
  { q: 'Can I use these for any livestock?', a: 'Yes — cattle, goats, sheep, pigs, and more. The Smart ID system supports mixed livestock herds.' },
];

export default function SmartIDStore() {
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalPrice = (quantity * UNIT_PRICE).toFixed(2);

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to purchase tags.', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PRICE_ID, planName: 'tag-order', quantity, action: 'tag-order' },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({ title: 'Checkout failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Smart Livestock Tags — CriderGPT Store" description="NFC-enabled smart ear tags for digital herd management. $3.50 each. Works with the CriderGPT Smart ID system." />

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold">CriderGPT Store</h1>
            <p className="text-sm text-muted-foreground">Smart Livestock Tags</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge className="bg-green-500/10 text-green-600 text-sm px-4 py-1">Now Available</Badge>
          <h2 className="text-3xl md:text-4xl font-bold">Smart Livestock Tags</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            NFC-enabled ear tags for instant digital herd management. Scan, track, and manage your livestock from your phone.
          </p>
          <div className="text-4xl font-bold text-primary">$3.50 <span className="text-lg font-normal text-muted-foreground">per tag</span></div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What You Get</h3>
            {[
              { icon: Tag, title: 'NFC-Enabled Ear Tag', desc: 'Embedded NFC sticker for instant phone scanning' },
              { icon: Shield, title: 'Weather-Resistant Coating', desc: 'Clear coat protection against rain, mud, and sun' },
              { icon: Smartphone, title: 'Smart ID Integration', desc: 'Links to CriderGPT for full digital animal profiles' },
              { icon: Droplets, title: 'Durable Design', desc: 'Built for everyday farm use and harsh conditions' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Card */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Order Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 text-center text-lg font-semibold"
                  />
                  <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{quantity} × ${UNIT_PRICE.toFixed(2)}</span>
                  <span>${totalPrice}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">${totalPrice}</span>
                </div>
              </div>

              <Button className="w-full h-12 text-lg" onClick={handleCheckout} disabled={loading}>
                {loading ? 'Processing...' : `Buy Now — $${totalPrice}`}
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <CheckCircle2 className="h-3 w-3" /> Secure checkout via Stripe
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Frequently Asked Questions</h3>
          <div className="grid gap-3">
            {faqs.map((faq, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-medium mb-1">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
