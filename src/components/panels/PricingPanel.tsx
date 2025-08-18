
import Pricing from "@/components/Pricing";
import { DedicationMessage } from "@/components/DedicationMessage";

export function PricingPanel() {
  return (
    <div className="panel h-full w-full p-0">
      <div className="h-full overflow-y-auto">
        <div className="p-8 pb-0">
          <DedicationMessage />
        </div>
        <Pricing />
      </div>
    </div>
  );
}
