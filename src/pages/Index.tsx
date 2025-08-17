
import { useAuth } from "@/contexts/AuthContext";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { CalculatorPanel } from "@/components/panels/CalculatorPanel";

export default function Index() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <NavigationSidebar />
      <main className="flex-1 p-6">
        <CalculatorPanel />
      </main>
    </div>
  );
}
