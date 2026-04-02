import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

// Initialize Supabase with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

// Plan mapping based on Stripe price amounts
function getPlanFromAmount(amount: number): string {
  if (amount <= 999) return 'free';
  if (amount <= 1999) return 'plus';
  return 'pro';
}

// Get webhook secret based on event type
function getWebhookSecret(eventType: string): string {
  const secretMap: Record<string, string> = {
    'customer.subscription.created': Deno.env.get('STRIPE_CUSTOMER_SUBSCRIPTION_CREATED_WEBHOOK_SECRET') || '',
    'customer.subscription.updated': Deno.env.get('STRIPE_CUSTOMER_SUBSCRIPTION_UPDATED_WEBHOOK_SECRET') || '',
    'customer.subscription.deleted': Deno.env.get('STRIPE_CUSTOMER_SUBSCRIPTION_DELETED_WEBHOOK_SECRET') || '',
    'checkout.session.completed': Deno.env.get('STRIPE_CHECKOUT_SESSION_COMPLETED_WEBHOOK_SECRET') || '',
    'invoice.payment_failed': Deno.env.get('STRIPE_INVOICE_PAYMENT_FAILED_WEBHOOK_SECRET') || '',
    'invoice.paid': Deno.env.get('STRIPE_INVOICE_PAID_WEBHOOK_SECRET') || '',
    'customer.created': Deno.env.get('STRIPE_CUSTOMER_CREATED_WEBHOOK_SECRET') || '',
    'customer.updated': Deno.env.get('STRIPE_CUSTOMER_UPDATED_WEBHOOK_SECRET') || '',
  };
  
  return secretMap[eventType] || '';
}

async function updateUserSubscription(customerId: string, plan: string, subscriptionId?: string, priceId?: string) {
  console.log(`🔄 Updating user subscription: customerId=${customerId}, plan=${plan}, subscriptionId=${subscriptionId}`);
  
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) {
    console.error('❌ Customer not found or deleted');
    return;
  }
  
  const customerData = customer as Stripe.Customer;
  const email = customerData.email;
  
  if (!email) {
    console.error('❌ Customer email not found');
    return;
  }
  
  console.log(`🔍 Looking for user with email: ${email}`);
  
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  let targetUserId = null;
  
  if (authUser?.users) {
    const user = authUser.users.find(u => u.email === email);
    if (user) {
      targetUserId = user.id;
      console.log(`✅ Found user_id: ${targetUserId} for email: ${email}`);
    }
  }
  
  if (!targetUserId) {
    console.error(`❌ No user found with email: ${email}`);
    return;
  }
  
  let subscriptionData = null;
  if (subscriptionId) {
    try {
      subscriptionData = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`📋 Retrieved subscription data: status=${subscriptionData.status}`);
    } catch (error) {
      console.error('❌ Failed to retrieve subscription data:', error);
    }
  }
  
  const subscriptionUpdate = {
    user_id: targetUserId,
    email: email,
    plan_name: plan,
    plan_status: plan === 'free' ? 'canceled' : 'active',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    subscription_start_date: subscriptionData ? new Date(subscriptionData.created * 1000).toISOString() : null,
    subscription_end_date: subscriptionData ? new Date(subscriptionData.current_period_end * 1000).toISOString() : null,
    trial_end_date: subscriptionData?.trial_end ? new Date(subscriptionData.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: subscriptionData?.cancel_at_period_end || false,
    canceled_at: plan === 'free' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    metadata: {
      last_stripe_event: new Date().toISOString(),
      stripe_status: subscriptionData?.status || 'unknown',
      webhook_processed: true
    }
  };
  
  console.log(`💾 Updating user_subscriptions table for user ${targetUserId}`);
  
  const { error: subscriptionError } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionUpdate, { 
      onConflict: 'user_id',
      ignoreDuplicates: false 
    });
  
  if (subscriptionError) {
    console.error('❌ Failed to update user subscription:', subscriptionError);
    return;
  }
  
  console.log(`✅ Successfully updated subscription for user ${targetUserId} (${email}) to ${plan}`);
  
  const { error: usageError } = await supabase
    .from('ai_usage')
    .upsert({
      user_id: targetUserId,
      email: email,
      user_plan: plan,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id',
      ignoreDuplicates: false 
    });
  
  if (usageError) {
    console.log('⚠️ AI usage table update failed (non-critical):', usageError);
  } else {
    console.log('✅ Also updated ai_usage table for backward compatibility');
  }
  
  const notificationData = {
    user_id: targetUserId,
    notification_type: 'subscription_updated',
    data: {
      new_plan: plan,
      subscription_id: subscriptionId,
      customer_id: customerId,
      price_id: priceId,
      plan_status: subscriptionUpdate.plan_status,
      timestamp: new Date().toISOString()
    }
  };
  
  const { error: notificationError } = await supabase
    .from('feature_notifications')
    .insert(notificationData);
  
  if (notificationError) {
    console.error('❌ Failed to send real-time notification:', notificationError);
  } else {
    console.log(`📢 Sent real-time notification to user ${targetUserId} for plan change to ${plan}`);
  }
}

// Handle paid tag/store orders from checkout.session.completed
async function handlePaidOrder(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const action = metadata.action;
  const userId = metadata.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.log('⚠️ No userId in session metadata, skipping order creation');
    return;
  }

  // Get customer email
  let email = session.customer_email || session.customer_details?.email;
  if (!email && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      email = customer.email || undefined;
    } catch (_) {}
  }

  const now = new Date().toISOString();

  if (action === 'tag-order') {
    const qty = parseInt(metadata.quantity || '1');
    let shippingAddress = null;
    let customerName = metadata.customerName || null;
    try { shippingAddress = metadata.shippingAddress ? JSON.parse(metadata.shippingAddress) : null; } catch (_) {}
    if (!customerName && shippingAddress?.fullName) customerName = shippingAddress.fullName;

    const unitPrice = 3.50;
    // Idempotent: check if order already exists for this session
    const { data: existing } = await supabase
      .from('tag_orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existing) {
      console.log(`⚠️ Tag order already exists for session ${session.id}`);
      return;
    }

    const { error } = await supabase.from('tag_orders').insert({
      customer_id: userId,
      customer_email: email || null,
      customer_name: customerName,
      quantity: qty,
      unit_price: unitPrice,
      total_price: unitPrice * qty,
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      shipping_address: shippingAddress,
      notes: shippingAddress?.notes || null,
      status: 'pending',
      payment_status: 'paid',
      paid_at: now,
    });

    if (error) {
      console.error('❌ Failed to create tag order:', error);
    } else {
      console.log(`✅ Tag order created (paid) for session ${session.id}, qty=${qty}`);
    }

  } else if (action === 'store-order') {
    let cartItems = null;
    let shippingAddress = null;
    try { cartItems = metadata.cartItems ? JSON.parse(metadata.cartItems) : null; } catch (_) {}
    try { shippingAddress = metadata.shippingAddress ? JSON.parse(metadata.shippingAddress) : null; } catch (_) {}

    // Idempotent check
    const { data: existing } = await supabase
      .from('store_orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existing) {
      console.log(`⚠️ Store order already exists for session ${session.id}`);
      return;
    }

    const total = (session.amount_total || 0) / 100;

    const { error } = await supabase.from('store_orders').insert({
      user_id: userId,
      items: cartItems || [],
      subtotal: total,
      total: total,
      status: 'pending',
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      shipping_address: shippingAddress,
      notes: shippingAddress?.notes || null,
      payment_status: 'paid',
      paid_at: now,
    });

    if (error) {
      console.error('❌ Failed to create store order:', error);
    } else {
      console.log(`✅ Store order created (paid) for session ${session.id}`);
    }

    // Clear cart after successful payment
    await supabase.from('store_cart_items').delete().eq('user_id', userId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      throw new Error('No stripe signature found');
    }

    const event = JSON.parse(body) as Stripe.Event;
    const webhookSecret = getWebhookSecret(event.type);
    
    if (!webhookSecret) {
      console.log(`⚠️ No webhook secret configured for event type: ${event.type}`);
      return new Response('Event type not configured', { status: 200 });
    }

    let verifiedEvent: Stripe.Event;
    try {
      verifiedEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    console.log(`🎯 Processing webhook event: ${verifiedEvent.type}`);

    switch (verifiedEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = verifiedEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          const plan = getPlanFromAmount(price.unit_amount || 0);
          await updateUserSubscription(customerId, plan, subscription.id, priceId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = verifiedEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        await updateUserSubscription(customerId, 'free', subscription.id, priceId);
        break;
      }

      case 'checkout.session.completed': {
        const session = verifiedEvent.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price.id;
          
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            const plan = getPlanFromAmount(price.unit_amount || 0);
            await updateUserSubscription(customerId, plan, subscription.id, priceId);
          }
        } else if (session.mode === 'payment' && session.payment_status === 'paid') {
          const planName = session.metadata?.planName;
          const action = session.metadata?.action;
          console.log(`💎 One-time payment completed: planName=${planName}, action=${action}, customerId=${customerId}`);
          
          // Handle tag orders and store orders
          if (action === 'tag-order' || action === 'store-order') {
            await handlePaidOrder(session);
          } else if (planName === 'lifetime') {
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            const email = customer.email;
            
            if (email) {
              const { data: authUser } = await supabase.auth.admin.listUsers();
              const user = authUser?.users?.find(u => u.email === email);
              
              if (user) {
                await supabase.from('ai_usage').upsert({
                  user_id: user.id,
                  email: email,
                  user_plan: 'lifetime',
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
                
                await supabase.from('profiles').update({
                  tier: 'lifetime',
                  stripe_customer_id: customerId,
                }).eq('user_id', user.id);
                
                await supabase.from('user_subscriptions').upsert({
                  user_id: user.id,
                  email: email,
                  plan_name: 'lifetime',
                  plan_status: 'active',
                  stripe_customer_id: customerId,
                  updated_at: new Date().toISOString(),
                  metadata: { lifetime: true, payment_intent: session.payment_intent }
                }, { onConflict: 'user_id' });
                
                await supabase.rpc('increment_lifetime_count' as any);
                
                await supabase.from('feature_notifications').insert({
                  user_id: user.id,
                  notification_type: 'subscription_updated',
                  data: { new_plan: 'lifetime', lifetime: true }
                });
                
                console.log(`🏆 Lifetime plan activated for ${email}`);
              }
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = verifiedEvent.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await updateUserSubscription(customerId, 'free');
        break;
      }

      case 'invoice.paid': {
        const invoice = verifiedEvent.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const priceId = subscription.items.data[0]?.price.id;
          
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            const plan = getPlanFromAmount(price.unit_amount || 0);
            await updateUserSubscription(customerId, plan, subscription.id, priceId);
          }
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${verifiedEvent.type}`);
    }

    return new Response('Webhook processed successfully', { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(`Webhook error: ${(error as Error).message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
