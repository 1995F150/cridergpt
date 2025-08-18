
import { APIKeyManager } from "@/components/APIKeyManager";
import { DedicationMessage } from "@/components/DedicationMessage";

export function APIPanel() {
  return (
    <div className="api-keys-panel h-full w-full p-8">
      <DedicationMessage />
      <APIKeyManager />
    </div>
  );
}
