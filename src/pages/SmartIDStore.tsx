import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Tag, Shield, Droplets, Smartphone, Minus, Plus, ArrowLeft, CheckCircle2, HelpCircle, MapPin, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const UNIT_PRICE = 3.50;
const PRICE_ID = 'price_1TG6EVP90uC07RqG2lDCdUdH';

const faqs = [
  { q: 'What is a Smart Livestock Tag?', a: 'An NFC-enabled ear tag that connects to the CriderGPT Smart ID system. Scan with any NFC-capable phone to instantly pull up animal records, health history, and more.' },
  { q: 'How does shipping work?', a: 'After your order is placed, tags are hand-assembled and shipped directly to your mailing address. You can also choose local pickup if you prefer picking up from a local mail office.' },
  { q: 'How long does shipping take?', a: 'Tags are individually assembled and coated. Please allow 5-10 business days for assembly and shipping. You\'ll be contacted with tracking info.' },
  { q: 'Are the tags weather-resistant?', a: 'Yes. Each tag is coated with a protective clear coat that shields the NFC sticker from rain, mud, sun, and everyday wear.' },
  { q: 'What phone do I need?', a: 'Any NFC-capable smartphone (most modern Android phones and iPhone 7+). No special app needed beyond the CriderGPT platform.' },
  { q: 'Can I use these for any livestock?', a: 'Yes — cattle, goats, sheep, pigs, and more. The Smart ID system supports mixed livestock herds.' },
];

export default function SmartIDStore() {
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Shipping address fields
  const [fullName, setFullName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [pickupPreferred, setPickupPreferred] = useState(false);

  const totalPrice = (quantity * UNIT_PRICE).toFixed(2);

  const validateAddress = () => {
    if (!fullName.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return false; }
    if (!pickupPreferred) {
      if (!addressLine1.trim()) { toast({ title: 'Address required', variant: 'destructive' }); return false; }
      if (!city.trim()) { toast({ title: 'City required', variant: 'destructive' }); return false; }
      if (!state.trim()) { toast({ title: 'State required', variant: 'destructive' }); return false; }
      if (!zip.trim() || !/^\d{5}(-\d{4})?$/.test(zip.trim())) { toast({ title: 'Valid ZIP code required', variant: 'destructive' }); return false; }
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to purchase tags.', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    if (!validateAddress()) return;

    setLoading(true);
    try {
      const shippingAddress = pickupPreferred
        ? { fullName: fullName.trim(), method: 'local_pickup', notes: orderNotes.trim() }
        : {
            fullName: fullName.trim(),
            line1: addressLine1.trim(),
            line2: addressLine2.trim(),
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            phone: phone.trim(),
            method: 'ship',
            notes: orderNotes.trim(),
          };

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: PRICE_ID,
          planName: 'tag-order',
          quantity,
          action: 'tag-order',
          shippingAddress,
        },
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
      <SEO page="store" />

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
        {/* Product Photo + Hero */}
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
            <img
              src="/images/smart-tag-product.jpg"
              alt="CriderGPT Smart NFC Livestock Ear Tag — red ear tag with embedded NFC chip"
              className="w-full aspect-square object-cover"
              loading="eager"
            />
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs">NFC Enabled</Badge>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <Badge className="bg-primary/10 text-primary text-sm px-4 py-1">Now Available</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Smart Livestock Tags</h2>
            <p className="text-lg text-muted-foreground">
              NFC-enabled ear tags for instant digital herd management. Scan, track, and manage your livestock from your phone.
            </p>
            <div className="text-4xl font-bold text-primary">$3.50 <span className="text-lg font-normal text-muted-foreground">per tag</span></div>
            <p className="text-sm text-muted-foreground">Hand-assembled • Weather-resistant clear coat • Ships to your door</p>
          </div>
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
              { icon: Truck, title: 'Shipped to Your Door', desc: 'Hand-assembled and mailed directly to your address' },
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
              {/* Quantity */}
              <div>
                <Label className="mb-2 block">Quantity</Label>
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

              {/* Shipping Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping Info</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPickupPreferred(!pickupPreferred)}
                  >
                    {pickupPreferred ? 'Switch to shipping' : 'Prefer local pickup?'}
                  </Button>
                </div>

                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" maxLength={100} />
                </div>

                {!pickupPreferred && (
                  <>
                    <div>
                      <Label className="text-xs">Address Line 1</Label>
                      <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="123 Farm Rd" maxLength={200} />
                    </div>
                    <div>
                      <Label className="text-xs">Address Line 2 (optional)</Label>
                      <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Apt, Suite, etc." maxLength={200} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" maxLength={100} />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Input value={state} onChange={e => setState(e.target.value)} placeholder="TN" maxLength={2} />
                      </div>
                      <div>
                        <Label className="text-xs">ZIP</Label>
                        <Input value={zip} onChange={e => setZip(e.target.value)} placeholder="37xxx" maxLength={10} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Phone (optional)</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" maxLength={20} />
                    </div>
                  </>
                )}

                {pickupPreferred && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    You'll be contacted after purchase to arrange local pickup at a mail office or agreed location.
                  </p>
                )}

                <div>
                  <Label className="text-xs">Order Notes (optional)</Label>
                  <Textarea
                    value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)}
                    placeholder="Any special requests..."
                    maxLength={500}
                    className="h-16"
                  />
                </div>
              </div>

              <Separator />

              {/* Price Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{quantity} × ${UNIT_PRICE.toFixed(2)}</span>
                  <span>${totalPrice}</span>
                </div>
                <p className="text-xs text-muted-foreground">Shipping costs may vary — you'll be contacted if additional shipping fees apply.</p>
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
