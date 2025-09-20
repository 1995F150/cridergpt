# CriderGPT Backend Integration Guide for Farmer Simulator

## Overview
This guide explains how to integrate your Farmer Simulator backend with the CriderGPT subscription system to unlock features when users purchase CriderGPT Plus or Pro plans.

## Database Tables to Monitor

### 1. `platform_subscriptions` Table
**Primary table for cross-platform subscription tracking**
```sql
TABLE: platform_subscriptions
- user_id (uuid) - Links to the user who made the purchase
- email (text) - User's email address
- plan_name (text) - 'free', 'plus', or 'pro'
- platform_name (text) - Always 'cridergpt' for our system
- sync_status (text) - 'pending', 'synced', or 'failed'
- features_unlocked (jsonb) - JSON object with specific features to unlock
- stripe_customer_id (text) - Stripe customer reference
- stripe_subscription_id (text) - Stripe subscription reference
- created_at/updated_at (timestamps)
```

### 2. `ai_usage` Table
**Secondary verification table**
```sql
TABLE: ai_usage
- user_id (uuid)
- email (text)
- user_plan (text) - 'free', 'plus', or 'pro'
- updated_at (timestamp)
```

## Feature Mapping by Plan

### Plus Plan Features (`plan_name = 'plus'`)
```json
{
  "farmer_simulator_plus": true,
  "advanced_analytics": true,
  "priority_support": true
}
```

### Pro Plan Features (`plan_name = 'pro'`)
```json
{
  "farmer_simulator_pro": true,
  "farmer_simulator_plus": true,
  "advanced_analytics": true,
  "priority_support": true,
  "custom_integrations": true,
  "unlimited_features": true
}
```

## API Endpoint for Verification

### Webhook Endpoint
**URL:** `https://[your-supabase-url]/functions/v1/sync-platform-subscription`
**Method:** POST
**Purpose:** Receives subscription updates and syncs with external platforms

### Request Format to Check Subscription
You should implement an endpoint in your Farmer Simulator backend that CriderGPT can call:

```javascript
// Expected request format from CriderGPT
{
  "user_id": "uuid",
  "email": "user@example.com",
  "plan_name": "plus", // or "pro"
  "features_unlocked": {
    "farmer_simulator_plus": true,
    "advanced_analytics": true,
    "priority_support": true
  },
  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_..."
}
```

## Integration Steps for Your AI System

### 1. Database Setup
Create a table in your Farmer Simulator database to track CriderGPT subscriptions:

```sql
CREATE TABLE cridergpt_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  plan_name TEXT NOT NULL, -- 'free', 'plus', 'pro'
  features_unlocked JSONB,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, email)
);
```

### 2. Webhook Endpoint Creation
Create an endpoint in your system to receive subscription updates:

```javascript
// POST /api/cridergpt/subscription-update
app.post('/api/cridergpt/subscription-update', async (req, res) => {
  const { user_id, email, plan_name, features_unlocked } = req.body;
  
  // Upsert subscription record
  await db.query(`
    INSERT INTO cridergpt_subscriptions (user_id, email, plan_name, features_unlocked, sync_status)
    VALUES ($1, $2, $3, $4, 'synced')
    ON CONFLICT (user_id, email) 
    DO UPDATE SET 
      plan_name = EXCLUDED.plan_name,
      features_unlocked = EXCLUDED.features_unlocked,
      sync_status = 'synced',
      updated_at = NOW()
  `, [user_id, email, plan_name, features_unlocked]);
  
  // Unlock features in your system
  await unlockFarmerSimulatorFeatures(user_id, features_unlocked);
  
  res.json({ status: 'success' });
});
```

### 3. Feature Unlocking Logic
Implement feature checking in your Farmer Simulator:

```javascript
function hasFeatureAccess(user_id, feature_name) {
  const subscription = await db.query(
    'SELECT features_unlocked FROM cridergpt_subscriptions WHERE user_id = $1',
    [user_id]
  );
  
  if (!subscription.rows[0]) return false;
  
  const features = subscription.rows[0].features_unlocked;
  return features[feature_name] === true;
}

// Usage examples:
// hasFeatureAccess(user_id, 'farmer_simulator_plus')
// hasFeatureAccess(user_id, 'farmer_simulator_pro')
// hasFeatureAccess(user_id, 'advanced_analytics')
```

### 4. Real-time Verification
For real-time verification, you can also query the CriderGPT database directly:

```javascript
// Direct database query (if you have access)
async function verifyCriderGPTSubscription(email) {
  const result = await supabase
    .from('platform_subscriptions')
    .select('plan_name, features_unlocked, sync_status')
    .eq('email', email)
    .eq('platform_name', 'cridergpt')
    .single();
    
  return result.data;
}
```

## Security Considerations

1. **Webhook Authentication**: Implement proper webhook signature verification
2. **Rate Limiting**: Add rate limiting to your webhook endpoints
3. **Input Validation**: Validate all incoming data from CriderGPT
4. **Duplicate Prevention**: Handle duplicate webhook calls gracefully

## Testing Scenarios

### Test Case 1: New Plus Subscription
- User buys CriderGPT Plus
- Webhook fires with `plan_name: 'plus'`
- Farmer Simulator unlocks: `farmer_simulator_plus`, `advanced_analytics`, `priority_support`

### Test Case 2: Upgrade to Pro
- User upgrades from Plus to Pro
- Webhook fires with `plan_name: 'pro'`
- Farmer Simulator unlocks all features including `farmer_simulator_pro`

### Test Case 3: Subscription Cancellation
- User cancels subscription
- Webhook fires with `plan_name: 'free'`
- Farmer Simulator removes premium features

## Error Handling

```javascript
// Handle webhook errors
app.post('/api/cridergpt/subscription-update', async (req, res) => {
  try {
    // Process subscription update
    await processSubscriptionUpdate(req.body);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Subscription update failed:', error);
    // Log error for manual review
    await logSyncError(req.body, error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Sync failed, will retry' 
    });
  }
});
```

## Key Points for Your AI System

1. **Monitor the `platform_subscriptions` table** for subscription changes
2. **Check `sync_status = 'pending'`** to find records that need processing
3. **Use the `features_unlocked` JSON field** to determine what to unlock
4. **Always verify by both `user_id` AND `email`** for accuracy
5. **Handle subscription downgrades** (Pro → Plus → Free)
6. **Implement retry logic** for failed syncs
7. **Log all subscription changes** for audit purposes

## Webhook URL to Configure in CriderGPT
Once you implement your webhook endpoint, provide this URL to be configured in the CriderGPT system:
```
https://your-farmer-simulator-domain.com/api/cridergpt/subscription-update
```

This integration ensures that when users purchase CriderGPT Plus/Pro, they automatically get the corresponding features unlocked in your Farmer Simulator platform.