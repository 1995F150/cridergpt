import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

async function updateUserPlan(customerId: string, plan: string, subscriptionId?: string) {
  console.log(`Updating user plan: customerId=${customerId}, plan=${plan}`);
  
  // Get customer from Stripe to find email
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) {
    console.error('Customer not found or deleted');
    return;
  }
  
  const customerData = customer as Stripe.Customer;
  const email = customerData.email;
  
  if (!email) {
    console.error('Customer email not found');
    return;
  }
  
  console.log(`Looking for user with email: ${email}`);
  
  // First, try to get user_id from auth.users by email
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  let targetUserId = null;
  
  if (authUser?.users) {
    const user = authUser.users.find(u => u.email === email);
    if (user) {
      targetUserId = user.id;
      console.log(`Found user_id: ${targetUserId} for email: ${email}`);
    }
  }
  
  // Update ai_usage table - try both by email AND by user_id
  if (targetUserId) {
    // Update by user_id (this is the correct way)
    const { error: userIdError } = await supabase
      .from('ai_usage')
      .upsert({
        user_id: targetUserId,
        email: email, // Store actual email, not UUID
        user_plan: plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });
    
    if (userIdError) {
      console.error('Failed to update by user_id:', userIdError);
    } else {
      console.log(`Successfully updated plan for user_id ${targetUserId} (${email}) to ${plan}`);
    }
  }
  
  // Also try to update by email in case the email field actually contains emails
  const { error: emailError } = await supabase
    .from('ai_usage')
    .upsert({
      email: email,
      user_plan: plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'email',
      ignoreDuplicates: false 
    });
  
  if (emailError) {
    console.log('Email-based update failed (expected if email field contains UUIDs):', emailError);
  }
  
  // Send real-time notification to frontend if we have a user_id
  if (targetUserId) {
    const notificationData = {
      user_id: targetUserId,
      notification_type: 'subscription_updated',
      data: {
        new_plan: plan,
        subscription_id: subscriptionId,
        customer_id: customerId,
        timestamp: new Date().toISOString()
      }
    };
    
    const { error: notificationError } = await supabase
      .from('feature_notifications')
      .insert(notificationData);
    
    if (notificationError) {
      console.error('Failed to send notification:', notificationError);
    } else {
      console.log(`Sent real-time notification to user ${targetUserId} for plan change to ${plan}`);
    }
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

    // Parse the event first to get the type
    const event = JSON.parse(body) as Stripe.Event;
    const webhookSecret = getWebhookSecret(event.type);
    
    if (!webhookSecret) {
      console.log(`No webhook secret configured for event type: ${event.type}`);
      return new Response('Event type not configured', { status: 200 });
    }

    // Verify the webhook signature
    let verifiedEvent: Stripe.Event;
    try {
      verifiedEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    console.log(`Processing webhook event: ${verifiedEvent.type}`);

    // Handle different event types
    switch (verifiedEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = verifiedEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          const plan = getPlanFromAmount(price.unit_amount || 0);
          await updateUserPlan(customerId, plan, subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = verifiedEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        await updateUserPlan(customerId, 'free');
        break;
      }

      case 'checkout.session.completed': {
        const session = verifiedEvent.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        
        if (session.mode === 'subscription' && session.subscription) {
          // Handle subscription checkout
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price.id;
          
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            const plan = getPlanFromAmount(price.unit_amount || 0);
            await updateUserPlan(customerId, plan, subscription.id);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = verifiedEvent.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Downgrade to free plan on payment failure
        await updateUserPlan(customerId, 'free');
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
            await updateUserPlan(customerId, plan, subscription.id);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${verifiedEvent.type}`);
    }

    return new Response('Webhook processed successfully', { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(`Webhook error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});