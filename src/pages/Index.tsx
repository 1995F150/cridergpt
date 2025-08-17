
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { CalculatorPanel } from "@/components/panels/CalculatorPanel";

export default function Index() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calculator');

  if (!user) {
    return null;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <NavigationSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="flex-1 p-6">
        <CalculatorPanel />
      </main>
    </div>
  );
}
