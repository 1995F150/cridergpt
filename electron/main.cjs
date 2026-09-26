// CriderGPT Desktop — Electron main process
const { app, BrowserWindow, shell, Menu, ipcMain, safeStorage } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const isDev = !app.isPackaged;
const DEFAULT_LAN_URL = 'http://10.42.0.1:8000';

function trustedDevelopmentOrigin() {
  try {
    return new URL(process.env.CRIDERGPT_DEV_URL || 'https://cridergpt.lovable.app').origin;
  } catch {
    return 'https://cridergpt.lovable.app';
  }
}

function assertTrustedRenderer(event) {
  const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  const trusted = app.isPackaged
    ? senderUrl.startsWith('file://')
    : senderUrl.startsWith(trustedDevelopmentOrigin());
  if (!trusted) throw new Error('Desktop LAN requests are only available to the CriderGPT app.');
}

function lanConfigPath() {
  return path.join(app.getPath('userData'), 'lan-connection.json');
}

function normalizeLanBaseUrl(raw) {
  const value = String(raw || '').trim();
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('The LAN Engine URL must use HTTP or HTTPS.');
  }

  let pathname = url.pathname.replace(/\/+$/, '');
  pathname = pathname.replace(/\/(?:api\/)?chat(?:-with-ai)?$/i, '');
  url.pathname = pathname || '/';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function endpointFor(baseUrl, suffix) {
  const base = new URL(normalizeLanBaseUrl(baseUrl));
  base.pathname = `${base.pathname.replace(/\/$/, '')}/${suffix}`;
  return base.toString();
}

async function readLanConfig() {
  try {
    const raw = await fs.readFile(lanConfigPath(), 'utf8');
    const saved = JSON.parse(raw);
    return {
      baseUrl: normalizeLanBaseUrl(saved.baseUrl || DEFAULT_LAN_URL),
      enabled: saved.enabled === true,
      fallbackToCloud: saved.fallbackToCloud === true,
      encryptedApiKey: typeof saved.encryptedApiKey === 'string' ? saved.encryptedApiKey : '',
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('[desktop-lan] unable to read saved configuration');
    return {
      baseUrl: DEFAULT_LAN_URL,
      enabled: false,
      fallbackToCloud: false,
      encryptedApiKey: '',
    };
  }
}

function decryptApiKey(config) {
  if (!config.encryptedApiKey) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows secure storage is unavailable.');
  }
  return safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'));
}

function profileFromConfig(config) {
  return {
    available: true,
    enabled: config.enabled,
    baseUrl: config.baseUrl,
    fallbackToCloud: config.fallbackToCloud,
    hasApiKey: Boolean(config.encryptedApiKey),
  };
}

function engineHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };
}

async function requestEngine(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function saveLanConfig(input) {
  const current = await readLanConfig();
  const next = {
    baseUrl: normalizeLanBaseUrl(input?.baseUrl || current.baseUrl),
    enabled: input?.enabled === true,
    fallbackToCloud: input?.fallbackToCloud === true,
    encryptedApiKey: current.encryptedApiKey,
  };

  if (typeof input?.apiKey === 'string' && input.apiKey.trim()) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Windows secure storage is unavailable.');
    }
    next.encryptedApiKey = safeStorage.encryptString(input.apiKey.trim()).toString('base64');
  }

  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(lanConfigPath(), JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
  return profileFromConfig(next);
}

async function testLanConnection() {
  const config = await readLanConfig();
  const apiKey = decryptApiKey(config);
  const startedAt = Date.now();
  let healthStatus = null;
  let authStatus = null;

  try {
    const health = await requestEngine(endpointFor(config.baseUrl, 'health'), {
      headers: engineHeaders(apiKey),
    });
    healthStatus = health.status;
    if (!health.ok) {
      return { ok: false, healthStatus, authStatus, latencyMs: Date.now() - startedAt, error: `Engine health returned HTTP ${health.status}.` };
    }

    if (apiKey) {
      const auth = await requestEngine(endpointFor(config.baseUrl, 'auth/check'), {
        headers: engineHeaders(apiKey),
      });
      authStatus = auth.status;
      if (!auth.ok) {
        return { ok: false, healthStatus, authStatus, latencyMs: Date.now() - startedAt, error: `Engine authentication returned HTTP ${auth.status}.` };
      }
    }

    return {
      ok: Boolean(apiKey),
      healthStatus,
      authStatus,
      latencyMs: Date.now() - startedAt,
      error: apiKey ? undefined : 'Add the Engine API key before sending LAN chat.',
    };
  } catch (error) {
    return {
      ok: false,
      healthStatus,
      authStatus,
      latencyMs: Date.now() - startedAt,
      error: error?.name === 'AbortError' ? 'The LAN Engine did not respond before the timeout.' : 'The LAN Engine could not be reached.',
    };
  }
}

async function sendLanChat(payload) {
  const config = await readLanConfig();
  if (!config.enabled) throw new Error('Desktop LAN mode is disabled.');

  const apiKey = decryptApiKey(config);
  const startedAt = Date.now();
  const response = await requestEngine(endpointFor(config.baseUrl, 'chat'), {
    method: 'POST',
    headers: engineHeaders(apiKey),
    body: JSON.stringify({
      message: typeof payload?.message === 'string' ? payload.message : '',
      system_prompt: typeof payload?.system_prompt === 'string' ? payload.system_prompt : undefined,
      conversation_history: Array.isArray(payload?.conversation_history) ? payload.conversation_history.slice(-20) : [],
      user_id: typeof payload?.user_id === 'string' ? payload.user_id : null,
      conversation_id: typeof payload?.conversation_id === 'string' ? payload.conversation_id : null,
      model: typeof payload?.model === 'string' ? payload.model : null,
      temperature: typeof payload?.temperature === 'number' ? payload.temperature : 0.7,
      max_tokens: typeof payload?.max_tokens === 'number' ? payload.max_tokens : 2000,
    }),
  }, 120000);

  if (!response.ok) {
    throw new Error(`LAN Engine returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const text = data?.response ?? data?.reply ?? data?.text ?? data?.message;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('LAN Engine returned an empty response.');
  }

  return {
    response: text,
    model: typeof data?.model === 'string' ? data.model : undefined,
    conversation_id: data?.conversation_id,
    latency_ms: Date.now() - startedAt,
    source: 'desktop-lan',
  };
}

ipcMain.handle('desktop-lan:profile', async (event) => {
  assertTrustedRenderer(event);
  return profileFromConfig(await readLanConfig());
});
ipcMain.handle('desktop-lan:save', async (event, input) => {
  assertTrustedRenderer(event);
  return saveLanConfig(input);
});
ipcMain.handle('desktop-lan:test', async (event) => {
  assertTrustedRenderer(event);
  return testLanConnection();
});
ipcMain.handle('desktop-lan:chat', async (event, payload) => {
  assertTrustedRenderer(event);
  return sendLanChat(payload);
});
ipcMain.handle('desktop-lan:clear', async (event) => {
  assertTrustedRenderer(event);
  try {
    await fs.unlink(lanConfigPath());
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return profileFromConfig(await readLanConfig());
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'CriderGPT',
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    // Use a local Vite server when explicitly provided; otherwise keep the
    // existing live preview behavior.
    win.loadURL(process.env.CRIDERGPT_DEV_URL || 'https://cridergpt.lovable.app');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Open external links in the system browser instead of a new Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
