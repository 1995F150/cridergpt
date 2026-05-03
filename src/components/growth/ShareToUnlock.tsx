import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Share2, Lock, Check } from "lucide-react";
import { useShareUnlock } from "@/hooks/useShareUnlock";

interface Props {
  featureKey: string;
  title: string;
  description: string;
  shareText?: string;
  shareUrl?: string;
  children?: React.ReactNode;
}

export function ShareToUnlock({ featureKey, title, description, shareText, shareUrl, children }: Props) {
  const { unlocked, shareAndUnlock } = useShareUnlock(featureKey);
  const url = shareUrl ?? (typeof window !== "undefined" ? window.location.origin : "https://cridergpt.com");

  if (unlocked) return <>{children}</>;

  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button onClick={() => shareAndUnlock({
          title: "CriderGPT",
          text: shareText ?? "Check out CriderGPT — built by an FFA student.",
          url,
        })}>
          <Share2 className="h-4 w-4 mr-2" /> Share to unlock
        </Button>
        {unlocked && <p className="text-xs text-green-600 flex items-center justify-center gap-1"><Check className="h-3 w-3" /> Unlocked</p>}
      </CardContent>
    </Card>
  );
}
