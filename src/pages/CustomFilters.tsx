import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ghost, Sparkles, Zap, Crown, Send, CheckCircle2, MessageCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const FILTER_TIERS = [
  {
    id: 'basic_glow',
    name: 'Basic Glow / Aesthetic',
    price: '$5 – $10',
    min: 5, max: 10,
    icon: Sparkles,
    color: 'from-pink-500 to-purple-500',
    features: ['Color grading', 'Soft glow effects', 'Aesthetic overlays', 'Lifetime use'],
  },
  {
    id: 'animated_chrome',
    name: 'Animated / Truck Chrome',
    price: '$15 – $25',
    min: 15, max: 25,
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    popular: true,
    features: ['Animated effects', 'Chrome finishes', 'Custom text overlays', 'Lifetime use'],
  },
  {
    id: 'full_custom',
    name: 'Full Custom / Advanced',
    price: '$30 – $40',
    min: 30, max: 40,
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: ['Fully custom design', 'Advanced animations', 'Interactive elements', 'Priority delivery', 'Lifetime use'],
  },
];

export default function CustomFilters() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    snapchat: '',
    phone: '',
    description: '',
    payment_method: '',
  });

  // Check for payment success/cancel from URL
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get('payment');

  const tier = FILTER_TIERS.find(t => t.id === selectedTier);

  const handleStripeCheckout = async (orderId?: string) => {
    if (!tier || !form.email.trim()) return;
    
    setPayingNow(true);
    try {
      const { data, error } = await supabase.functions.invoke('filter-checkout', {
        body: {
          order_id: orderId || null,
          amount: tier.min, // Start at minimum tier price
          customer_email: form.email.trim(),
          customer_name: form.name.trim(),
          filter_type: selectedTier,
          mode: 'checkout',
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setPayingNow(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier || !form.name.trim() || !form.email.trim() || !form.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data: insertedOrder, error } = await (supabase as any)
        .from('filter_orders')
        .insert({
          customer_name: form.name.trim(),
          customer_email: form.email.trim(),
          customer_snapchat: form.snapchat.trim() || null,
          customer_phone: form.phone.trim() || null,
          filter_type: selectedTier,
          description: form.description.trim(),
          price_range_min: tier?.min || 5,
          price_range_max: tier?.max || 10,
          payment_method: form.payment_method || null,
          payment_status: 'pending',
          status: 'new',
        })
        .select()
        .single();

      if (error) throw error;

      // If they chose Stripe, redirect to checkout immediately
      if (form.payment_method === 'stripe' && insertedOrder) {
        await handleStripeCheckout(insertedOrder.id);
        return;
      }

      setSubmitted(true);
      toast.success('Request submitted! I\'ll get back to you soon 🔥');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Payment success screen
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet><title>Payment Successful | CriderGPT Custom Filters</title></Helmet>
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Payment Received! 💰🔥</h2>
            <p className="text-muted-foreground">
              You're all set! I'll start working on your custom filter and deliver it ASAP.
            </p>
            <p className="text-sm text-muted-foreground">Typical turnaround: 1–3 days</p>
            <Link to="/custom-filters">
              <Button variant="outline" className="w-full gap-2 mt-4">
                <ArrowLeft className="h-4 w-4" /> Back to Custom Filters
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet><title>Request Submitted | CriderGPT Custom Filters</title></Helmet>
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Request Received! 🔥</h2>
            <p className="text-muted-foreground">
              I'll review your request and hit you up on {form.snapchat ? 'Snapchat' : 'email'} with a quote and next steps.
            </p>
            <p className="text-sm text-muted-foreground">
              Typical turnaround: 1–3 days
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => { setSubmitted(false); setSelectedTier(null); setForm({ name: '', email: '', snapchat: '', phone: '', description: '', payment_method: '' }); }}>
                Submit Another Request
              </Button>
              <Link to="/">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to CriderGPT
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Custom Snapchat Filters | CriderGPT</title>
        <meta name="description" content="Get custom Snapchat filters made by a verified Snap Dev. Basic glow $5-$10, Animated $15-$25, Full custom $30-$40. Lifetime use, done right." />
      </Helmet>

      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> CriderGPT
          </Link>
          <Badge variant="outline" className="gap-1">
            <Ghost className="h-3 w-3" /> Snap Dev
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
            <Ghost className="h-4 w-4" /> Custom Snapchat Filters
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            Your Style. Your Filter. 😎
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Lifetime use, done right 💥 Made by a verified Snapchat developer with 141K+ reach. DM me what you want and I'll make it happen.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="grid sm:grid-cols-3 gap-4">
          {FILTER_TIERS.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedTier === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:shadow-md'
                }`}
              >
                {t.popular && (
                  <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-xs">
                    Popular
                  </Badge>
                )}
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <p className="text-xl font-bold mt-1">{t.price}</p>
                <ul className="mt-3 space-y-1">
                  {t.features.map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Request Form */}
        {selectedTier && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Request Your Filter — {tier?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Name *</label>
                    <Input
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email *</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Snapchat Username</label>
                    <Input
                      placeholder="@yoursnapchat"
                      value={form.snapchat}
                      onChange={e => setForm(f => ({ ...f, snapchat: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone (optional)</label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Describe Your Filter *</label>
                  <Textarea
                    placeholder="Tell me what you want — colors, effects, text, vibes, reference pics, anything. The more detail the better!"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Preferred Payment Method</label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="How do you want to pay?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">
                        <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Card (Stripe)</span>
                      </SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="cashapp">Cash App</SelectItem>
                      <SelectItem value="other">
                        <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> DM me to discuss</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
                  {submitting ? 'Submitting...' : (
                    <><Send className="h-4 w-4" /> Submit Request</>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  I'll reach out with a quote and payment details. No charge until you approve the design.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Trust / Social Proof */}
        <div className="text-center space-y-2 py-6 border-t">
          <p className="text-sm text-muted-foreground">
            Made by <strong>Jessie Crider</strong> — Verified Snapchat Developer
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>141K+ Reach</span>
            <span>•</span>
            <span>284K+ Views</span>
            <span>•</span>
            <span>271K+ Plays</span>
          </div>
          <a
            href="https://www.snapchat.com/unlock/?type=SNAPCODE&uuid=69214abb13a347b2a0b85923e2b99c02&metadata=01"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Try the Vibe Check Bot lens →
          </a>
        </div>
      </div>
    </div>
  );
}
