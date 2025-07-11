import { APIKeyManager } from "@/components/APIKeyManager";

export function APIPanel() {
  return (
    <div className="api-keys-panel h-full w-full p-8">
      <APIKeyManager />
    </div>
  );
}