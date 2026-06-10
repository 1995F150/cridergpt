import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  type: 'consumable' | 'subscription';
  platform: 'ios' | 'android' | 'web';
}

interface PurchaseResult {
  success: boolean;
  status?: string;
  purchase_id?: string;
  error?: string;
}

// Detect platform
const getPlatform = (): 'ios' | 'android' | 'web' => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  return 'web';
};

// CriderGPT IAP product catalog
// Google Play Console product IDs:
//   Plus Monthly  = cridergpt_plus_monthly
//   Pro Monthly   = cridergpt_pro_monthly
export const IAP_PRODUCTS: IAPProduct[] = [
  {
    id: 'cridergpt_plus_monthly',
    title: 'CriderGPT Plus',
    description: '100 messages/day, GPT-4o Mini, backend generator, 5 projects',
    price: '$3/mo',
    type: 'subscription',
    platform: getPlatform(),
  },
  {
    id: 'cridergpt_pro_monthly',
    title: 'CriderGPT Pro',
    description: '500 messages/day, GPT-4o, unlimited TTS, 10 projects, priority support',
    price: '$7/mo',
    type: 'subscription',
    platform: getPlatform(),
  },
];

export function useInAppPurchase() {
  const [loading, setLoading] = useState(false);
  const [purchaseInProgress, setPurchaseInProgress] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const platform = getPlatform();

  const verifyPurchase = useCallback(async (purchaseData: {
    platform: string;
    product_id: string;
    product_type: string;
    transaction_id?: string;
    receipt_data?: string;
    purchase_token?: string;
    original_transaction_id?: string;
    metadata?: Record<string, any>;
  }): Promise<PurchaseResult> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('verify-iap', {
        body: purchaseData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: data?.success || false,
        status: data?.status,
        purchase_id: data?.purchase_id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }, []);

  const purchaseProduct = useCallback(async (productId: string) => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to make purchases.",
        variant: "destructive",
      });
      return;
    }

    setPurchaseInProgress(productId);
    setLoading(true);

    try {
      const product = IAP_PRODUCTS.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      // IMPORTANT: Apple App Store requires ALL digital goods use Apple IAP on iOS.
      // Stripe is ONLY allowed for physical products and web purchases.
      if (platform === 'ios') {
        // iOS: All digital purchases MUST go through Apple IAP
        // Stripe is explicitly BLOCKED for digital goods per App Store Review Guidelines 3.1.1
        toast({
          title: "Apple In-App Purchase",
          description: `Purchase ${product.title} through the App Store. Tap to continue.`,
        });
        // Native Capacitor/StoreKit layer will handle the actual purchase flow
        // After native purchase completes, call verifyPurchase() with the receipt
        return;
      }

      if (platform === 'android') {
        // Android digital goods MUST go through Google Play Billing.
        // We call a Capacitor plugin if installed (cordova-plugin-purchase /
        // @capacitor-community/in-app-purchases), otherwise we surface a clear message.
        const store = (window as any).CdvPurchase?.store
                   ?? (window as any).Capacitor?.Plugins?.InAppPurchases;

        if (store?.order) {
          // cordova-plugin-purchase API
          try {
            await store.order(productId);
            toast({ title: 'Google Play', description: `Opening Play Billing for ${product.title}…` });
            // The plugin fires an 'approved' event -> call verifyPurchase() with token there.
          } catch (e: any) {
            toast({ title: 'Play Billing error', description: e?.message || 'Purchase failed', variant: 'destructive' });
          }
          return;
        }

        toast({
          title: 'Google Play Billing not active',
          description: 'Run on the signed Android build to purchase. Billing plugin loads only inside the installed app.',
          variant: 'destructive',
        });
        return;
      }

      // Web ONLY: Stripe checkout for digital subscriptions
      const priceIdMap: Record<string, { priceId: string; planName: string }> = {
        'cridergpt_plus_monthly': { priceId: 'price_1TExZhP90uC07RqGdJ8loF2z', planName: 'plus' },
        'cridergpt_pro_monthly': { priceId: 'price_1TExa8P90uC07RqGHYMMlGbX', planName: 'pro' },
      };

      const stripeProduct = priceIdMap[productId];
      if (stripeProduct) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { priceId: stripeProduct.priceId, planName: stripeProduct.planName },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      // No other products available on web
      toast({
        title: "Unavailable",
        description: "This product is not available for purchase on web.",
        variant: "destructive",
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      toast({
        title: "Purchase Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setPurchaseInProgress(null);
    }
  }, [user, platform, toast, verifyPurchase]);

  const getUserPurchases = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('iap_purchases' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'verified')
      .order('created_at', { ascending: false });
    return data || [];
  }, [user]);

  return {
    platform,
    loading,
    purchaseInProgress,
    products: IAP_PRODUCTS,
    purchaseProduct,
    verifyPurchase,
    getUserPurchases,
  };
}
