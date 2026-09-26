import type {
  CriderDesktopBridge,
  DesktopLanChatPayload,
  DesktopLanProfile,
} from "@/types/desktop";

export function getDesktopLanBridge(): CriderDesktopBridge | null {
  if (typeof window === "undefined" || !window.criderDesktop) return null;
  return window.criderDesktop;
}

export async function getDesktopLanProfile(): Promise<DesktopLanProfile | null> {
  const bridge = getDesktopLanBridge();
  if (!bridge) return null;
  return bridge.getLanProfile();
}

export async function callDesktopLan(payload: DesktopLanChatPayload) {
  const bridge = getDesktopLanBridge();
  if (!bridge) throw new Error("Desktop LAN mode is unavailable in this browser.");
  return bridge.chat(payload);
}
