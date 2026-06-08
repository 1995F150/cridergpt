import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Trash2, ShieldAlert, Loader2, LogOut, KeyRound } from "lucide-react";

export default function AccountManagement() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<null | "export" | "delete" | "password">(null);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleExport = async () => {
    setBusy("export");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/export-user-data`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cridergpt-data-${user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported", description: "Your data download has started." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setBusy("password");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast({ title: "Reset email sent", description: `Check ${user.email}.` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/delete-account`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast({ title: "Account deleted", description: "Sorry to see you go." });
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Manage Account — CriderGPT</title>
        <meta name="description" content="Manage your CriderGPT account: export your data, reset your password, or permanently delete your account." />
      </Helmet>

      <div className="border-b border-border bg-card/40 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manage Account</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-primary" /> Export your data</CardTitle>
            <CardDescription>Download a JSON copy of everything CriderGPT has stored for your account — profile, memories, chats, ideas, livestock, and more.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={busy !== null}>
              {busy === "export" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Download my data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Password & security</CardTitle>
            <CardDescription>Send yourself a password reset link.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePasswordReset} disabled={busy !== null}>
              {busy === "password" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Send reset email
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" /> Delete account
            </CardTitle>
            <CardDescription>
              This permanently deletes your CriderGPT account, profile, memories, chats,
              livestock records, and all other data. This cannot be undone. Active
              subscriptions should be canceled separately in the billing portal first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="confirm">Type <span className="font-mono">DELETE</span> to enable:</Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={confirmText !== "DELETE" || busy !== null}>
                  {busy === "delete" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Permanently delete my account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your CriderGPT account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This is final. All your data will be erased and you will be signed out.
                    Consider exporting your data first.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
