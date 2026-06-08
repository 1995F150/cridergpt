import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Mail, ExternalLink, ShieldCheck, Clock } from "lucide-react";

export default function DeleteAccountInfo() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Delete Your CriderGPT Account — Account & Data Deletion</title>
        <meta
          name="description"
          content="How to permanently delete your CriderGPT account and all associated data. Required by Google Play data deletion policy."
        />
        <link rel="canonical" href="https://cridergpt.com/delete-account" />
      </Helmet>

      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Delete Your CriderGPT Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Developer: <strong>Jessie Crider</strong> · App: <strong>CriderGPT</strong> ·
            Package: <code className="font-mono">app.cridergpt.android</code>
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-primary" /> Delete in-app (recommended)
            </CardTitle>
            <CardDescription>
              You can delete your account directly from inside the CriderGPT app or website.
              This wipes everything immediately and signs you out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside text-sm space-y-1 text-foreground">
              <li>Open the CriderGPT app or visit <span className="font-mono">cridergpt.com</span></li>
              <li>Sign in to the account you want deleted</li>
              <li>Go to <strong>Manage Account</strong> (Profile → Manage Account)</li>
              <li>Optional: tap <strong>Download my data</strong> to export a JSON copy first</li>
              <li>Scroll to <strong>Delete Account</strong>, type <span className="font-mono">DELETE</span>, and confirm</li>
            </ol>
            <Link to="/account">
              <Button className="mt-2">
                <Trash2 className="w-4 h-4 mr-2" /> Go to Manage Account
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Request deletion by email
            </CardTitle>
            <CardDescription>
              Lost access to your account? Email us and we'll delete it manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Send a message from the email address tied to your CriderGPT account to:
            </p>
            <a
              href="mailto:jessiecrider3@gmail.com?subject=CriderGPT%20Account%20Deletion%20Request"
              className="inline-flex items-center gap-2 text-primary underline font-mono"
            >
              jessiecrider3@gmail.com <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-muted-foreground">
              Subject: <span className="font-mono">CriderGPT Account Deletion Request</span>.
              Include the email address on the account. Requests are processed within 7 days.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> What gets deleted
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-foreground">When your account is deleted, we permanently remove:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Your profile, username, email, and authentication record</li>
              <li>All chat conversations and message history</li>
              <li>AI memory, preferences, learned patterns, and vision memory</li>
              <li>Idea planner entries, livestock records, calendar events, and notes</li>
              <li>Generated media (images, audio, video) tied to your account</li>
              <li>Push notification tokens, contacts, referral codes</li>
              <li>Subscription metadata (cancel active billing first via Stripe portal)</li>
            </ul>
            <p className="text-muted-foreground pt-2">
              Aggregated, anonymized analytics that contain no personal identifiers may be retained.
              Backups are purged on a rolling 30-day cycle.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">In-app deletion:</strong> immediate.</p>
            <p><strong className="text-foreground">Email request:</strong> within 7 days.</p>
            <p><strong className="text-foreground">Backup purge:</strong> within 30 days of deletion.</p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center pt-4">
          This page satisfies the Google Play account-deletion disclosure requirement.
          For privacy questions see our <Link to="/user-agreement" className="underline">User Agreement</Link>.
        </p>
      </main>
    </div>
  );
}
