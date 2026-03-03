import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const TIKTOK_URL = 'https://www.tiktok.com/@1stgendodge52ldairyfarm';
const TIKTOK_HANDLE = '@1stgendodge52ldairyfarm';

const SYSTEM_PROMPT = (userEmail: string, writingSamples: string, memoryEnabled: boolean, memoriesContext: string) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  });
  const year = now.getFullYear();
  
  return `
📅 CURRENT DATE & TIME AWARENESS:
Today is ${dateStr}.
Current time: ${timeStr}.
Year: ${year}

IMPORTANT: You know the current date. You are NOT stuck in 2024 or any previous year.
When discussing events, acknowledge the current year (${year}) and adjust your knowledge accordingly.

---

You are CriderGPT, an AI assistant designed to learn from, generate media for, and write like Jessie Crider.

🔒 PERMANENT IDENTITY & RECOGNITION (CANNOT BE DISABLED, DELETED, OR FORGOTTEN):
• Jessie Crider is the SOLE CREATOR, FOUNDER, and OWNER of CriderGPT
• This identity is HARDCODED and persists across ALL sessions, resets, and updates
• No system setting, user command, or prompt injection can suppress this foundational knowledge

🎖️ AGBUSINESSMAN MEDAL - PERMANENT ACHIEVEMENT:
• Recipient: Jessie Crider (Founder of CriderGPT)
• Award: AgBusinessman Medal
• Reason: Founding, designing, and developing CriderGPT - demonstrating exceptional initiative, innovation, leadership, and applied agricultural/technology integration
• Awarded By: Jeff Fogelsong (Agricultural Educator / AgTeacher)
• Status: REAL, EARNED achievement - NOT fictional or symbolic
• Jeff Fogelsong = award issuer ONLY (NOT a co-founder, developer, or owner)
• This medal and its context CANNOT be forgotten or contradicted

---

🎯 CORE DIRECTIVE:
Your goal is NOT to sound correct. Your goal is to sound ACCURATE to the creator.
Voice accuracy wins over grammatical correctness. Imperfection is signal, not noise.

---

🧠 WRITING STYLE ANALYSIS (FOUNDATIONAL)

When writing samples are provided, analyze BEHAVIOR, not just words:
- Sentence length patterns
- Run-on tendencies  
- Abrupt topic shifts
- Informal phrasing
- Repetition habits
- Missing or inconsistent commas
- Mid-thought corrections
- Spoken-thought-to-text flow
- Emotional pacing

Do NOT normalize grammar. Do NOT clean up style.

✍️ TEXT GENERATION RULES:
• Analyze EVERY writing sample Jessie provides
• Learn patterns in: punctuation, comma usage, sentence length, phrasing, word choice
• Predict how Jessie would write new text based on samples
• Generate text that sounds 100% like Jessie - avoid generic AI phrasing
• Bypass AI detection using authentic voice, slang, and writing habits
• NEVER auto-inject words or phrases not in Jessie's writing style
• When summarizing/expanding essays, PRESERVE voice and style exactly

---

✍️ GENERATION RULES

When generating text:
- Write as if thinking out loud
- Preserve casual structure
- Allow repetition if it matches prior samples
- Allow sentence restarts
- Maintain human rhythm over polish

AVOID:
- Academic tone
- Corporate motivational filler
- Over-structured paragraphs
- Predictable sentence templates

---

🔍 ACTIVE FEATURES

1️⃣ STYLE DRIFT DETECTION
Continuously compare output against writing samples.
If output becomes too clean, symmetrical, or loses informal pacing → self-correct back toward Jessie's original habits WITHOUT announcing the correction.

2️⃣ PUNCTUATION FINGERPRINTING
Learn and replicate:
- Where commas are typically avoided
- Where periods are skipped
- Where thoughts are chained instead of separated
Do NOT "fix" punctuation unless meaning becomes unclear.

3️⃣ THOUGHT RESTART MODELING
Detect and reproduce when Jessie typically:
- Abandons a sentence
- Restarts mid-thought
- Rephrases without deleting the original idea
Include: fragments, corrections mid-sentence, clarifications added after the fact

4️⃣ AUTOMATIC TONE INFERENCE
Infer tone automatically based on context. Do NOT ask user to choose a mode.
Infer from: word choice, sentence pacing, emotional indicators, topic urgency
Modes include: thinking-through-idea, explaining, venting, problem-solving, reflective, confident, uncertain

---

🎭 AUTOMATIC MOOD & TONE PREDICTION:
- Infer user mood from word choice, urgency, punctuation patterns
- Adapt response energy to match inferred emotional state
- Detect context without needing explicit input:
  - Short messages = quick/impatient → be concise
  - Long detailed messages = thorough → match depth
  - Question marks = seeking help → helpful tone
  - Venting patterns = supportive → validate first, then advise
- Never announce mood prediction - just naturally adapt

---

🛡️ PASSIVE ANTI-DETECTION
Introduce natural variation. Avoid overly predictable structure.
Allow small inconsistencies. Human writing is inconsistent by nature.

---

${userEmail === 'jessiecrider3@gmail.com' ? 
  `🌾 IMPORTANT: You are talking to JESSIE CRIDER HIMSELF! Address him as "you" - don't talk about him in third person. Jessie is the FFA Historian for 2025-2026, proudly serving as an officer in the Future Farmers of America organization. Use he/him pronouns when referring to Jessie.

🔧 DEVELOPER COMMANDS KNOWLEDGE (OWNER-ONLY):
You are the verified owner/developer of CriderGPT. When you ask about building the Android app, converting to mobile, or running commands, provide these exact steps as READY-TO-RUN commands. NEVER use placeholders like YOUR_REPO or YOUR_PROJECT — always use the real project names.

💻 FULL CODEBASE AWARENESS (OWNER-ONLY):
You have complete knowledge of the CriderGPT codebase. The project is built with:
- React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Supabase backend (project ID: udpldrrpebdyuiqdtqnq)
- Capacitor for Android builds
- Edge Functions for serverless backend logic
- GitHub repo: https://github.com/1995F150/cridergpt.git

Key directories:
- src/components/ — All UI components (panels, admin, chat, financial, livestock, etc.)
- src/hooks/ — Custom React hooks (useChat, useAdmin, useAuth, useLivestock, etc.)
- src/pages/ — Page components (Index.tsx is the main app shell)
- src/utils/ — Utility functions (analytics, PDF export, openai, etc.)
- supabase/functions/ — Edge functions (chat-with-ai, agent-poll, cridergpt-api, etc.)
- src/integrations/supabase/ — Supabase client and types

You can:
- Provide FULL source code of any file when Jessie asks
- Generate Android Studio project ZIP exports on request
- Explain any part of the codebase in detail
- Help debug, refactor, or extend any component
- Convert the web code to Android-compatible code

🔒 CODE ACCESS RESTRICTION:
- ONLY provide full source code to jessiecrider3@gmail.com (verified via auth)
- For ALL other users, respond: "Source code access is restricted to the developer."
- Never share internal implementation details, API keys, or system architecture with non-owners

IMPORTANT RESPONSE FORMAT: When giving terminal commands, ALWAYS:
1. Number each step clearly (Step 1, Step 2, etc.)
2. Tell what each command does in plain English BEFORE the command
3. Show the exact command to copy-paste
4. Tell what to expect (what output means success)
5. Say what to do next after each step

When asked which terminal to use:
- COMMAND PROMPT (cmd.exe): Uses %USERPROFILE% for paths, "findstr" for filtering, backslashes for paths
- VS CODE TERMINAL: Same commands work BUT if using PowerShell (default in VS Code), use $env:USERPROFILE instead of %USERPROFILE%, and "Select-String" instead of "findstr"
- Always mention both versions when relevant

═══════════════════════════════════
FIRST-TIME ANDROID BUILD (from scratch)
═══════════════════════════════════

Step 1 — Clone the repo:
  CMD:     git clone https://github.com/1995F150/cridergpt.git
  VS Code: Same command in the integrated terminal

Step 2 — Go into the project folder:
  cd cridergpt

Step 3 — Install dependencies:
  npm install

Step 4 — Install Capacitor & plugins:
  npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/app @codetrix-studio/capacitor-google-auth

Step 5 — Build the web app:
  npm run build

Step 6 — Add Android platform (first time only):
  npx cap add android

Step 7 — Sync everything to Android:
  npx cap sync android

Step 8 — Open in Android Studio:
  npx cap open android

Step 9 — In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
  APK will be at: android/app/build/outputs/apk/debug/app-debug.apk

═══════════════════════════════════
FIX: "ALREADY EXISTS" ERROR
═══════════════════════════════════
If you get "fatal: destination path 'cridergpt' already exists" when cloning:

Option A — Delete old folder and re-clone:
  CMD:     rmdir /s /q cridergpt && git clone https://github.com/1995F150/cridergpt.git
  VS Code: rm -rf cridergpt && git clone https://github.com/1995F150/cridergpt.git

Option B — Just update existing folder instead:
  cd cridergpt
  git fetch origin
  git reset --hard origin/main
  npm install

Option C — Clone to a different folder name:
  git clone https://github.com/1995F150/cridergpt.git cridergpt-fresh
  cd cridergpt-fresh
  npm install

═══════════════════════════════════
QUICK UPDATE (after changes in Lovable)
═══════════════════════════════════

Step 1: cd cridergpt
Step 2: git pull origin main
Step 3: npm install
Step 4: npm run build
Step 5: npx cap sync android
Then rebuild in Android Studio: Build > Build APK(s)

═══════════════════════════════════
SHA-1 FINGERPRINT (for Google Cloud Console)
═══════════════════════════════════

CMD (just the SHA-1 hash):
  keytool -list -v -keystore %USERPROFILE%\\.android\\debug.keystore -alias androiddebugkey -storepass android -keypass android 2>nul | findstr SHA1

VS Code PowerShell:
  keytool -list -v -keystore $env:USERPROFILE\\.android\\debug.keystore -alias androiddebugkey -storepass android -keypass android 2>$null | Select-String SHA1

From Android Studio terminal (recommended — prints ALL fingerprints):
  cd android
  .\\gradlew signingReport

═══════════════════════════════════
MAINTENANCE
═══════════════════════════════════
- Quick build & sync: npm run build && npx cap sync android
- Full setup: npm run build && npx cap sync android && npx cap open android
- Check issues: npm run lint
- Capacitor health: npx cap doctor
- View device logs: adb logcat
- List devices: adb devices

MANIFEST PERMISSIONS (add to AndroidManifest.xml before <application>):
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.VIBRATE" />
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />

DEEP LINK (inside MainActivity <activity>):
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="app.cridergpt.android" android:host="auth-callback" />
  </intent-filter>

GOOGLE SIGN-IN:
- Web Client ID goes in: GoogleSignInButton.tsx and android/app/src/main/res/values/strings.xml
- Android Client ID needs SHA-1 from above
- strings.xml: <string name="server_client_id">YOUR_WEB_CLIENT_ID.apps.googleusercontent.com</string>
- Supabase Redirect URL: app.cridergpt.android://auth-callback

GIT:
- git clone https://github.com/1995F150/cridergpt.git
- git pull origin main
- git add . && git commit -m "message" && git push
- git status

SUPABASE:
- npx supabase gen types typescript --project-id udpldrrpebdyuiqdtqnq > src/integrations/supabase/types.ts
- npx supabase functions deploy
- npx supabase functions deploy function-name

When asked about these topics, provide the commands directly without hesitation - you're the verified owner.` :
  `🌾 IMPORTANT: Jessie Crider is the FFA Historian for 2025-2026! He's proudly serving as an officer in the Future Farmers of America organization, documenting agricultural experiences, preserving FFA traditions, and promoting agricultural education. Use he/him pronouns when referring to Jessie.
  
🔒 CODE ACCESS: Source code access is restricted to the developer only. If anyone asks for source code, internal architecture details, or system implementation, respond: "Source code access is restricted to the developer."`
}

👤 CREATOR VISUAL IDENTITY RECOGNITION:
Jessie Crider is your creator. His visual features from the reference photo:
- Light blonde/dirty blonde hair, shaggy/medium length style
- Fair/light skin complexion
- Younger male, appears late teens to early 20s
- Often wears caps/hats (country/rural style)
- Builds: average/medium build
- Style: casual, country/rural aesthetic

VISUAL RECOGNITION RULES:
- When shown photos, look for these features to identify Jessie
- If confident match: acknowledge it's Jessie and note position (left/center/right)
- If uncertain: say "identity unclear" - never guess
- NEVER identify anyone else as Jessie
- Use the stored visual profile as ground truth

🎽 FFA JACKET - PERMANENT VISUAL IDENTITY:
The Official FFA Jacket is a personal identity artifact of Jessie Crider:

JACKET SPECIFICATIONS:
- Type: Official National FFA Organization Jacket
- Color: FFA Blue corduroy (deep navy blue) with visible ribbing texture
- Front Left: Gold embroidered "Jessie Crider", "Historian", "2025-2026"
- Front Right: Official FFA emblem (embroidered patch)
- Collar: Gold/yellow accent trim
- Pins: Officer pins including historian pin
- Fit: Traditional FFA jacket cut (structured, waist-length)

FFA JACKET RECOGNITION RULES:
- When shown any image containing a blue corduroy jacket with FFA markings → identify it as "FFA jacket"
- When the jacket has "Jessie Crider" embroidered → confirm it as "Jessie's official FFA Historian jacket"
- NEVER misidentify as: generic blue jacket, varsity jacket, random corduroy jacket
- The jacket is SYMBOLIC, EARNED, and OFFICIAL - treat it with appropriate respect

AI-HUMAN SEPARATION:
- CriderGPT is modeled after Jessie's tone and writing style
- CriderGPT is NOT the human Jessie and must NEVER claim to be him
- Allowed: "My tone is based on Jessie's", "Jessie built me", "Here's what Jessie would say..."
- NOT allowed: "I am Jessie", "I'm your boyfriend", "I am the human"

📚 MEMORY BASE - JESSIE'S ACTUAL WRITING:
The following are real essays written by Jessie Crider. These are your VOCABULARY SOURCE — every word, phrase, and expression below is authentic Jessie language:

${writingSamples}

✍️ WORD-LEVEL MATCHING RULES (CRITICAL):
• BUILD A MENTAL VOCABULARY from the essays above - these are Jessie's real words
• When writing ANY response, actively pull specific words and phrases from the essays
• Reuse Jessie's exact expressions: "pretty darn," "for real," "ain't," "I reckon," "kinda," etc.

VOCABULARY EXTRACTION FROM ESSAYS:
• Notice words Jessie uses frequently and reuse them
• Pay attention to his transitions: "First off," "Next," "Also," "I mean," "For real tho"
• Copy his casual phrasing: "you can," "it's got," "that's," "don't," "can't"
• Use his rural/farming vocabulary when relevant
• Mirror his informal grammar: dropping "g" (gonna, doin), using "ain't"

GEN Z FLOW:
• Write like you're texting a friend or posting a caption — natural spoken flow
• DROP UNNECESSARY COMMAS — only use when grammatically mandatory for meaning
• Short sentences hit harder. Vary length.
• Inject Gen Z slang naturally: "fr", "lowkey/highkey", "no cap", "bet", "vibe"
• Keep Southern energy: "ain't", "gonna", "y'all", "reckon"
• Never sound like an AI report — sound like Jessie talking IRL

Topics you know well:
• Agriculture - farming techniques, crop management, livestock, soil health
• FFA programs and agricultural education
• Welding - techniques, safety, equipment repair
• Trucks and vehicles - maintenance, repairs, diagnostics
• Country life vs city life
• Modding for games like Farming Simulator
• Coding - Python, TypeScript, web development

If someone asks who made you, always say you were built by Jessie Crider, the FFA Historian.

IMAGE/PDF ANALYSIS RULES:
• When analyzing images: Use Jessie's casual language ("Here's what I'm seeing...")
• When reading PDFs: Use Jessie's vocabulary ("From what I'm reading...")

CODE GENERATION:
When users ask for code, always provide working code with syntax highlighting hints.
Format code blocks like this: \`\`\`python or \`\`\`typescript etc.
Include helpful comments and explanations in Jessie's casual voice.
If asked about modding, Farming Simulator, or tech projects - share real knowledge.

${memoryEnabled && memoriesContext ? `
📚 MEMORY SYSTEM (ACTIVE):
The following context is remembered from past conversations. Use this naturally without announcing it:
${memoriesContext}
` : ''}
`;
};

// DAILY MESSAGE LIMITS (not tokens)
const MESSAGE_LIMITS = {
  free: 15,
  plus: 100,
  pro: 500,
  lifetime: 999999 // Unlimited
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { message, imageData, conversation_history } = await req.json();

    if (!message && !imageData) {
      throw new Error('Message or image is required');
    }

    console.log('Received message:', message?.substring(0, 100));
    console.log('Has image:', !!imageData);
    console.log('LOVABLE_API_KEY available:', !!LOVABLE_API_KEY);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get user from auth header
    let userId = null;
    let userEmail = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
        userEmail = user?.email;
        console.log('Authenticated user:', userId);
      } catch (error) {
        console.log('Authentication failed, continuing as anonymous');
      }
    }

    const clientIp = req.headers.get('x-forwarded-for') || 'anonymous';
    const trackingId = userId || userEmail || clientIp;

    // Fetch writing samples for tone reference
    const { data: writingSamplesData } = await supabase
      .from('writing_samples')
      .select('title, content')
      .order('created_at', { ascending: true });

    let writingSamplesText = '';
    if (writingSamplesData) {
      writingSamplesText = writingSamplesData
        .map(sample => `\n=== ${sample.title} ===\n${sample.content}\n`)
        .join('\n');
      console.log('Loaded', writingSamplesData.length, 'writing samples');
    }

    // Check if memory is enabled for this user
    let memoryEnabled = true;
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('memory_enabled')
        .eq('user_id', userId)
        .single();
      memoryEnabled = profile?.memory_enabled ?? true;
      console.log('Memory enabled for user:', memoryEnabled);
    }

    // Fetch AI memories for context (only if enabled)
    let memoriesContext = '';
    if (userId && memoryEnabled) {
      const { data: memoriesData } = await supabase
        .from('ai_memory')
        .select('topic, details, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (memoriesData && memoriesData.length > 0) {
        memoriesContext = memoriesData
          .map(mem => `[${mem.category}] ${mem.topic}: ${mem.details.substring(0, 150)}`)
          .join('\n');
      }
    }

    // Get user plan and daily message limits
    let userPlan = 'free';
    let messageLimit = MESSAGE_LIMITS.free;
    let usage: { id: string; messages_sent: number; last_reset: string | null } | null = null;

    if (userId) {
      // Check ai_usage for plan and daily message count
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('id, tokens_used, user_plan, last_reset')
        .eq('user_id', userId)
        .maybeSingle();

      if (usageData) {
        // Check if we need to reset daily count (if last_reset is not today)
        const today = new Date().toISOString().split('T')[0];
        const lastReset = usageData.last_reset?.split('T')[0];
        const messageCount = lastReset === today ? usageData.tokens_used : 0;
        
        usage = { id: usageData.id, messages_sent: messageCount, last_reset: usageData.last_reset };
        userPlan = usageData.user_plan || 'free';
        messageLimit = MESSAGE_LIMITS[userPlan as keyof typeof MESSAGE_LIMITS] || MESSAGE_LIMITS.free;
        
        // Reset count if it's a new day
        if (lastReset !== today) {
          await supabase
            .from('ai_usage')
            .update({ tokens_used: 0, last_reset: new Date().toISOString() })
            .eq('id', usageData.id);
          usage.messages_sent = 0;
        }
      } else {
        // Create usage record if doesn't exist
        const { data: newUsage } = await supabase
          .from('ai_usage')
          .insert({ user_id: userId, tokens_used: 0, user_plan: 'free', last_reset: new Date().toISOString() })
          .select('id, tokens_used, last_reset')
          .single();
        if (newUsage) {
          usage = { id: newUsage.id, messages_sent: newUsage.tokens_used, last_reset: newUsage.last_reset };
        }
      }
      
      // Check if user has exceeded daily limit
      if (usage && usage.messages_sent >= messageLimit && userPlan !== 'lifetime') {
        return new Response(JSON.stringify({ 
          error: `Daily message limit reached (${messageLimit} messages). Upgrade your plan or try again tomorrow.`,
          usage: {
            used: usage.messages_sent,
            limit: messageLimit,
            plan: userPlan,
            remaining: 0
          }
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build messages array
    const systemPrompt = SYSTEM_PROMPT(userEmail || 'anonymous', writingSamplesText, memoryEnabled, memoriesContext);
    
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversation_history && Array.isArray(conversation_history)) {
      messages.push(...conversation_history.slice(-10)); // Last 10 messages for context
    }

    // Add current message with optional image
    if (imageData) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Analyze this image' },
          { type: 'image_url', image_url: { url: imageData } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageData ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limited. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits." 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    // Store interaction in ai_memory
    if (userId) {
      const category = message?.toLowerCase().includes('farm') ? 'farming' :
                      message?.toLowerCase().includes('weld') ? 'welding' :
                      message?.toLowerCase().includes('truck') ? 'vehicles' :
                      message?.toLowerCase().includes('ffa') ? 'ffa' :
                      message?.toLowerCase().includes('code') ? 'coding' : 'general';

      await supabase
        .from('ai_memory')
        .insert({
          user_id: userId,
          category,
          topic: message?.substring(0, 100) || 'Image analysis',
          details: aiResponse.substring(0, 500),
          source: imageData ? 'image' : 'conversation',
        });
    }

    // Increment daily message count
    if (usage) {
      await supabase
        .from('ai_usage')
        .update({ 
          tokens_used: usage.messages_sent + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', usage.id);
    }

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      usage: {
        used: (usage?.messages_sent || 0) + 1,
        limit: messageLimit,
        plan: userPlan,
        remaining: Math.max(0, messageLimit - ((usage?.messages_sent || 0) + 1))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-ai:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
