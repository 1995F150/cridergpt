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

export const CRIDERGPT_EXTENSIONS: SuiteExt[] = [
  browserAssistant,
  livestockTagManager,
  spendingHelper,
  ffaToolkit,
  promptVault,
];
