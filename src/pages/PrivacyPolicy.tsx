import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Database, Lock, Mail, Baby, Globe, Trash2 } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "June 9, 2026";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy — CriderOps Ranch Command Center & CriderGPT</title>
        <meta
          name="description"
          content="Privacy Policy for CriderGPT and CriderOps Ranch Command Center. What we collect, how we use it, third parties, children's data, and how to delete your account."
        />
        <link rel="canonical" href="https://cridergpt.com/privacy" />
      </Helmet>

      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: <strong>{lastUpdated}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Developer: <strong>Jessie Crider</strong> · Apps: <strong>CriderGPT</strong>,{" "}
            <strong>CriderOps Ranch Command Center</strong> ·
            Package: <code className="font-mono">app.cridergpt.android</code>
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              We respect your privacy. We do <strong>not</strong> sell your personal data, your
              chat history, your livestock records, or your cookies to anyone — ever.
            </p>
            <p>
              We collect only what we need to run the app: your account info, your content,
              and basic device/usage signals to keep things working and stop abuse.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" /> What we collect
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Account info:</strong> email, display name, auth provider (Google, Apple, etc.), profile picture if you provide one.</li>
              <li><strong className="text-foreground">Your content:</strong> chats, AI memory, ideas, livestock records, calendar events, notes, generated media, files you upload.</li>
              <li><strong className="text-foreground">Subscription metadata:</strong> plan tier, Stripe/Apple/Google purchase IDs (we never see your card number).</li>
              <li><strong className="text-foreground">Device & usage:</strong> device model, OS version, app version, crash logs, anonymized analytics events.</li>
              <li><strong className="text-foreground">Push tokens:</strong> only if you opt in to notifications.</li>
              <li><strong className="text-foreground">Sensor data:</strong> location/weather/sensor readings only when you actively use a feature that needs them, and only for that request.</li>
              <li><strong className="text-foreground">Camera, microphone, NFC, photos:</strong> accessed only when you tap the feature that uses them. Nothing is captured in the background.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> How we use it
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>Provide and operate the app (chat, livestock tracking, calendar, calculators, etc.).</li>
              <li>Personalize the AI to your patterns and preferences (stored to your account only).</li>
              <li>Process subscriptions and in-app purchases.</li>
              <li>Detect abuse, fraud, and policy violations.</li>
              <li>Improve stability via aggregated, anonymized analytics.</li>
            </ul>
            <p className="pt-2">
              We do <strong>not</strong> sell, rent, or share your data with advertisers or data brokers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Third-party services
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>We use a small set of trusted vendors strictly to run the app:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong className="text-foreground">Supabase</strong> — authentication, database, storage.</li>
              <li><strong className="text-foreground">Stripe</strong> — payments for physical goods and web subscriptions.</li>
              <li><strong className="text-foreground">Google Play Billing / Apple In-App Purchase</strong> — mobile digital purchases.</li>
              <li><strong className="text-foreground">OpenAI &amp; Lovable AI Gateway</strong> — AI model inference for chat and media. Prompts are processed transiently and are not used to train public models.</li>
              <li><strong className="text-foreground">Google AdMob</strong> (free tier only) — ads. Paid users see no ads. See Google's <a className="underline text-primary" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">partner policy</a>.</li>
              <li><strong className="text-foreground">Google Analytics / Firebase</strong> — anonymized usage analytics and crash reporting.</li>
              <li><strong className="text-foreground">Optional integrations:</strong> Google, Snapchat, TikTok, GitHub, X, Spotify — only if you connect them.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-primary" /> Children
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              CriderGPT is intended for users <strong>13 and older</strong>. Users under 18 should
              have a parent or guardian review this policy. We do not knowingly collect personal
              information from children under 13. If we learn we have, we delete it.
            </p>
            <p>
              School/Guardian features (like activity summaries) require explicit parent consent and
              never bypass school content filters such as GoGuardian.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-primary" /> Your rights & deletion
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>You can at any time:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Export your data (Profile → Manage Account → Download my data).</li>
              <li>Delete your account and all associated data — see{" "}
                <Link to="/delete-account" className="underline text-primary">cridergpt.com/delete-account</Link>.
              </li>
              <li>Revoke any connected third-party account from its provider.</li>
            </ul>
            <p className="pt-2">
              Deletion is immediate in-app. Backups are purged on a rolling 30-day cycle.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Data is encrypted in transit (TLS) and at rest. Database access is gated by row-level
            security so users can only read/write their own rows. No system is 100% hacker-proof,
            so use a strong password and don't share your login.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground">
              Privacy questions, data requests, or complaints — email:
            </p>
            <a
              href="mailto:jessiecrider3@gmail.com?subject=Privacy%20Request"
              className="inline-block text-primary underline font-mono"
            >
              jessiecrider3@gmail.com
            </a>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center pt-4">
          This page satisfies the Google Play and Apple App Store privacy-policy disclosure
          requirements. See also our{" "}
          <Link to="/user-agreement" className="underline">User Agreement</Link> and{" "}
          <Link to="/delete-account" className="underline">Account Deletion</Link> pages.
        </p>
      </main>
    </div>
  );
}
