import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) {
      toast.error("Push notifications not supported on this device");
      return;
    }
    if (!user) {
      toast.error("Sign in first");
      return;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true });

    const json = sub.toJSON() as any;
    await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      device_label: navigator.userAgent.slice(0, 80),
      enabled: true,
    }, { onConflict: "user_id,endpoint" });

    setSubscribed(true);
    toast.success("Notifications enabled");
  }, [supported, user]);

  const disable = useCallback(async () => {
    if (!user) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").update({ enabled: false }).eq("endpoint", sub.endpoint);
    }
    setSubscribed(false);
    toast.success("Notifications disabled");
  }, [user]);

  return { supported, permission, subscribed, enable, disable };
}
