import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ghost, Sparkles, Zap, Crown, Send, CheckCircle2, MessageCircle, CreditCard, ArrowLeft, Award, LogIn, Gift, Tag, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const FILTER_TIERS = [
  {
    id: 'basic_glow',
    name: 'Basic Glow / Aesthetic',
    price: 5,
    icon: Sparkles,
    color: 'from-pink-500 to-purple-500',
    features: ['Color grading', 'Soft glow effects', 'Aesthetic overlays', 'Lifetime use'],
  },
  {
    id: 'animated_chrome',
    name: 'Animated / Truck Chrome',
    price: 10,
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    popular: true,
    features: ['Animated effects', 'Chrome finishes', 'Custom text overlays', 'Lifetime use'],
  },
  {
    id: 'full_custom',
    name: 'Full Custom / Advanced',
    price: 20,
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: ['Fully custom design', 'Advanced animations', 'Interactive elements', 'Priority delivery', 'Lifetime use'],
  },
];

const LOYALTY_THRESHOLD = 3;
const LOYALTY_DISCOUNT_PERCENT = 15;

// Client-side keyword detection (mirrors server — for preview only, server is source of truth)
const COMPLEXITY_KEYWORDS: { pattern: RegExp; surcharge: number; label: string }[] = [
  { pattern: /\b(3d|three[\s-]?d(imensional)?)\b/i, surcharge: 5, label: "3D effects (+$5)" },
  { pattern: /\b(face[\s-]?track(ing)?|face[\s-]?detect(ion)?)\b/i, surcharge: 4, label: "Face tracking (+$4)" },
  { pattern: /\b(ar|augmented[\s-]?reality)\b/i, surcharge: 5, label: "AR features (+$5)" },
  { pattern: /\b(particle(s)?[\s-]?(effect|system)?)\b/i, surcharge: 3, label: "Particle effects (+$3)" },
  { pattern: /\b(multi[\s-]?face|group[\s-]?filter)\b/i, surcharge: 4, label: "Multi-face (+$4)" },
  { pattern: /\b(world[\s-]?lens|ground[\s-]?track(ing)?)\b/i, surcharge: 5, label: "World lens (+$5)" },
  { pattern: /\b(game|mini[\s-]?game|interactive[\s-]?game)\b/i, surcharge: 6, label: "Game mechanics (+$6)" },
  { pattern: /\b(segmentation|body[\s-]?track(ing)?)\b/i, surcharge: 4, label: "Body segmentation (+$4)" },
  { pattern: /\b(custom[\s-]?sound|audio|music)\b/i, surcharge: 2, label: "Custom audio (+$2)" },
  { pattern: /\b(multiple[\s-]?scene|scene[\s-]?switch|tap[\s-]?to[\s-]?switch)\b/i, surcharge: 3, label: "Multi-scene (+$3)" },
  { pattern: /\b(logo[\s-]?anim(ation)?|brand[\s-]?anim(ation)?)\b/i, surcharge: 3, label: "Logo animation (+$3)" },
  { pattern: /\b(countdown|timer)\b/i, surcharge: 2, label: "Countdown/timer (+$2)" },
  { pattern: /\b(quiz|trivia|random(izer)?)\b/i, surcharge: 3, label: "Quiz/randomizer (+$3)" },
];

function analyzeDescription(desc: string) {
  let surcharge = 0;
  const reasons: string[] = [];
  for (const kw of COMPLEXITY_KEYWORDS) {
    if (kw.pattern.test(desc)) {
      surcharge += kw.surcharge;
      reasons.push(kw.label);
    }
  }
  surcharge = Math.min(surcharge, 25);
  return { surcharge, reasons };
}

export default function CustomFilters() {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    snapchat: '',
    phone: '',
    description: '',
    payment_method: '',
  });

  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get('payment');

  const tier = FILTER_TIERS.find(t => t.id === selectedTier);
  const hasLoyaltyDiscount = user && completedOrders >= LOYALTY_THRESHOLD;

  // BOGO check: if next order would be the 2nd, 4th, 6th… it's free
  const isBogoEligible = user && completedOrders > 0 && (completedOrders % 2) === 1;

  // Description complexity analysis (preview only)
  const complexity = useMemo(() => analyzeDescription(form.description), [form.description]);

  const basePrice = tier ? tier.price + complexity.surcharge : 0;
  const discountAmount = isBogoEligible && tier
    ? basePrice
    : hasLoyaltyDiscount && tier
      ? +(basePrice * LOYALTY_DISCOUNT_PERCENT / 100).toFixed(2)
      : 0;
  const finalPrice = isBogoEligible ? 0 : Math.max(+(basePrice - discountAmount).toFixed(2), 0);

  useEffect(() => {
    if (!user) { setCompletedOrders(0); return; }
    const fetchCount = async () => {
      const { count } = await (supabase as any)
        .from('filter_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('payment_status', 'paid');
      setCompletedOrders(count || 0);
    };
    fetchCount();
  }, [user]);

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm(f => ({ ...f, email: user.email! }));
    }
  }, [user]);

  const handleStripeCheckout = async (orderId?: string) => {
    if (!tier || !form.email.trim()) return;

    setPayingNow(true);
    try {
      const { data, error } = await supabase.functions.invoke('filter-checkout', {
        body: {
          order_id: orderId || null,
          customer_email: form.email.trim(),
          customer_name: form.name.trim(),
          filter_type: selectedTier,
          description: form.description.trim(),
        },
      });

      if (error) throw error;
      if (data?.bogo) {
        toast.success("🎉 BOGO — this one's FREE!");
      }
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
    if (!selectedTier || !tier || !form.name.trim() || !form.email.trim() || !form.description.trim()) {
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
          price_range_min: tier.price,
          price_range_max: tier.price + complexity.surcharge,
          agreed_price: finalPrice,
          payment_method: form.payment_method || null,
          payment_status: 'pending',
          status: 'new',
          user_id: user?.id || null,
          discount_applied: discountAmount,
          discount_reason: isBogoEligible
            ? `BOGO Free (order #${completedOrders + 1})`
            : hasLoyaltyDiscount
              ? `Loyalty ${LOYALTY_DISCOUNT_PERCENT}% (${completedOrders} orders)`
              : null,
        })
        .select()
        .single();

      if (error) throw error;

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
              I'll review your request and hit you up on {form.snapchat ? 'Snapchat' : 'email'} with next steps.
            </p>
            <p className="text-sm text-muted-foreground">Typical turnaround: 1–3 days</p>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => { setSubmitted(false); setSelectedTier(null); setForm({ name: '', email: user?.email || '', snapchat: '', phone: '', description: '', payment_method: '' }); }}>
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

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Custom Snapchat Filters by CriderGPT",
    "description": "Get custom Snapchat filters and lenses made by a verified Snap developer. Starting at $5 with buy-one-get-one-free deals.",
    "provider": {
      "@type": "Person",
      "name": "Jessie Crider",
      "url": "https://cridergpt.lovable.app"
    },
    "url": "https://cridergpt.lovable.app/custom-filters",
    "areaServed": "Worldwide",
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": "5",
      "highPrice": "45",
      "priceCurrency": "USD",
      "offerCount": "3"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Custom Filter Tiers",
      "itemListElement": FILTER_TIERS.map((t, i) => ({
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": t.name },
        "price": String(t.price),
        "priceCurrency": "USD",
        "position": i + 1,
      }))
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Custom Snapchat Filters from $5 | CriderGPT</title>
        <meta name="description" content="Order custom Snapchat filters and lenses starting at $5. Made by a verified Snap developer with 141K+ reach. BOGO deals, loyalty discounts, and lifetime use included." />
        <meta name="keywords" content="custom snapchat filter, snapchat lens maker, custom snap filter, buy snapchat filter, cheap snapchat filter, custom geofilter, snapchat developer" />
        <link rel="canonical" href="https://cridergpt.lovable.app/custom-filters" />
        <meta property="og:title" content="Custom Snapchat Filters from $5 | CriderGPT" />
        <meta property="og:description" content="Get a custom Snapchat filter made by a verified developer. Starting at $5 with BOGO deals." />
        <meta property="og:url" content="https://cridergpt.lovable.app/custom-filters" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> CriderGPT
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isBogoEligible && (
                  <Badge className="gap-1 bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                    <Gift className="h-3 w-3" /> Next filter FREE!
                  </Badge>
                )}
                {hasLoyaltyDiscount && !isBogoEligible && (
                  <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <Award className="h-3 w-3" /> {LOYALTY_DISCOUNT_PERCENT}% Off
                  </Badge>
                )}
                {!hasLoyaltyDiscount && !isBogoEligible && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    {completedOrders}/{LOYALTY_THRESHOLD} for discount
                  </Badge>
                )}
              </>
            ) : (
              <Link to="/auth">
                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-primary/10">
                  <LogIn className="h-3 w-3" /> Sign in for deals
                </Badge>
              </Link>
            )}
            <Badge variant="outline" className="gap-1">
              <Ghost className="h-3 w-3" /> Snap Dev
            </Badge>
          </div>
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
            Lifetime use, done right 💥 Made by a verified Snapchat developer with 141K+ reach. Starting at just <strong>$5</strong> — cheaper than a coffee.
          </p>
        </div>

        {/* Deals Banner */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4 text-center">
            <Gift className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="font-bold text-sm">Buy 1, Get 1 Free</p>
            <p className="text-xs text-muted-foreground">Every other filter is on us</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
            <Award className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className="font-bold text-sm">{LOYALTY_DISCOUNT_PERCENT}% Loyalty Discount</p>
            <p className="text-xs text-muted-foreground">After {LOYALTY_THRESHOLD} purchases</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
            <Tag className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="font-bold text-sm">Starts at $5</p>
            <p className="text-xs text-muted-foreground">Less than a coffee ☕</p>
          </div>
        </div>

        {!user && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-sm">
              <Link to="/auth" className="text-primary font-bold underline hover:no-underline">Sign in</Link> to unlock BOGO deals + {LOYALTY_DISCOUNT_PERCENT}% loyalty discounts! 🔥
            </p>
          </div>
        )}

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
                <p className="text-xl font-bold mt-1">
                  ${t.price}<span className="text-xs font-normal text-muted-foreground">+</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Base price • may vary by complexity</p>
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
        {selectedTier && tier && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Request — {tier.name}
                </span>
                <span className="text-right">
                  {isBogoEligible ? (
                    <span className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground text-sm">${basePrice}</span>
                      <span className="text-green-500 font-bold">FREE 🎉</span>
                    </span>
                  ) : hasLoyaltyDiscount ? (
                    <span className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground text-sm">${basePrice}</span>
                      <span className="text-green-500 font-bold">${finalPrice}</span>
                    </span>
                  ) : (
                    <span className="font-bold">${finalPrice}</span>
                  )}
                </span>
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
                    placeholder="Tell me what you want — colors, effects, text, vibes, reference pics, anything. The more detail the better! Note: advanced features like 3D, face tracking, AR, games, etc. may increase the price."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={4}
                    maxLength={1000}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.description.length}/1000 — Price adjusts based on complexity of features described.
                  </p>

                  {/* Live complexity breakdown */}
                  {complexity.reasons.length > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                      <p className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Complexity add-ons detected:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {complexity.reasons.map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                            {r}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Surcharge: +${complexity.surcharge} (capped at $25). Final price: ${finalPrice}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Method</label>
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

                {isBogoEligible && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                    <Gift className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-green-400">
                      🎉 BOGO deal! This filter is <strong>FREE</strong> — you've earned it with {completedOrders} orders!
                    </span>
                  </div>
                )}

                {hasLoyaltyDiscount && !isBogoEligible && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                    <Award className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-green-400">
                      {LOYALTY_DISCOUNT_PERCENT}% loyalty discount applied! You've completed {completedOrders} orders.
                    </span>
                  </div>
                )}

                {form.payment_method === 'stripe' ? (
                  <Button type="submit" disabled={submitting || payingNow} className="w-full gap-2" size="lg">
                    {submitting || payingNow ? 'Processing...' : isBogoEligible ? (
                      <><Gift className="h-4 w-4" /> Claim FREE Filter</>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> Pay ${finalPrice} with Card</>
                    )}
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
                    {submitting ? 'Submitting...' : isBogoEligible ? (
                      <><Gift className="h-4 w-4" /> Claim FREE Filter</>
                    ) : (
                      <><Send className="h-4 w-4" /> Submit Request — ${finalPrice}</>
                    )}
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  {form.payment_method === 'stripe'
                    ? "You'll be redirected to a secure Stripe checkout page."
                    : "I'll reach out with payment details. Price adjusts based on filter complexity."
                  }
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Why Buy Section */}
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-center">Why Buy from CriderGPT? 🤔</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">✅ Verified Snap Developer</p>
                <p className="text-muted-foreground text-xs">Not some random person — I'm verified by Snapchat with 141K+ reach.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">✅ Lifetime Use</p>
                <p className="text-muted-foreground text-xs">Pay once, use your filter forever. No monthly fees.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">✅ Cheapest Prices Online</p>
                <p className="text-muted-foreground text-xs">Starting at $5 — most charge $50–$200+ for the same quality.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">✅ BOGO Deals</p>
                <p className="text-muted-foreground text-xs">Every other filter is free. Buy 1, get 1 free, forever.</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
