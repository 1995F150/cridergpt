/**
 * Native-first storage adapter for Supabase auth.
 *
 * On native Android/iOS, Capacitor WebView localStorage gets wiped on memory
 * eviction → users have to sign in again after closing the app. Persisting
 * the session in Capacitor Preferences (backed by SharedPreferences on
 * Android, UserDefaults on iOS) survives cold starts.
 *
 * On web/PWA, we keep using localStorage (synchronous, no extra plugin work).
 */
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = Capacitor.isNativePlatform();

export const supabaseAuthStorage = isNative
  ? {
      async getItem(key: string): Promise<string | null> {
        const { value } = await Preferences.get({ key });
        return value ?? null;
      },
      async setItem(key: string, value: string): Promise<void> {
        await Preferences.set({ key, value });
      },
      async removeItem(key: string): Promise<void> {
        await Preferences.remove({ key });
      },
    }
  : localStorage;
