import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { ShieldCheck, Tag, Smartphone, FileCheck, ArrowRight, Sparkles, Loader2, Copy } from 'lucide-react';

export default function FarmBureau() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    farm_name: '',
    county: 'Wythe',
    livestock_type: '',
    herd_size: '',
    message: '',
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast({ title: 'Missing info', description: 'Name and email are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from('farmbureau_leads').insert({
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      farm_name: form.farm_name || null,
      county: form.county || null,
      livestock_type: form.livestock_type || null,
      herd_size: form.herd_size ? parseInt(form.herd_size, 10) : null,
      message: form.message || null,
      source: 'farmbureau_landing',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      return;
    }
    setSubmitted(true);
    toast({ title: '✅ Got it!', description: "We'll be in touch within 1-2 business days." });
  };

  const copyCode = () => {
    navigator.clipboard.writeText('FARMBUREAU10');
    toast({ title: 'Copied!', description: 'Discount code copied to clipboard.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Farm Bureau Members — CriderGPT Smart Livestock Tags | Wytheville, VA"
        description="Exclusive Smart Livestock Tag program for Virginia Farm Bureau members. Tap-to-scan NFC tags with full health & ownership records. 10% member discount."
        keywords="farm bureau, wytheville va, smart livestock tags, nfc cattle tags, virginia farm bureau"
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container max-w-6xl mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Wytheville, VA Pilot Program
            </Badge>
            <Badge variant="outline" className="text-xs">For Farm Bureau Members</Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Smart Livestock Tags <span className="text-primary">for Farm Bureau Members</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-8">
            Tap any phone to a CriderGPT tag and instantly see ownership, health records, and vaccinations.
            Built by an FFA member in Wytheville — exclusive 10% discount for Virginia Farm Bureau members.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/store">
                Shop Tags ($3.50 each) <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#request-info">Request Bulk Pricing</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Discount Code */}
      <section className="container max-w-6xl mx-auto px-4 py-10">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Farm Bureau Member Discount</p>
              <p className="text-2xl md:text-3xl font-bold">Save 10% on every order</p>
              <p className="text-sm text-muted-foreground mt-1">Use this code at checkout. No minimum.</p>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-3 bg-background border-2 border-dashed border-primary rounded-lg px-6 py-4 hover:bg-primary/10 transition"
            >
              <span className="text-2xl font-mono font-bold tracking-wider">FARMBUREAU10</span>
              <Copy className="h-5 w-5 text-primary" />
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Why */}
      <section className="container max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-bold mb-2">Why Farm Bureau members love it</h2>
        <p className="text-muted-foreground mb-8">Built for cattle country. Designed for real farms.</p>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Tag className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Permanent Animal ID</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Every tag has a unique CriderGPT ID. Lost cow? Stolen calf? A scan from any neighbor's phone proves
              ownership instantly.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Smartphone className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Tap-to-Scan, No App</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Works with any modern Android phone. iPhone users open the camera and scan the QR backup. No
              downloads, no logins for the scanner.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <FileCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Insurance-Ready Records</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Vaccination history, vet visits, weights, and ownership transfers — all timestamped. Makes Farm
              Bureau livestock claims faster and cleaner.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Insurance angle */}
      <section className="container max-w-6xl mx-auto px-4 py-10">
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <ShieldCheck className="h-12 w-12 text-primary shrink-0" />
              <div>
                <h3 className="text-2xl font-bold mb-2">Built for the Farm Bureau insurance member</h3>
                <p className="text-muted-foreground mb-4">
                  Most livestock claims fall apart because farmers can't prove what the animal was worth, when it was
                  vaccinated, or even that it belonged to them. CriderGPT tags solve all three:
                </p>
                <ul className="space-y-2 text-sm">
                  <li>✓ <strong>Proof of ownership</strong> — every transfer is logged with timestamps</li>
                  <li>✓ <strong>Health log</strong> — vaccinations, vet visits, treatments, all in one scan</li>
                  <li>✓ <strong>Production records</strong> — weights, breeding dates, calving history</li>
                  <li>✓ <strong>Recovery tool</strong> — anyone who finds a lost animal can scan and contact you</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Lead form */}
      <section id="request-info" className="container max-w-3xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Request Bulk Pricing & Info</CardTitle>
            <p className="text-sm text-muted-foreground">
              Bulk orders (10+ tags) qualify for tiered pricing. Farm Bureau chapters get co-branded packaging.
            </p>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold mb-2">Thanks, {form.name.split(' ')[0]}!</h3>
                <p className="text-muted-foreground mb-6">
                  We got your info. Expect a reply within 1-2 business days at <strong>{form.email}</strong>.
                </p>
                <Button asChild>
                  <Link to="/store">Browse the Store →</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Your Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="farm_name">Farm / Operation Name</Label>
                    <Input id="farm_name" value={form.farm_name} onChange={(e) => update('farm_name', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="county">County</Label>
                    <Input id="county" value={form.county} onChange={(e) => update('county', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="livestock_type">Livestock Type</Label>
                    <Select value={form.livestock_type} onValueChange={(v) => update('livestock_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cattle">Cattle</SelectItem>
                        <SelectItem value="sheep">Sheep</SelectItem>
                        <SelectItem value="goats">Goats</SelectItem>
                        <SelectItem value="hogs">Hogs</SelectItem>
                        <SelectItem value="horses">Horses</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="herd_size">Herd Size (approx)</Label>
                    <Input id="herd_size" type="number" min="0" value={form.herd_size} onChange={(e) => update('herd_size', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="message">Anything else?</Label>
                    <Textarea id="message" rows={3} value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="Questions, custom requests, or how you heard about us..." />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : 'Submit Request'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your info goes straight to Jessie Crider. No spam, ever.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border bg-muted/30 py-10">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Built locally in Wytheville, Virginia by an FFA member. Proudly supporting Virginia agriculture.
          </p>
        </div>
      </section>
    </div>
  );
}
