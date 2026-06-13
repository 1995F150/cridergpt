import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function log(msg: string) {
  console.log(`[verify-iap] ${msg}`)import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function log(msg: string) {
  console.log(`[verify-iap] ${msg}`)
}

function b64url(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  const binStr = atob(base64)
  const len = binStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i)
  }
  return bytes
}

function b64urlStr(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "")
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function getAccessToken() {
  const sa = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || "{}")
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }

  const unsigned = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(claims))}`
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${b64urlStr(String.fromCharCode(...new Uint8Array(signature)))}`

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(`Google token error: ${JSON.stringify(json)}`)
  return json.access_token as string
}

async function verifyAndroidSubscription(
  packageName: string,
  productId: string,
  purchaseToken: string,
  accessToken: string
) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await res.json()
  if (!res.ok) throw new Error(`Android verify error: ${JSON.stringify(json)}`)
  return json
}

async function verifyAppleSubscription(receipt: string) {
  const parts = receipt.split('.')
  if (parts.length !== 3) throw new Error('Invalid Apple JWS format')
  const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1])))
  log(`Apple payload: ${JSON.stringify(payload)}`)
  const expiresDate = payload.expiresDate || payload.expirationDate
  const now = Date.now()
  const isValid = expiresDate ? expiresDate > now : true
  return { isValid, expiryDate: expiresDate ? new Date(expiresDate).toISOString() : null, ...payload }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  try {
    log("Function started")
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } })
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("No authorization header")
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error("Invalid user token")

    const body = await req.json()
    const { platform } = body
    let verificationData

    if (platform === "android") {
      const { packageName, productId, purchaseToken } = body
      const accessToken = await getAccessToken()
      verificationData = await verifyAndroidSubscription(packageName, productId, purchaseToken, accessToken)
      const expiryTimeMillis = parseInt(verificationData.expiryTimeMillis || "0")
      if (expiryTimeMillis > Date.now()) await supabase.from("profiles").update({ is_premium: true }).eq("id", user.id)
    } else if (platform === "apple") {
      verificationData = await verifyAppleSubscription(body.receipt)
      if (verificationData.isValid) await supabase.from("profiles").update({ is_premium: true }).eq("id", user.id)
    } else throw new Error("Unsupported platform")

    return new Response(JSON.stringify({ success: true, data: verificationData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    log(`Error: ${error.message}`)
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})

}
