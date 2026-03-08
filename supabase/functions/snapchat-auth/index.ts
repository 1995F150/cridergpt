import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SNAPCHAT_CLIENT_ID = Deno.env.get('SNAPCHAT_CLIENT_ID');
    if (!SNAPCHAT_CLIENT_ID) {
      throw new Error('SNAPCHAT_CLIENT_ID is not configured');
    }

    const { action, code, redirect_uri } = await req.json();

    if (action === 'get_auth_url') {
      // Generate Snapchat Login Kit OAuth URL
      const scopes = 'https://auth.snapchat.com/oauth2/api/user.display_name https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar https://auth.snapchat.com/oauth2/api/user.external_id';
      const state = crypto.randomUUID();
      
      const authUrl = `https://accounts.snapchat.com/accounts/oauth2/auth?client_id=${SNAPCHAT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;

      return new Response(JSON.stringify({ url: authUrl, state }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code') {
      // Exchange authorization code for tokens
      const SNAPCHAT_CLIENT_SECRET = Deno.env.get('SNAPCHAT_CLIENT_SECRET');
      
      const tokenResponse = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
          client_id: SNAPCHAT_CLIENT_ID,
          client_secret: SNAPCHAT_CLIENT_SECRET || '',
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(`Snapchat token exchange failed [${tokenResponse.status}]: ${JSON.stringify(tokenData)}`);
      }

      // Fetch user profile with Bitmoji
      const profileResponse = await fetch('https://kit.snapchat.com/v1/me?query=%7BdisplayName%2Cbitmoji%7BselfieUrl%7D%2CexternalId%7D', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
      });

      const profileData = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(`Snapchat profile fetch failed [${profileResponse.status}]: ${JSON.stringify(profileData)}`);
      }

      const snapUser = profileData.data?.me || {};
      
      return new Response(JSON.stringify({
        display_name: snapUser.displayName || null,
        bitmoji_url: snapUser.bitmoji?.selfieUrl || null,
        external_id: snapUser.externalId || null,
        access_token: tokenData.access_token,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_profile') {
      // Fetch Snapchat profile using existing access token
      const { access_token } = await req.json();
      
      const profileResponse = await fetch('https://kit.snapchat.com/v1/me?query=%7BdisplayName%2Cbitmoji%7BselfieUrl%7D%2CexternalId%7D', {
        headers: { 'Authorization': `Bearer ${access_token}` },
      });

      const profileData = await profileResponse.json();
      const snapUser = profileData.data?.me || {};

      return new Response(JSON.stringify({
        display_name: snapUser.displayName || null,
        bitmoji_url: snapUser.bitmoji?.selfieUrl || null,
        external_id: snapUser.externalId || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Snapchat auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
