
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticResult {
  service: string;
  status: 'healthy' | 'degraded' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

interface SystemReport {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  results: DiagnosticResult[];
  summary: {
    totalChecks: number;
    healthyServices: number;
    degradedServices: number;
    errorServices: number;
  };
  usageStats: {
    totalUsers: number;
    activeUsersLast24h: number;
    totalAIRequests: number;
    totalTTSRequests: number;
    stripeCustomers: number;
  };
  recommendations: string[];
}

const logStep = (step: string, details?: any) => {
  console.log(`[DIAGNOSTICS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting comprehensive system diagnostics");
    
    const results: DiagnosticResult[] = [];
    const recommendations: string[] = [];
    
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Check Supabase Connection
    logStep("Checking Supabase connection");
    try {
      const { data, error } = await supabase.from('system_info').select('*').limit(1);
      if (error) throw error;
      
      results.push({
        service: 'Supabase Database',
        status: 'healthy',
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        service: 'Supabase Database',
        status: 'error',
        message: `Database connection failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      recommendations.push("Check Supabase connection and service role key");
    }

    // 2. Check OpenAI API
    logStep("Checking OpenAI API");
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      results.push({
        service: 'OpenAI API',
        status: 'error',
        message: 'OpenAI API key not found in environment',
        timestamp: new Date().toISOString()
      });
      recommendations.push("Configure OpenAI API key in Supabase secrets");
    } else {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            service: 'OpenAI API',
            status: 'healthy',
            message: `API accessible, ${data.data?.length || 0} models available`,
            details: { modelsCount: data.data?.length },
            timestamp: new Date().toISOString()
          });

          // Test a simple completion
          const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: 'Test connection - respond with OK' }],
              max_tokens: 10
            }),
          });

          if (testResponse.ok) {
            const testData = await testResponse.json();
            results.push({
              service: 'OpenAI Chat Completion',
              status: 'healthy',
              message: 'Chat completion test successful',
              details: { response: testData.choices[0]?.message?.content },
              timestamp: new Date().toISOString()
            });
          } else {
            throw new Error(`Chat completion test failed: ${testResponse.status}`);
          }
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      } catch (error) {
        results.push({
          service: 'OpenAI API',
          status: 'error',
          message: `OpenAI API test failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        recommendations.push("Verify OpenAI API key validity and quota limits");
      }
    }

    // 3. Check Stripe Integration
    logStep("Checking Stripe integration");
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      results.push({
        service: 'Stripe API',
        status: 'error',
        message: 'Stripe secret key not found in environment',
        timestamp: new Date().toISOString()
      });
      recommendations.push("Configure Stripe secret key in Supabase secrets");
    } else {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
        
        // Test Stripe connection
        const account = await stripe.accounts.retrieve();
        results.push({
          service: 'Stripe API',
          status: 'healthy',
          message: `Stripe account active: ${account.business_profile?.name || account.id}`,
          details: { accountId: account.id, country: account.country },
          timestamp: new Date().toISOString()
        });

        // Check products and prices
        const products = await stripe.products.list({ active: true, limit: 10 });
        const prices = await stripe.prices.list({ active: true, limit: 10 });
        
        results.push({
          service: 'Stripe Products',
          status: products.data.length > 0 ? 'healthy' : 'degraded',
          message: `${products.data.length} active products, ${prices.data.length} active prices`,
          details: { productsCount: products.data.length, pricesCount: prices.data.length },
          timestamp: new Date().toISOString()
        });

        if (products.data.length === 0) {
          recommendations.push("Configure Stripe products and pricing plans");
        }

      } catch (error) {
        results.push({
          service: 'Stripe API',
          status: 'error',
          message: `Stripe API test failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        recommendations.push("Verify Stripe secret key and account status");
      }
    }

    // 4. Check ElevenLabs TTS
    logStep("Checking ElevenLabs TTS");
    const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsKey) {
      results.push({
        service: 'ElevenLabs TTS',
        status: 'error',
        message: 'ElevenLabs API key not found in environment',
        timestamp: new Date().toISOString()
      });
      recommendations.push("Configure ElevenLabs API key for TTS functionality");
    } else {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': elevenlabsKey,
          },
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            service: 'ElevenLabs TTS',
            status: 'healthy',
            message: `TTS service accessible, ${data.voices?.length || 0} voices available`,
            details: { voicesCount: data.voices?.length },
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      } catch (error) {
        results.push({
          service: 'ElevenLabs TTS',
          status: 'error',
          message: `ElevenLabs API test failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        recommendations.push("Verify ElevenLabs API key and account status");
      }
    }

    // 5. Check Database Health and Usage Stats
    logStep("Gathering usage statistics");
    let usageStats = {
      totalUsers: 0,
      activeUsersLast24h: 0,
      totalAIRequests: 0,
      totalTTSRequests: 0,
      stripeCustomers: 0
    };

    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true });
      
      usageStats.totalUsers = totalUsers || 0;

      // Get active users in last 24h (based on updated_at)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: activeUsers } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', yesterday.toISOString());
      
      usageStats.activeUsersLast24h = activeUsers || 0;

      // Get AI usage stats
      const { data: aiUsage } = await supabase
        .from('ai_usage')
        .select('tokens_used, tts_requests');
      
      if (aiUsage) {
        usageStats.totalAIRequests = aiUsage.reduce((sum, user) => sum + (user.tokens_used || 0), 0);
        usageStats.totalTTSRequests = aiUsage.reduce((sum, user) => sum + (user.tts_requests || 0), 0);
      }

      // Get Stripe customer count
      const { count: stripeCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      usageStats.stripeCustomers = stripeCustomers || 0;

      results.push({
        service: 'Usage Statistics',
        status: 'healthy',
        message: 'Usage statistics collected successfully',
        details: usageStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      results.push({
        service: 'Usage Statistics',
        status: 'error',
        message: `Failed to collect usage statistics: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      recommendations.push("Check database permissions for usage statistics queries");
    }

    // 6. Test Authentication System
    logStep("Testing authentication system");
    try {
      // Check if auth is working by trying to get a user (should fail gracefully)
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      
      if (error) {
        throw error;
      }

      results.push({
        service: 'Supabase Authentication',
        status: 'healthy',
        message: `Authentication system operational, ${users?.length || 0} users in sample`,
        details: { sampleUserCount: users?.length },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        service: 'Supabase Authentication',
        status: 'error',
        message: `Authentication test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      recommendations.push("Check Supabase authentication configuration");
    }

    // 7. Test Edge Functions
    logStep("Testing edge functions connectivity");
    try {
      // Test if we can call another function (this validates the functions are deployed)
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: { message: 'System health check' }
      });

      if (error && error.message?.includes('not found')) {
        results.push({
          service: 'Edge Functions',
          status: 'degraded',
          message: 'Some edge functions may not be deployed',
          timestamp: new Date().toISOString()
        });
        recommendations.push("Ensure all edge functions are properly deployed");
      } else {
        results.push({
          service: 'Edge Functions',
          status: 'healthy',
          message: 'Edge functions are accessible and responding',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      results.push({
        service: 'Edge Functions',
        status: 'error',
        message: `Edge function test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Calculate overall status
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (errorCount > 0) {
      overallStatus = errorCount > 2 ? 'critical' : 'degraded';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const report: SystemReport = {
      overallStatus,
      results,
      summary: {
        totalChecks: results.length,
        healthyServices: healthyCount,
        degradedServices: degradedCount,
        errorServices: errorCount
      },
      usageStats,
      recommendations
    };

    logStep("System diagnostics completed", { overallStatus, totalChecks: results.length });

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Critical error in system diagnostics:", error);
    return new Response(JSON.stringify({
      overallStatus: 'critical',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
