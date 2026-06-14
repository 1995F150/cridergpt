import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Beef, Calendar, ShoppingBag, Sparkles } from "lucide-react";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta?: { label: string; path: string };
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to CriderGPT",
    body: "Howdy! I'm Jessie. This here app is your FFA sidekick — chat, livestock records, events, the whole nine yards. Let me show ya around real quick.",
  },
  {
    icon: MessageSquare,
    title: "Chat with CriderGPT",
    body: "Ask anything FFA, ag, schoolwork, recipes — I remember your stuff between chats so it actually feels like talkin' to a person.",
    cta: { label: "Open chat", path: "/" },
  },
  {
    icon: Beef,
    title: "Livestock Tracking",
    body: "Tag, scan, and track every animal with NFC Smart Tags. Health records, weights, transfers — all in one spot.",
    cta: { label: "See livestock", path: "/livestock" },
  },
  {
    icon: Calendar,
    title: "Events & Chapter",
    body: "Track personal stuff or share with your whole chapter. Two-tier visibility so private stays private.",
    cta: { label: "View events", path: "/events" },
  },
  {
    icon: ShoppingBag,
    title: "Smart ID Store",
    body: "Order NFC tags, custom Snapchat filters, and more. Free shipping over a certain amount — go check it out.",
    cta: { label: "Browse store", path: "/store" },
  },
];

export const OnboardingTour = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed_at, onboarding_step")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data && !data.onboarding_completed_at) {
        setStep(data.onboarding_step ?? 0);
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  const saveStep = async (nextStep: number, completed = false) => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        onboarding_step: nextStep,
        ...(completed ? { onboarding_completed_at: new Date().toISOString() } : {}),
      })
      .eq("user_id", user.id);
    setSaving(false);
  };

  const handleNext = async () => {
    const next = step + 1;
    if (next >= STEPS.length) {
      await saveStep(STEPS.length, true);
      setOpen(false);
      return;
    }
    setStep(next);
    saveStep(next);
  };

  const handleSkip = async () => {
    await saveStep(STEPS.length, true);
    setOpen(false);
  };

  const handleCta = (path: string) => {
    handleNext();
    navigate(path);
  };

  const current = STEPS[step];
  if (!current) return null;
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-2">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {current.body}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-1.5 mt-2" />
        <p className="text-xs text-center text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>

        <div className="flex flex-col gap-2 mt-4">
          {current.cta && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleCta(current.cta!.path)}
              disabled={saving}
            >
              {current.cta.label}
            </Button>
          )}
          <Button className="w-full" onClick={handleNext} disabled={saving}>
            {step === STEPS.length - 1 ? "Get started" : "Next"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving}>
            Skip tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTour;
