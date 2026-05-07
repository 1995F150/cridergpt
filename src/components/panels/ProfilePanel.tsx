import { useState } from "react";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { ManualPlanFix } from "@/components/ManualPlanFix";
import { FeatureToggles } from "@/components/FeatureToggles";
import { NotificationsPanel } from "@/components/growth/NotificationsPanel";
import { PassphraseManager } from "@/components/admin/PassphraseManager";
import { PassphraseTestFlow } from "@/components/admin/PassphraseTestFlow";
import { GraduationCountdown } from "@/components/growth/GraduationCountdown";
import { FreeWillStatus } from "@/components/admin/FreeWillStatus";

export function ProfilePanel() {
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <div className="space-y-6">
      <GraduationCountdown />

      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-4">Profile & Settings</h2>
        <p className="text-muted-foreground mb-4">
          Manage your account settings, preferences, and view your usage statistics.
        </p>
      </div>

      <FreeWillStatus />

      {/* Notifications & weekly digest */}
      <NotificationsPanel />

      {/* Passphrases */}
      <PassphraseManager />

      {/* Passphrase test flow */}
      <PassphraseTestFlow />

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