export interface DesktopLanProfile {
  available: boolean;
  enabled: boolean;
  baseUrl: string;
  fallbackToCloud: boolean;
  hasApiKey: boolean;
}

export interface DesktopLanTestResult {
  ok: boolean;
  healthStatus: number | null;
  authStatus: number | null;
  latencyMs: number;
  error?: string;
}

export interface DesktopLanChatPayload {
  message: string;
  system_prompt?: string;
  conversation_history?: Array<{ role: string; content: string }>;
  user_id?: string | null;
  conversation_id?: string | null;
  model?: string | null;
  temperature?: number;
  max_tokens?: number;
}

export interface DesktopLanChatResult {
  response: string;
  model?: string;
  conversation_id?: string;
  latency_ms: number;
  source: "desktop-lan";
}

export interface CriderDesktopBridge {
  getLanProfile: () => Promise<DesktopLanProfile>;
  saveLanProfile: (input: {
    baseUrl: string;
    apiKey?: string;
    enabled: boolean;
    fallbackToCloud: boolean;
  }) => Promise<DesktopLanProfile>;
  testLanConnection: () => Promise<DesktopLanTestResult>;
  clearLanProfile: () => Promise<DesktopLanProfile>;
  chat: (payload: DesktopLanChatPayload) => Promise<DesktopLanChatResult>;
}

declare global {
  interface Window {
    criderDesktop?: CriderDesktopBridge;
  }
}

export {};
