import { useState } from "react";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { ManualPlanFix } from "@/components/ManualPlanFix";
import { FeatureToggles } from "@/components/FeatureToggles";
import { NotificationsPanel } from "@/components/growth/NotificationsPanel";
import { PassphraseManager } from "@/components/admin/PassphraseManager";

export function ProfilePanel() {
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-4">Profile & Settings</h2>
        <p className="text-muted-foreground mb-4">
          Manage your account settings, preferences, and view your usage statistics.
        </p>
      </div>
      
      {/* Feature Toggles */}
      <FeatureToggles />

      {/* Notifications & weekly digest */}
      <NotificationsPanel />

      {/* Passphrases */}
      <PassphraseManager />

      {/* Manual Plan Fix Component */}
      <ManualPlanFix />
      
      <ProfileSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen}
        defaultTab="account"
      />
    </div>
  );
}