/**
 * Storage adapter for Supabase auth on the web/PWA bundle.
 *
 * The shipping native apps (Kotlin Android + Swift iOS) talk to Supabase
 * through their own SDKs and persist sessions in SharedPreferences /
 * Keychain. This web bundle uses plain localStorage — Capacitor is no
 * longer used anywhere in the codebase.
 */
export const supabaseAuthStorage = typeof window !== "undefined"
  ? window.localStorage
  : undefined;
