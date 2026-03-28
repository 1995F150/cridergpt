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

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Product Photo + Hero — compact */}
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
            <img
              src="/images/smart-tag-product.jpg"
              alt="CriderGPT Smart NFC Livestock Ear Tag"
              className="w-full aspect-square object-cover"
              loading="eager"
            />
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs">NFC Enabled</Badge>
          </div>
          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold">Smart Livestock Tags</h2>
            <p className="text-muted-foreground">
              NFC ear tags — scan with your phone to instantly view animal records, health history & weights.
            </p>
            <div className="text-3xl font-bold text-primary">$3.50 <span className="text-base font-normal text-muted-foreground">/ tag</span></div>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Weather-resistant</span>
              <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Works with any phone</span>
              <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Ships to your door</span>
            </div>
          </div>
        </div>

        {/* How it works — 3 short steps */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { step: '1', title: 'Attach', desc: 'Put on ear like a regular tag' },
            { step: '2', title: 'Scan', desc: 'Tap phone to read NFC chip' },
            { step: '3', title: 'Track', desc: 'Health, weight & records sync' },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-3 text-center space-y-1">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs mx-auto">{s.step}</div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Card — the main focus */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
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

            {/* Shipping */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping</Label>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPickupPreferred(!pickupPreferred)}>
                  {pickupPreferred ? 'Ship instead' : 'Post office pickup?'}
                </Button>
              </div>

              <div>
                <Label className="text-xs">Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" maxLength={100} />
              </div>

              {!pickupPreferred && (
                <>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="123 Farm Rd" maxLength={200} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" maxLength={100} />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <Input value={state} onChange={e => setState(e.target.value)} placeholder="VA" maxLength={2} />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP</Label>
                      <Input value={zip} onChange={e => setZip(e.target.value)} placeholder="24xxx" maxLength={10} />
                    </div>
                  </div>
                </>
              )}

              {pickupPreferred && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  We'll contact you to arrange pickup at your local post office.
                </p>
              )}

              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Any special requests..." maxLength={500} className="h-14" />
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between font-bold text-lg">
              <span>{quantity} tags</span>
              <span className="text-primary">${totalPrice}</span>
            </div>

            <Button className="w-full h-12 text-lg" onClick={handleCheckout} disabled={loading}>
              {loading ? 'Processing...' : `Buy Now — $${totalPrice}`}
            </Button>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Secure checkout via Stripe • 5-10 day shipping
            </p>
          </CardContent>
        </Card>

        {/* System preview image */}
        <div className="rounded-2xl overflow-hidden border border-border">
          <img
            src="/images/smart-tag-system-preview.jpg"
            alt="CriderGPT Smart ID system interface"
            className="w-full object-cover"
            loading="lazy"
          />
          <div className="bg-card p-2 text-center">
            <p className="text-xs text-muted-foreground">What you see when you scan a tag — full animal profile on your phone</p>
          </div>
        </div>

        {/* Compact FAQ — collapsible style */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4" /> Frequently Asked Questions
          </summary>
          <div className="mt-3 space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <p className="text-sm font-medium">{faq.q}</p>
                <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
