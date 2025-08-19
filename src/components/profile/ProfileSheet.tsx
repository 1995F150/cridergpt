
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSettings } from "./AccountSettings";
import { AppSettings } from "./AppSettings";
import { UsageStats } from "./UsageStats";
import { TokensCredits } from "./TokensCredits";
import { AISettings } from "./AISettings";

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

export function ProfileSheet({ open, onOpenChange, defaultTab = "account" }: ProfileSheetProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Profile & Settings</SheetTitle>
          <SheetDescription>
            Manage your account, preferences, and usage statistics.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="tokens">Credits</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 max-h-[70vh] overflow-y-auto">
              <TabsContent value="account" className="space-y-4">
                <AccountSettings />
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <AppSettings />
              </TabsContent>
              
              <TabsContent value="ai" className="space-y-4">
                <AISettings />
              </TabsContent>
              
              <TabsContent value="usage" className="space-y-4">
                <UsageStats />
              </TabsContent>
              
              <TabsContent value="tokens" className="space-y-4">
                <TokensCredits />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
