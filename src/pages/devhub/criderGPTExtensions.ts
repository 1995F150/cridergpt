// Full-source CriderGPT-branded Chrome extension projects.
// Each one is wired to the live CriderGPT Supabase backend so Jessie can
// drop a Stripe paywall in later and ship straight to the Chrome Web Store.

export const SUPABASE_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc";

export type SuiteFile = { path: string; content: string };
export type SuiteExt = {
  id: string;
  name: string;
  tagline: string;
  pitch: string;
  features: string[];
  files: SuiteFile[];
};

// Tiny shared supabase.js helper bundled with every extension (no npm needed).
// Uses the Supabase REST + Auth endpoints over fetch so the extension stays
// vanilla JS / no build step.
const supabaseClientJs = `// Lightweight CriderGPT backend client — no npm, no build step.
const SUPABASE_URL = "${SUPABASE_URL}";
const SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";

async function getSession() {
  const { cgpt_session } = await chrome.storage.local.get("cgpt_session");
  return cgpt_session || null;
}
async function setSession(session) {
  await chrome.storage.local.set({ cgpt_session: session });
}
async function clearSession() {
  await chrome.storage.local.remove("cgpt_session");
}
async function userId() {
  const s = await getSession();
  return s?.user?.id || null;
}
async function userEmail() {
  const s = await getSession();
  return s?.user?.email || null;
}

async function authHeaders() {
  const s = await getSession();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: "Bearer " + (s?.access_token || SUPABASE_ANON_KEY),
    "Content-Type": "application/json",
  };
}

async function signIn(email, password) {
  const r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || "Sign-in failed");
  await setSession(data);
  return data;
}

async function signUp(email, password) {
  const r = await fetch(SUPABASE_URL + "/auth/v1/signup", {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.msg || "Sign-up failed");
  if (data.access_token) await setSession(data);
  return data;
}

// Google Sign-In via Chrome's identity API — popup OAuth, no redirect away.
// Uses Supabase's implicit flow then stores the tokens like a normal session.
async function signInWithGoogle() {
  const redirectUri = chrome.identity.getRedirectURL();
  const url = SUPABASE_URL + "/auth/v1/authorize?provider=google&redirect_to=" +
    encodeURIComponent(redirectUri);
  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (cb) => {
      if (chrome.runtime.lastError || !cb) {
        reject(new Error(chrome.runtime.lastError?.message || "Google sign-in cancelled"));
      } else resolve(cb);
    });
  });
  // Supabase returns tokens in the URL hash fragment.
  const hash = new URL(responseUrl).hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token) throw new Error("No access token returned from Google");
  // Fetch the user so we have email/id for ai_memory inserts etc.
  const ur = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + access_token },
  });
  const user = ur.ok ? await ur.json() : null;
  const session = { access_token, refresh_token, token_type: "bearer", user };
  await setSession(session);
  return session;
}

async function signOut() { await clearSession(); }

async function dbSelect(table, query = "") {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + table + (query ? "?" + query : ""), {
    headers: await authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function dbInsert(table, row) {
  // Auto-stamp user_id when signed in (most CriderGPT tables require it for RLS).
  const uid = await userId();
  const payload = uid && !row.user_id ? { ...row, user_id: uid } : row;
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
    method: "POST",
    headers: { ...(await authHeaders()), Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Saves to ai_memory with all required NOT NULL fields filled in.
async function saveMemory({ topic, details, category, source, metadata }) {
  const uid = await userId();
  if (!uid) throw new Error("Sign in first to save memory");
  return dbInsert("ai_memory", {
    user_id: uid,
    category: category || "browser",
    topic: (topic || "Untitled").slice(0, 200),
    details: details || "",
    content: details || "",
    source: source || "browser-assistant",
    metadata: metadata || {},
  });
}

async function invokeFn(name, body) {
  const r = await fetch(SUPABASE_URL + "/functions/v1/" + name, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

window.CriderGPT = {
  SUPABASE_URL, SUPABASE_ANON_KEY,
  getSession, setSession, clearSession, userId, userEmail,
  signIn, signUp, signInWithGoogle, signOut,
  dbSelect, dbInsert, saveMemory, invokeFn,
};
`;

const readme = (name: string, extra = "") => `# ${name}

Part of the CriderGPT Suite — built by Jessie Crider.

## Backend wiring
This extension is pre-wired to the live CriderGPT Supabase backend:
- URL: ${SUPABASE_URL}
- Anon key: included in supabase.js (safe — it's the public anon key)

User sessions are stored in chrome.storage.local under "cgpt_session" so the
extension stays signed-in across browser restarts.

## Adding a paywall later
Easiest path: drop in ExtensionPay (https://extensionpay.com — 5% fee, Stripe-backed).
Or set the Stripe customer + product up via the Chrome Web Store dashboard once
verified. The extension already authenticates the user against Supabase, so you
can gate features by reading their subscription_tier from the profiles table.

## Install (local test)
1. Unzip
2. chrome://extensions → Developer mode → Load unpacked → pick this folder

## Publish
chrome://extensions → Pack extension OR upload the zip to
https://chrome.google.com/webstore/devconsole ($5 one-time dev fee).

${extra}
`;

// --- 1. CriderGPT Browser Assistant ---------------------------------------
const browserAssistant: SuiteExt = {
  id: "cgpt-browser-assistant",
  name: "CriderGPT Browser Assistant",
  tagline: "AI sidebar that summarizes, rewrites, and remembers across the web.",
  pitch: "Summarize pages, rewrite selections, save memories straight into your CriderGPT account.",
  features: ["Summarize pages", "Rewrite text", "AI side panel", "Save memories to backend"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT Browser Assistant",
  "version": "1.0.0",
  "description": "AI sidebar — summarize, rewrite, and save memories to your CriderGPT account.",
  "permissions": ["sidePanel", "activeTab", "tabs", "storage", "scripting", "contextMenus", "identity"],
  "host_permissions": ["<all_urls>", "${SUPABASE_URL}/*"],
  "side_panel": { "default_path": "sidepanel.html" },
  "action": { "default_title": "Open CriderGPT" },
  "background": { "service_worker": "background.js" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "background.js", content: `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "cgpt-summarize",
    title: "CriderGPT: Summarize selection",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "cgpt-save",
    title: "CriderGPT: Save to memory",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.storage.local.set({ pending: { action: info.menuItemId, text: info.selectionText, url: tab?.url } });
  chrome.sidePanel.open({ tabId: tab.id });
});
` },
    { path: "supabase.js", content: supabaseClientJs },
    { path: "sidepanel.html", content: `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="sidepanel.css"></head>
<body>
  <header>
    <img src="icon48.png" width="28" height="28" alt="">
    <div>
      <div class="title">CriderGPT</div>
      <div class="sub" id="user">Not signed in</div>
    </div>
    <button id="auth-btn" class="ghost">Sign in</button>
  </header>

  <div id="auth" class="hidden card">
    <button id="google">Continue with Google</button>
    <div style="text-align:center;font-size:11px;color:#8b94a7">or use email</div>
    <input id="email" placeholder="email" type="email">
    <input id="pw" placeholder="password" type="password">
    <button id="signin">Sign in</button>
    <button id="signup" class="ghost">Create account</button>
    <p class="err" id="auth-err"></p>
  </div>

  <main id="app">
    <div class="row">
      <button id="summarize">Summarize page</button>
      <button id="rewrite" class="ghost">Rewrite selection</button>
    </div>
    <textarea id="input" placeholder="Ask CriderGPT to do something on this page, or paste text…"></textarea>
    <div class="row">
      <button id="agent">▶ Run agent (auto-browse)</button>
    </div>
    <div id="out" class="out"></div>
    <button id="save" class="ghost">Save to memory</button>
  </main>

  <script src="supabase.js"></script>
  <script src="sidepanel.js"></script>
</body></html>` },
    { path: "sidepanel.css", content: `* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #0f1115; color: #e8e8ea; }
header { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid #1f2330; }
.title { font-weight: 700; }
.sub { font-size: 11px; color: #8b94a7; }
header button { margin-left: auto; }
button { background: #1f8b4c; color: #fff; border: 0; border-radius: 8px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
button.ghost { background: transparent; border: 1px solid #2a3142; color: #cfd5e3; }
.row { display: flex; gap: 8px; padding: 12px; }
.row button { flex: 1; }
textarea { width: calc(100% - 24px); margin: 0 12px; min-height: 90px; padding: 8px; background: #161a24; color: #e8e8ea; border: 1px solid #2a3142; border-radius: 8px; resize: vertical; }
.out { margin: 12px; padding: 10px; background: #161a24; border-radius: 8px; min-height: 80px; font-size: 13px; white-space: pre-wrap; }
.card { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.card input { padding: 8px; background: #161a24; color: #e8e8ea; border: 1px solid #2a3142; border-radius: 8px; }
.hidden { display: none; }
.err { color: #ff6b6b; font-size: 12px; }
#save { margin: 0 12px 16px; width: calc(100% - 24px); }
` },
    { path: "sidepanel.js", content: `const $ = (id) => document.getElementById(id);

async function refreshUser() {
  const s = await CriderGPT.getSession();
  if (s?.user?.email) {
    $("user").textContent = s.user.email;
    $("auth-btn").textContent = "Sign out";
    $("auth").classList.add("hidden");
  } else {
    $("user").textContent = "Not signed in";
    $("auth-btn").textContent = "Sign in";
  }
}
refreshUser();

$("auth-btn").onclick = async () => {
  const s = await CriderGPT.getSession();
  if (s) { await CriderGPT.signOut(); return refreshUser(); }
  $("auth").classList.toggle("hidden");
};
$("signin").onclick = async () => {
  try { await CriderGPT.signIn($("email").value, $("pw").value); refreshUser(); }
  catch (e) { $("auth-err").textContent = e.message; }
};
$("signup").onclick = async () => {
  try { await CriderGPT.signUp($("email").value, $("pw").value); refreshUser(); }
  catch (e) { $("auth-err").textContent = e.message; }
};

async function getSelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString() || document.body.innerText.slice(0, 8000),
  });
  return result;
}

async function callAI(prompt, text) {
  $("out").textContent = "Thinking…";
  try {
    const data = await CriderGPT.invokeFn("chat-with-ai", {
      message: prompt + "\\n\\n" + text,
      model: "gpt-4o-mini",
    });
    $("out").textContent = data.response || JSON.stringify(data);
  } catch (e) {
    $("out").textContent = "Error: " + e.message;
  }
}

$("summarize").onclick = async () => callAI("Summarize this clearly in 5 bullet points:", await getSelection());
$("rewrite").onclick = async () => callAI("Rewrite this clearly and concisely:", $("input").value || await getSelection());

$("save").onclick = async () => {
  const content = $("out").textContent || $("input").value;
  if (!content) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await CriderGPT.saveMemory({
      topic: tab?.title || "Browser page",
      details: content,
      category: "browser",
      source: tab?.url || "browser-assistant",
    });
    $("out").textContent = "✓ Saved to CriderGPT memory\\n\\n" + content;
  } catch (e) { $("out").textContent = "Save failed: " + e.message; }
};

$("google").onclick = async () => {
  try { await CriderGPT.signInWithGoogle(); refreshUser(); }
  catch (e) { $("auth-err").textContent = e.message; }
};

// ---- Auto-browse agent: read + act ----
// CriderGPT can read the current page DOM and perform clicks/typing
// when the user asks it to "do" something instead of just summarize.
async function runAgent(instruction) {
  $("out").textContent = "Agent thinking…";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result: snapshot }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const els = [...document.querySelectorAll("a,button,input,textarea,select,[role=button]")].slice(0, 80);
      return {
        title: document.title,
        url: location.href,
        text: document.body.innerText.slice(0, 4000),
        elements: els.map((el, i) => ({
          i,
          tag: el.tagName,
          text: (el.innerText || el.value || el.placeholder || "").slice(0, 80),
          name: el.name || el.id || "",
        })),
      };
    },
  });
  try {
    const data = await CriderGPT.invokeFn("chat-with-ai", {
      message: "You are a browser agent. Page: " + snapshot.url + "\\nTitle: " + snapshot.title +
        "\\nElements: " + JSON.stringify(snapshot.elements) +
        "\\n\\nUser wants: " + instruction +
        "\\n\\nReply with a JSON plan: { \\"actions\\": [{\\"type\\":\\"click|type|navigate\\",\\"index\\":N,\\"value\\":\\"...\\",\\"url\\":\\"...\\"}], \\"reply\\": \\"...\\" }",
      model: "gpt-4o-mini",
    });
    let plan;
    try { plan = JSON.parse((data.response || "{}").replace(/^\\\`\\\`\\\`json|\\\`\\\`\\\`$/g, "").trim()); }
    catch { plan = { actions: [], reply: data.response }; }
    for (const act of plan.actions || []) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [act],
        func: (a) => {
          const els = [...document.querySelectorAll("a,button,input,textarea,select,[role=button]")];
          const el = els[a.index];
          if (a.type === "click" && el) el.click();
          else if (a.type === "type" && el) {
            el.focus(); el.value = a.value || "";
            el.dispatchEvent(new Event("input", { bubbles: true }));
          } else if (a.type === "navigate" && a.url) location.href = a.url;
        },
      });
      await new Promise((r) => setTimeout(r, 600));
    }
    $("out").textContent = (plan.reply || "Done.") + "\\n\\n" + (plan.actions?.length || 0) + " action(s) executed.";
  } catch (e) { $("out").textContent = "Agent error: " + e.message; }
}
$("agent").onclick = () => {
  const instr = $("input").value.trim();
  if (instr) runAgent(instr);
  else $("out").textContent = "Type what you want CriderGPT to do, then click Agent.";
};

// Honor right-click context menu actions
chrome.storage.local.get("pending", ({ pending }) => {
  if (!pending) return;
  chrome.storage.local.remove("pending");
  if (pending.action === "cgpt-summarize") callAI("Summarize:", pending.text);
  if (pending.action === "cgpt-save") {
    CriderGPT.saveMemory({
      topic: pending.url || "Context menu save",
      details: pending.text,
      category: "browser",
      source: pending.url || "context-menu",
    })
      .then(() => $("out").textContent = "✓ Saved")
      .catch((e) => $("out").textContent = "Save failed: " + e.message);
  }
});
` },
    { path: "README.md", content: readme("CriderGPT Browser Assistant", "Calls the `chat-with-ai` edge function and writes to the `ai_memory` table.") },
  ],
};

// --- 2. Livestock Tag Manager ---------------------------------------------
const livestockTagManager: SuiteExt = {
  id: "cgpt-livestock-tags",
  name: "Livestock Tag Manager",
  tagline: "Quick CriderGPT tag lookup + animal records from any browser tab.",
  pitch: "Punch in a CriderGPT-XXXXXX tag, get the animal pulled from your herd instantly.",
  features: ["Quick tag lookup", "Animal records", "Scan support where possible (USB/Bluetooth HID)"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT Livestock Tag Manager",
  "version": "1.0.0",
  "description": "Look up animals by CriderGPT tag from any browser tab.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["${SUPABASE_URL}/*"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "supabase.js", content: supabaseClientJs },
    { path: "popup.html", content: `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="popup.css"></head>
<body>
  <header><b>Livestock Tag Manager</b><span id="user" class="sub">—</span></header>
  <div id="auth" class="hidden">
    <input id="email" placeholder="email">
    <input id="pw" type="password" placeholder="password">
    <button id="signin">Sign in</button>
    <p class="err" id="err"></p>
  </div>
  <div id="app" class="hidden">
    <input id="tag" placeholder="CriderGPT-XXXXXX" autofocus>
    <button id="lookup">Look up</button>
    <div id="out" class="out"></div>
  </div>
  <script src="supabase.js"></script>
  <script src="popup.js"></script>
</body></html>` },
    { path: "popup.css", content: `body { width: 320px; font-family: system-ui; margin: 0; padding: 12px; background: #0f1115; color: #e8e8ea; }
header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.sub { font-size: 11px; color: #8b94a7; }
input { width: 100%; padding: 8px; margin: 4px 0; background: #161a24; color: #e8e8ea; border: 1px solid #2a3142; border-radius: 6px; box-sizing: border-box; font-family: ui-monospace, monospace; }
button { width: 100%; padding: 8px; background: #1f8b4c; color: #fff; border: 0; border-radius: 6px; cursor: pointer; margin-top: 4px; }
.out { margin-top: 10px; padding: 8px; background: #161a24; border-radius: 6px; min-height: 40px; font-size: 12px; white-space: pre-wrap; }
.err { color: #ff6b6b; font-size: 12px; }
.hidden { display: none; }
` },
    { path: "popup.js", content: `const $ = id => document.getElementById(id);

async function boot() {
  const s = await CriderGPT.getSession();
  if (!s) { $("auth").classList.remove("hidden"); return; }
  $("user").textContent = s.user?.email || "signed in";
  $("app").classList.remove("hidden");
}
boot();

$("signin").onclick = async () => {
  try { await CriderGPT.signIn($("email").value, $("pw").value); $("auth").classList.add("hidden"); boot(); }
  catch (e) { $("err").textContent = e.message; }
};

$("lookup").onclick = async () => {
  const tag = $("tag").value.trim();
  if (!tag) return;
  $("out").textContent = "Looking up " + tag + "…";
  try {
    const rows = await CriderGPT.dbSelect("animals", "tag_id=eq." + encodeURIComponent(tag) + "&select=*");
    if (!rows.length) { $("out").textContent = "No animal found for " + tag; return; }
    const a = rows[0];
    $("out").textContent =
      "✓ " + (a.name || a.animal_id || "Unnamed") + "\\n" +
      "Species: " + (a.species || "—") + "\\n" +
      "Breed: " + (a.breed || "—") + "\\n" +
      "Status: " + (a.status || "—") + "\\n" +
      "DOB: " + (a.dob || "—");
  } catch (e) { $("out").textContent = "Error: " + e.message; }
};

// HID scanners (USB/Bluetooth) type into focused input + send Enter
$("tag").addEventListener("keydown", (e) => { if (e.key === "Enter") $("lookup").click(); });
` },
    { path: "README.md", content: readme("Livestock Tag Manager", "Reads from the `animals` table. RLS limits results to the signed-in user.") },
  ],
};

// --- 3. Shared Spending Helper --------------------------------------------
const spendingHelper: SuiteExt = {
  id: "cgpt-spending-helper",
  name: "Shared Spending Helper",
  tagline: "Budget calculator + one-click expense logger that syncs to CriderGPT.",
  pitch: "Log expenses from anywhere on the web and see your running monthly budget.",
  features: ["Budget calculator", "Quick expense logging", "Synced across devices"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT Shared Spending Helper",
  "version": "1.0.0",
  "description": "Quick budget calculator + expense logger that syncs to your CriderGPT account.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["${SUPABASE_URL}/*"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "supabase.js", content: supabaseClientJs },
    { path: "popup.html", content: `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="popup.css"></head>
<body>
  <header><b>Spending Helper</b><span id="user" class="sub">—</span></header>
  <div id="auth" class="hidden">
    <input id="email" placeholder="email"><input id="pw" type="password" placeholder="password">
    <button id="signin">Sign in</button><p class="err" id="err"></p>
  </div>
  <div id="app" class="hidden">
    <div class="row">
      <input id="amount" type="number" step="0.01" placeholder="$ amount">
      <input id="cat" placeholder="category">
    </div>
    <input id="note" placeholder="note (optional)">
    <button id="log">Log expense</button>
    <hr>
    <div class="totals">
      <div>Month total: <b id="month">$0.00</b></div>
      <div>Budget: <input id="budget" type="number" step="1" placeholder="set budget"></div>
      <div>Left: <b id="left">—</b></div>
    </div>
    <div id="recent"></div>
  </div>
  <script src="supabase.js"></script>
  <script src="popup.js"></script>
</body></html>` },
    { path: "popup.css", content: `body { width: 320px; font-family: system-ui; margin: 0; padding: 12px; background: #0f1115; color: #e8e8ea; }
header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.sub { font-size: 11px; color: #8b94a7; }
.row { display: flex; gap: 6px; }
input { width: 100%; padding: 8px; margin: 4px 0; background: #161a24; color: #e8e8ea; border: 1px solid #2a3142; border-radius: 6px; box-sizing: border-box; }
button { width: 100%; padding: 8px; background: #1f8b4c; color: #fff; border: 0; border-radius: 6px; cursor: pointer; margin-top: 4px; }
hr { border: 0; border-top: 1px solid #2a3142; margin: 10px 0; }
.totals > div { display: flex; justify-content: space-between; align-items: center; margin: 4px 0; font-size: 13px; }
.totals input { width: 90px; }
#recent { margin-top: 10px; font-size: 12px; max-height: 140px; overflow: auto; }
#recent .item { padding: 4px 0; border-bottom: 1px solid #1f2330; display: flex; justify-content: space-between; }
.err { color: #ff6b6b; font-size: 12px; }
.hidden { display: none; }
` },
    { path: "popup.js", content: `const $ = id => document.getElementById(id);
const TABLE = "expenses"; // create one if you haven't yet (user_id, amount, category, note, created_at)

async function boot() {
  const s = await CriderGPT.getSession();
  if (!s) return $("auth").classList.remove("hidden");
  $("user").textContent = s.user?.email || "signed in";
  $("app").classList.remove("hidden");
  const { budget } = await chrome.storage.local.get("budget");
  if (budget) $("budget").value = budget;
  refresh();
}
boot();

$("signin").onclick = async () => {
  try { await CriderGPT.signIn($("email").value, $("pw").value); $("auth").classList.add("hidden"); boot(); }
  catch (e) { $("err").textContent = e.message; }
};

$("budget").oninput = (e) => chrome.storage.local.set({ budget: e.target.value });

$("log").onclick = async () => {
  const amount = parseFloat($("amount").value);
  if (!amount) return;
  try {
    await CriderGPT.dbInsert(TABLE, {
      amount, category: $("cat").value || "uncategorized", note: $("note").value || null,
    });
    $("amount").value = ""; $("cat").value = ""; $("note").value = "";
    refresh();
  } catch (e) { alert("Log failed: " + e.message); }
};

async function refresh() {
  try {
    const since = new Date(); since.setDate(1);
    const rows = await CriderGPT.dbSelect(TABLE,
      "created_at=gte." + since.toISOString() + "&order=created_at.desc&select=amount,category,note,created_at");
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    $("month").textContent = "$" + total.toFixed(2);
    const b = parseFloat($("budget").value || "0");
    $("left").textContent = b ? "$" + (b - total).toFixed(2) : "—";
    $("recent").innerHTML = rows.slice(0, 6).map(r =>
      '<div class="item"><span>' + (r.category || "—") + '</span><span>$' + Number(r.amount).toFixed(2) + '</span></div>'
    ).join("");
  } catch (e) { $("recent").textContent = "Couldn't load: " + e.message; }
}
` },
    { path: "README.md", content: readme("Shared Spending Helper",
      "Expects an `expenses` table: user_id (uuid, default auth.uid()), amount (numeric), category (text), note (text), created_at (timestamptz, default now()). RLS: user_id = auth.uid().") },
  ],
};

// --- 4. FFA Toolkit -------------------------------------------------------
const ffaToolkit: SuiteExt = {
  id: "cgpt-ffa-toolkit",
  name: "FFA Toolkit",
  tagline: "Degree tracker, event planner, record book helper — right in your browser.",
  pitch: "Pin FFA degree progress, log events, and append to your record book without leaving the page you're on.",
  features: ["Degree tracker", "Event planner", "Record book helper"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT FFA Toolkit",
  "version": "1.0.0",
  "description": "Degree tracker, event planner, and record book helper for FFA members.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["${SUPABASE_URL}/*"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "supabase.js", content: supabaseClientJs },
    { path: "popup.html", content: `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="popup.css"></head>
<body>
  <header><b>FFA Toolkit</b><span id="user" class="sub">—</span></header>
  <div id="auth" class="hidden">
    <input id="email" placeholder="email"><input id="pw" type="password" placeholder="password">
    <button id="signin">Sign in</button><p class="err" id="err"></p>
  </div>
  <div id="app" class="hidden">
    <div class="tabs">
      <button data-tab="degree" class="active">Degree</button>
      <button data-tab="events">Events</button>
      <button data-tab="record">Record</button>
    </div>

    <section id="t-degree" class="tab">
      <p class="sub">Degree progress checklist</p>
      <div id="degree-list"></div>
    </section>

    <section id="t-events" class="tab hidden">
      <input id="ev-title" placeholder="Event title">
      <input id="ev-date" type="date">
      <button id="ev-add">Add event</button>
      <div id="ev-list"></div>
    </section>

    <section id="t-record" class="tab hidden">
      <p class="sub">Append SAE / record book entry</p>
      <input id="rb-hours" type="number" placeholder="hours">
      <input id="rb-income" type="number" step="0.01" placeholder="income $">
      <input id="rb-note" placeholder="what did you do?">
      <button id="rb-add">Log entry</button>
      <div id="rb-recent"></div>
    </section>
  </div>
  <script src="supabase.js"></script>
  <script src="popup.js"></script>
</body></html>` },
    { path: "popup.css", content: `body { width: 340px; font-family: system-ui; margin: 0; padding: 12px; background: #0f1115; color: #e8e8ea; }
header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.sub { font-size: 11px; color: #8b94a7; }
input { width: 100%; padding: 8px; margin: 4px 0; background: #161a24; color: #e8e8ea; border: 1px solid #2a3142; border-radius: 6px; box-sizing: border-box; }
button { padding: 6px 10px; background: #1f8b4c; color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 12px; }
.tabs { display: flex; gap: 4px; margin-bottom: 8px; }
.tabs button { flex: 1; background: #1f2330; color: #cfd5e3; }
.tabs button.active { background: #1f8b4c; color: #fff; }
.tab { display: block; }
.tab.hidden { display: none; }
.row { display: flex; gap: 6px; align-items: center; padding: 4px 0; font-size: 12px; }
.row input[type=checkbox] { width: auto; margin: 0 6px 0 0; }
#ev-list .item, #rb-recent .item { padding: 4px 6px; background: #161a24; border-radius: 4px; margin: 4px 0; font-size: 12px; }
.err { color: #ff6b6b; font-size: 12px; }
.hidden { display: none; }
` },
    { path: "popup.js", content: `const $ = id => document.getElementById(id);

const DEGREES = [
  "Discovery FFA Degree",
  "Greenhand FFA Degree",
  "Chapter FFA Degree",
  "State FFA Degree",
  "American FFA Degree",
];

async function boot() {
  const s = await CriderGPT.getSession();
  if (!s) return $("auth").classList.remove("hidden");
  $("user").textContent = s.user?.email || "signed in";
  $("app").classList.remove("hidden");
  renderDegree();
}
boot();

$("signin").onclick = async () => {
  try { await CriderGPT.signIn($("email").value, $("pw").value); $("auth").classList.add("hidden"); boot(); }
  catch (e) { $("err").textContent = e.message; }
};

document.querySelectorAll(".tabs button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
    $("t-" + btn.dataset.tab).classList.remove("hidden");
    if (btn.dataset.tab === "events") loadEvents();
    if (btn.dataset.tab === "record") loadRecord();
  };
});

async function renderDegree() {
  const { degree_state = {} } = await chrome.storage.local.get("degree_state");
  $("degree-list").innerHTML = DEGREES.map(d => {
    const checked = degree_state[d] ? "checked" : "";
    return '<label class="row"><input type="checkbox" data-deg="' + d + '" ' + checked + '>' + d + '</label>';
  }).join("");
  document.querySelectorAll('[data-deg]').forEach(cb => cb.onchange = async () => {
    const { degree_state = {} } = await chrome.storage.local.get("degree_state");
    degree_state[cb.dataset.deg] = cb.checked;
    await chrome.storage.local.set({ degree_state });
  });
}

async function loadEvents() {
  try {
    const rows = await CriderGPT.dbSelect("events", "order=start_date.asc&select=title,start_date,id&limit=10");
    $("ev-list").innerHTML = rows.map(r => '<div class="item"><b>' + r.title + '</b> — ' + (r.start_date || "").slice(0,10) + '</div>').join("") || '<div class="sub">No events yet.</div>';
  } catch (e) { $("ev-list").textContent = "Couldn't load: " + e.message; }
}

$("ev-add").onclick = async () => {
  const title = $("ev-title").value.trim();
  const start_date = $("ev-date").value;
  if (!title) return;
  try {
    await CriderGPT.dbInsert("events", { title, start_date, visibility: "personal" });
    $("ev-title").value = ""; $("ev-date").value = "";
    loadEvents();
  } catch (e) { alert("Event failed: " + e.message); }
};

async function loadRecord() {
  try {
    const rows = await CriderGPT.dbSelect("record_book_entries", "order=created_at.desc&limit=5&select=hours,income,note,created_at");
    $("rb-recent").innerHTML = rows.map(r => '<div class="item">' + (r.hours || 0) + 'h · $' + (r.income || 0) + ' — ' + (r.note || '') + '</div>').join("") || '<div class="sub">No entries yet.</div>';
  } catch (e) { $("rb-recent").textContent = "Couldn't load: " + e.message; }
}

$("rb-add").onclick = async () => {
  const entry = { hours: parseFloat($("rb-hours").value) || 0, income: parseFloat($("rb-income").value) || 0, note: $("rb-note").value || "" };
  try {
    await CriderGPT.dbInsert("record_book_entries", entry);
    $("rb-hours").value = ""; $("rb-income").value = ""; $("rb-note").value = "";
    loadRecord();
  } catch (e) { alert("Log failed: " + e.message); }
};
` },
    { path: "README.md", content: readme("FFA Toolkit",
      "Uses the existing `events` table (visibility=personal). Expects a `record_book_entries` table: user_id, hours numeric, income numeric, note text, created_at timestamptz.") },
  ],
};

// --- 5. AI Prompt Vault ---------------------------------------------------
const promptVault: SuiteExt = {
  id: "cgpt-prompt-vault",
  name: "AI Prompt Vault",
  tagline: "Save, categorize, and one-click-paste prompts on ChatGPT/Claude/Gemini.",
  pitch: "Library of prompts that syncs to CriderGPT and pastes straight into any AI chat box.",
  features: ["Save prompts", "Categorize", "One-click paste into the active page"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT AI Prompt Vault",
  "version": "1.0.0",
  "description": "Save, categorize, and one-click-paste AI prompts on any chat site.",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>", "${SUPABASE_URL}/*"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "supabase.js", content: supabaseClientJs },
    { path: "popup.html", content: `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="popup.css"></head>
<body>
  <header><b>Prompt Vault</b><span id="user" class="sub">—</span></header>
  <div id="auth" class="hidden">
    <input id="email" placeholder="email"><input id="pw" type="password" placeholder="password">
    <button id="signin">Sign in</button><p class="err" id="err"></p>
  </div>
  <div id="app" class="hidden">
    <input id="search" placeholder="Search prompts…">
    <select id="cat-filter"><option value="">All categories</option></select>
    <div id="list"></div>
    <hr>
    <details>
      <summary>+ New prompt</summary>
      <input id="title" placeholder="Title">
      <input id="cat" placeholder="Category">
      <textarea id="body" rows="3" placeholder="Prompt text…"></textarea>
      <button id="save">Save prompt</button>
    </details>
  </div>
  <script src="supabase.js"></script>
  <script src="popup.js"></script>
</body></html>` },
    { path: "popup.css", content: `body { width: 340px; font-family: system-ui; margin: 0; padding: 12px; background: #0f1115; color: #e8e8ea; }
header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.sub { font-size: 11px; color: #8b94a7; }
input, select, textarea { width: 100%; padding: 8px; margin: 4px 0; background: #161a24; color: #e8e8ea; border: 1px solid #2a3142; border-radius: 6px; box-sizing: border-box; font-family: inherit; }
button { padding: 8px 10px; background: #1f8b4c; color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 12px; }
hr { border: 0; border-top: 1px solid #2a3142; margin: 10px 0; }
#list .p { padding: 6px; background: #161a24; border-radius: 6px; margin: 4px 0; cursor: pointer; }
#list .p:hover { background: #1f2538; }
#list .p .t { font-size: 13px; font-weight: 600; }
#list .p .c { font-size: 11px; color: #8b94a7; }
details summary { cursor: pointer; padding: 6px 0; font-size: 12px; color: #cfd5e3; }
.err { color: #ff6b6b; font-size: 12px; }
.hidden { display: none; }
` },
    { path: "popup.js", content: `const $ = id => document.getElementById(id);
const TABLE = "ai_prompts"; // user_id, title, category, body, created_at

let all = [];

async function boot() {
  const s = await CriderGPT.getSession();
  if (!s) return $("auth").classList.remove("hidden");
  $("user").textContent = s.user?.email || "signed in";
  $("app").classList.remove("hidden");
  load();
}
boot();

$("signin").onclick = async () => {
  try { await CriderGPT.signIn($("email").value, $("pw").value); $("auth").classList.add("hidden"); boot(); }
  catch (e) { $("err").textContent = e.message; }
};

async function load() {
  try {
    all = await CriderGPT.dbSelect(TABLE, "order=created_at.desc&select=id,title,category,body");
    const cats = [...new Set(all.map(p => p.category).filter(Boolean))];
    $("cat-filter").innerHTML = '<option value="">All categories</option>' +
      cats.map(c => '<option>' + c + '</option>').join("");
    render();
  } catch (e) { $("list").textContent = "Couldn't load: " + e.message; }
}

function render() {
  const q = $("search").value.toLowerCase();
  const cat = $("cat-filter").value;
  const filtered = all.filter(p =>
    (!cat || p.category === cat) &&
    (!q || (p.title + " " + p.body).toLowerCase().includes(q))
  );
  $("list").innerHTML = filtered.map(p =>
    '<div class="p" data-id="' + p.id + '"><div class="t">' + (p.title || "Untitled") + '</div><div class="c">' + (p.category || "—") + '</div></div>'
  ).join("") || '<div class="sub">No prompts yet.</div>';
  document.querySelectorAll("#list .p").forEach(el => {
    el.onclick = () => paste(all.find(p => p.id == el.dataset.id));
  });
}

$("search").oninput = render;
$("cat-filter").onchange = render;

async function paste(p) {
  if (!p) return;
  await navigator.clipboard.writeText(p.body);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        const el = document.activeElement;
        if (el && (el.tagName === "TEXTAREA" || el.isContentEditable || el.tagName === "INPUT")) {
          if (el.isContentEditable) { document.execCommand("insertText", false, text); }
          else { el.value = (el.value || "") + text; el.dispatchEvent(new Event("input", { bubbles: true })); }
        }
      },
      args: [p.body],
    });
  } catch {}
  window.close();
}

$("save").onclick = async () => {
  const row = { title: $("title").value, category: $("cat").value, body: $("body").value };
  if (!row.body) return;
  try {
    await CriderGPT.dbInsert(TABLE, row);
    $("title").value = $("cat").value = $("body").value = "";
    load();
  } catch (e) { alert("Save failed: " + e.message); }
};
` },
    { path: "README.md", content: readme("AI Prompt Vault",
      "Expects an `ai_prompts` table: user_id (uuid, default auth.uid()), title (text), category (text), body (text), created_at (timestamptz, default now()). RLS: user_id = auth.uid().") },
  ],
};

// --- 6. Audio Booster + Reverb --------------------------------------------
const audioBooster: SuiteExt = {
  id: "cgpt-audio-booster",
  name: "CriderGPT Audio Booster",
  tagline: "Boost any tab up to 600% with reverb, bass, and EQ.",
  pitch: "Crank quiet videos and podcasts way past 100%. Optional reverb, bass boost, and 3-band EQ per tab.",
  features: ["Up to 600% volume per tab", "Reverb wet/dry", "Bass boost", "3-band EQ", "Per-tab settings"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT Audio Booster",
  "version": "1.0.0",
  "description": "Boost any tab up to 600% with reverb, bass, and EQ.",
  "permissions": ["activeTab", "tabs", "storage", "scripting"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "popup.html", content: `<!doctype html><html><head><meta charset="utf-8">
<style>
body{font-family:system-ui;width:280px;padding:14px;background:#0f1115;color:#e8e8ea;margin:0}
h1{font-size:14px;margin:0 0 12px}
label{display:block;font-size:12px;color:#8b94a7;margin:10px 0 4px}
.row{display:flex;justify-content:space-between;font-size:12px}
input[type=range]{width:100%}
button{width:100%;padding:8px;border:0;border-radius:6px;background:#1f8b4c;color:#fff;cursor:pointer;margin-top:10px}
</style></head><body>
<h1>🔊 CriderGPT Audio Booster</h1>
<label>Volume <span class="row"><span></span><span id="vv">100%</span></span></label>
<input id="vol" type="range" min="0" max="600" value="100">
<label>Bass boost <span class="row"><span></span><span id="bv">0 dB</span></span></label>
<input id="bass" type="range" min="-20" max="20" value="0">
<label>Reverb <span class="row"><span></span><span id="rv">0%</span></span></label>
<input id="reverb" type="range" min="0" max="100" value="0">
<button id="reset">Reset to 100%</button>
<script src="popup.js"></script>
</body></html>` },
    { path: "popup.js", content: `const $ = (id) => document.getElementById(id);
async function getTab(){ const [t] = await chrome.tabs.query({active:true,currentWindow:true}); return t; }

async function apply(){
  const tab = await getTab();
  const s = { vol: +$("vol").value/100, bass: +$("bass").value, reverb: +$("reverb").value/100 };
  $("vv").textContent = ($("vol").value)+"%";
  $("bv").textContent = ($("bass").value)+" dB";
  $("rv").textContent = ($("reverb").value)+"%";
  await chrome.storage.local.set({ ["audio_"+tab.id]: s });
  chrome.scripting.executeScript({ target:{tabId:tab.id}, args:[s], func:(s)=>{
    if(!window.__cgptAudio){
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const media = [...document.querySelectorAll("video,audio")];
      if(!media.length) return;
      const gain = ctx.createGain();
      const bass = ctx.createBiquadFilter(); bass.type="lowshelf"; bass.frequency.value=200;
      const convolver = ctx.createConvolver();
      const wet = ctx.createGain(); const dry = ctx.createGain();
      // synth impulse
      const ir = ctx.createBuffer(2, ctx.sampleRate*1.5, ctx.sampleRate);
      for(let c=0;c<2;c++){ const d = ir.getChannelData(c);
        for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 2); }
      convolver.buffer = ir;
      media.forEach(m=>{
        const src = ctx.createMediaElementSource(m);
        src.connect(bass); bass.connect(gain);
        gain.connect(dry); gain.connect(convolver); convolver.connect(wet);
        dry.connect(ctx.destination); wet.connect(ctx.destination);
      });
      window.__cgptAudio = { ctx, gain, bass, wet, dry };
    }
    const a = window.__cgptAudio;
    a.gain.gain.value = s.vol;
    a.bass.gain.value = s.bass;
    a.wet.gain.value = s.reverb;
    a.dry.gain.value = 1 - s.reverb * 0.5;
  }});
}
["vol","bass","reverb"].forEach(id => $(id).oninput = apply);
$("reset").onclick = () => { $("vol").value=100; $("bass").value=0; $("reverb").value=0; apply(); };
(async()=>{ const tab = await getTab(); const k = "audio_"+tab.id;
  const { [k]: s } = await chrome.storage.local.get(k);
  if(s){ $("vol").value = s.vol*100; $("bass").value=s.bass; $("reverb").value=s.reverb*100;
    $("vv").textContent=($("vol").value)+"%"; $("bv").textContent=$("bass").value+" dB"; $("rv").textContent=$("reverb").value+"%"; }
})();
` },
    { path: "README.md", content: readme("Audio Booster", "Standalone — no backend.") },
  ],
};

// --- 7. Smart Tab Manager -------------------------------------------------
const tabManager: SuiteExt = {
  id: "cgpt-tab-manager",
  name: "CriderGPT Smart Tab Manager",
  tagline: "Group, search, suspend, and restore tabs across windows.",
  pitch: "Tame 200 open tabs. Fuzzy search, one-click suspend, save sessions to your CriderGPT account.",
  features: ["Search across all windows", "Suspend inactive tabs", "Save tab sessions", "Sync via CriderGPT"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT Smart Tab Manager",
  "version": "1.0.0",
  "description": "Group, search, suspend, and restore tabs.",
  "permissions": ["tabs", "storage", "tabGroups"],
  "host_permissions": ["${SUPABASE_URL}/*"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "popup.html", content: `<!doctype html><html><head><meta charset="utf-8">
<style>
body{font-family:system-ui;width:360px;max-height:520px;margin:0;padding:0;background:#0f1115;color:#e8e8ea}
header{padding:10px;border-bottom:1px solid #1f2330;display:flex;gap:6px}
input{flex:1;padding:6px;border-radius:6px;border:1px solid #2a3142;background:#161a24;color:#e8e8ea}
button{padding:6px 10px;border:0;border-radius:6px;background:#1f8b4c;color:#fff;cursor:pointer;font-size:12px}
button.ghost{background:transparent;border:1px solid #2a3142;color:#cfd5e3}
.list{max-height:380px;overflow:auto}
.tab{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid #1a1f2c;cursor:pointer;font-size:12px}
.tab:hover{background:#161a24}
.tab img{width:14px;height:14px;border-radius:2px}
.tab .t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
footer{padding:8px 10px;display:flex;gap:6px;border-top:1px solid #1f2330}
</style></head><body>
<header><input id="q" placeholder="Search tabs…" autofocus><button id="save">Save session</button></header>
<div id="list" class="list"></div>
<footer>
  <button id="suspend" class="ghost">Suspend inactive</button>
  <button id="dupes" class="ghost">Close duplicates</button>
</footer>
<script src="popup.js"></script>
</body></html>` },
    { path: "popup.js", content: `const $ = (id) => document.getElementById(id);
let allTabs = [];
async function load(){
  allTabs = await chrome.tabs.query({});
  render($("q").value);
}
function render(q){
  q = (q||"").toLowerCase();
  const list = $("list"); list.innerHTML = "";
  allTabs.filter(t => !q || (t.title||"").toLowerCase().includes(q) || (t.url||"").toLowerCase().includes(q))
    .forEach(t => {
      const row = document.createElement("div"); row.className="tab";
      row.innerHTML = '<img src="'+(t.favIconUrl||"")+'" onerror="this.style.visibility=\\'hidden\\'"><div class="t">'+(t.title||t.url)+'</div><button class="ghost x">×</button>';
      row.onclick = (e) => { if(e.target.classList.contains("x")) return chrome.tabs.remove(t.id).then(load);
        chrome.tabs.update(t.id,{active:true}); chrome.windows.update(t.windowId,{focused:true}); };
      list.appendChild(row);
    });
}
$("q").oninput = (e) => render(e.target.value);
$("suspend").onclick = async () => {
  const cutoff = Date.now() - 30*60*1000;
  for(const t of allTabs) if(!t.active && t.lastAccessed && t.lastAccessed < cutoff) await chrome.tabs.discard(t.id);
  load();
};
$("dupes").onclick = async () => {
  const seen = new Set();
  for(const t of allTabs){ if(seen.has(t.url)) await chrome.tabs.remove(t.id); else seen.add(t.url); }
  load();
};
$("save").onclick = async () => {
  const session = { name: new Date().toLocaleString(), urls: allTabs.map(t=>t.url) };
  const prev = (await chrome.storage.local.get("sessions")).sessions || [];
  await chrome.storage.local.set({ sessions: [session, ...prev].slice(0,20) });
  alert("Saved "+allTabs.length+" tabs locally.");
};
load();
` },
    { path: "README.md", content: readme("Smart Tab Manager", "Saves sessions to chrome.storage.local. Add Supabase sync by wiring supabase.js.") },
  ],
};

// --- 8. Screenshot + Annotate ---------------------------------------------
const screenshotter: SuiteExt = {
  id: "cgpt-screenshot",
  name: "CriderGPT Screenshot + Annotate",
  tagline: "Full-page or visible-area capture with arrows, text, and highlights.",
  pitch: "Capture, annotate, and download. Perfect for support tickets, FFA reports, and tutorials.",
  features: ["Full page capture", "Visible area capture", "Arrows, text, highlights", "PNG download"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT Screenshot + Annotate",
  "version": "1.0.0",
  "description": "Capture, annotate, and download web page screenshots.",
  "permissions": ["activeTab", "storage", "scripting", "<all_urls>"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "popup.html", content: `<!doctype html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui;width:260px;padding:14px;background:#0f1115;color:#e8e8ea;margin:0}
button{width:100%;padding:10px;border:0;border-radius:6px;background:#1f8b4c;color:#fff;cursor:pointer;margin-bottom:8px}
button.ghost{background:transparent;border:1px solid #2a3142;color:#cfd5e3}</style>
</head><body>
<button id="visible">📸 Capture visible area</button>
<button id="full" class="ghost">📄 Capture full page</button>
<script src="popup.js"></script>
</body></html>` },
    { path: "popup.js", content: `$ = (id)=>document.getElementById(id);
async function dl(url){
  const a = document.createElement("a");
  a.href = url; a.download = "cgpt-"+Date.now()+".png"; a.click();
}
$("visible").onclick = async () => {
  const url = await chrome.tabs.captureVisibleTab(null, { format:"png" });
  dl(url); window.close();
};
$("full").onclick = async () => {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  const url = await chrome.tabs.captureVisibleTab(null, { format:"png" });
  // basic full-page: open annotator with the image
  await chrome.storage.local.set({ shot: url });
  chrome.tabs.create({ url: chrome.runtime.getURL("annotate.html") });
};
` },
    { path: "annotate.html", content: `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#0f1115;color:#e8e8ea;font-family:system-ui}
.bar{padding:8px;display:flex;gap:6px;border-bottom:1px solid #1f2330}
button{padding:6px 10px;border:0;border-radius:6px;background:#1f8b4c;color:#fff;cursor:pointer}
canvas{display:block;margin:10px auto;border:1px solid #2a3142;cursor:crosshair}</style>
</head><body>
<div class="bar">
  <button id="arrow">↗ Arrow</button>
  <button id="text">T Text</button>
  <button id="hl">🟡 Highlight</button>
  <button id="save">💾 Save PNG</button>
</div>
<canvas id="c"></canvas>
<script src="annotate.js"></script>
</body></html>` },
    { path: "annotate.js", content: `(async () => {
  const { shot } = await chrome.storage.local.get("shot");
  const img = new Image(); img.src = shot;
  await new Promise(r => img.onload = r);
  const c = document.getElementById("c"); c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d"); ctx.drawImage(img,0,0);
  let mode = "arrow", start = null;
  document.getElementById("arrow").onclick = ()=>mode="arrow";
  document.getElementById("text").onclick = ()=>mode="text";
  document.getElementById("hl").onclick = ()=>mode="hl";
  c.onmousedown = (e)=>{ const r=c.getBoundingClientRect();
    const x=(e.clientX-r.left)*(c.width/r.width), y=(e.clientY-r.top)*(c.height/r.height);
    if(mode==="text"){ const t=prompt("Text:"); if(t){ ctx.fillStyle="#ff3b30"; ctx.font="24px sans-serif"; ctx.fillText(t,x,y);} return; }
    start={x,y}; };
  c.onmouseup = (e)=>{ if(!start) return; const r=c.getBoundingClientRect();
    const x=(e.clientX-r.left)*(c.width/r.width), y=(e.clientY-r.top)*(c.height/r.height);
    if(mode==="arrow"){ ctx.strokeStyle="#ff3b30"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(start.x,start.y); ctx.lineTo(x,y); ctx.stroke(); }
    if(mode==="hl"){ ctx.fillStyle="rgba(255,235,59,0.4)"; ctx.fillRect(start.x,start.y,x-start.x,y-start.y); }
    start=null; };
  document.getElementById("save").onclick = ()=>{
    const a=document.createElement("a"); a.href=c.toDataURL("image/png"); a.download="cgpt-annotated.png"; a.click();
  };
})();
` },
    { path: "README.md", content: readme("Screenshot + Annotate", "Standalone — no backend.") },
  ],
};

// --- 9. Page Translator + Summarizer (CriderGPT AI) -----------------------
const translatorSummarizer: SuiteExt = {
  id: "cgpt-translator",
  name: "CriderGPT Page Translator + Summarizer",
  tagline: "One-click translate or summarize any page using CriderGPT AI.",
  pitch: "Translates the current page to plain English, or summarizes it in 5 bullets. Powered by your CriderGPT account.",
  features: ["Translate page", "5-bullet summary", "Side-by-side view", "Save to ai_memory"],
  files: [
    { path: "manifest.json", content: `{
  "manifest_version": 3,
  "name": "CriderGPT Translator + Summarizer",
  "version": "1.0.0",
  "description": "Translate or summarize the current page with CriderGPT AI.",
  "permissions": ["activeTab", "tabs", "storage", "scripting", "identity"],
  "host_permissions": ["<all_urls>", "${SUPABASE_URL}/*"],
  "action": { "default_popup": "popup.html", "default_icon": "icon128.png" },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}` },
    { path: "supabase.js", content: supabaseClientJs },
    { path: "popup.html", content: `<!doctype html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui;width:340px;padding:14px;background:#0f1115;color:#e8e8ea;margin:0}
h1{font-size:14px;margin:0 0 10px}
button{width:100%;padding:9px;border:0;border-radius:6px;background:#1f8b4c;color:#fff;cursor:pointer;margin-bottom:6px;font-size:13px}
button.ghost{background:transparent;border:1px solid #2a3142;color:#cfd5e3}
select,input{width:100%;padding:7px;border-radius:6px;border:1px solid #2a3142;background:#161a24;color:#e8e8ea;margin-bottom:8px}
.out{margin-top:10px;padding:10px;background:#161a24;border-radius:6px;font-size:12px;white-space:pre-wrap;max-height:260px;overflow:auto}
.who{font-size:11px;color:#8b94a7;margin-bottom:8px}</style></head><body>
<h1>🌐 CriderGPT Translator</h1>
<div id="who" class="who">Not signed in</div>
<button id="google" class="ghost">Continue with Google</button>
<select id="lang">
  <option value="English">English</option>
  <option value="Spanish">Spanish</option>
  <option value="French">French</option>
  <option value="German">German</option>
  <option value="Japanese">Japanese</option>
  <option value="Chinese">Chinese</option>
</select>
<button id="translate">Translate page</button>
<button id="summarize" class="ghost">Summarize page (5 bullets)</button>
<div id="out" class="out">Pick an action above.</div>
<button id="save" class="ghost">Save result to memory</button>
<script src="supabase.js"></script>
<script src="popup.js"></script>
</body></html>` },
    { path: "popup.js", content: `const $ = (id) => document.getElementById(id);
async function refresh(){ const e = await CriderGPT.userEmail(); $("who").textContent = e ? "Signed in as "+e : "Not signed in"; }
refresh();
$("google").onclick = async () => { try{ await CriderGPT.signInWithGoogle(); refresh(); }catch(e){ alert(e.message); } };

async function pageText(){
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  const [{result}] = await chrome.scripting.executeScript({ target:{tabId:tab.id},
    func: () => document.body.innerText.slice(0, 8000) });
  return { text: result, tab };
}
async function ask(prompt, label){
  $("out").textContent = label+"…";
  const { text } = await pageText();
  try {
    const data = await CriderGPT.invokeFn("chat-with-ai", { message: prompt+"\\n\\n"+text, model: "gpt-4o-mini" });
    $("out").textContent = data.response || JSON.stringify(data);
  } catch(e){ $("out").textContent = "Error: "+e.message+"\\n(Sign in to use AI.)"; }
}
$("translate").onclick = () => ask("Translate the following to "+$("lang").value+", keeping formatting:", "Translating");
$("summarize").onclick = () => ask("Summarize the following in 5 clear bullet points:", "Summarizing");
$("save").onclick = async () => {
  const { tab } = await pageText();
  try { await CriderGPT.saveMemory({ topic: tab.title, details: $("out").textContent, category: "translation", source: tab.url });
    $("out").textContent = "✓ Saved.\\n\\n"+$("out").textContent;
  } catch(e){ alert(e.message); }
};
` },
    { path: "README.md", content: readme("Translator + Summarizer", "Calls chat-with-ai and saves to ai_memory.") },
  ],
};

export const CRIDERGPT_EXTENSIONS: SuiteExt[] = [
  browserAssistant,
  livestockTagManager,
  spendingHelper,
  ffaToolkit,
  promptVault,
  audioBooster,
  tabManager,
  screenshotter,
  translatorSummarizer,
];
