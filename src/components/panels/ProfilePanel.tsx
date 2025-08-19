import { useState } from "react";
import { ProfileSheet } from "@/components/profile/ProfileSheet";

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
      
      <ProfileSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen}
        defaultTab="account"
      />
    </div>
  );
}