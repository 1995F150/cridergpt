import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Python file contents ───

const PYTHON_FILES: { name: string; content: string }[] = [
  {
    name: 'requirements.txt',
    content: `requests>=2.31.0
python-dotenv>=1.0.0
pillow>=10.0.0
pyautogui>=0.9.54
psutil>=5.9.0`,
  },
  {
    name: 'config.py',
    content: `"""CriderGPT Agent – Configuration loader."""
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("CRIDERGPT_API_URL", "https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/agent-poll")
API_KEY = os.getenv("CRIDERGPT_API_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10"))  # seconds
VISION_ENABLED = os.getenv("VISION_ENABLED", "false").lower() == "true"
VISION_INTERVAL = int(os.getenv("VISION_INTERVAL", "30"))  # seconds
AUTHORIZED_KEYWORDS = [kw.strip() for kw in os.getenv("AUTHORIZED_KEYWORDS", "agent_mode,pc_agent").split(",")]
`,
  },
  {
    name: 'auth.py',
    content: `"""CriderGPT Agent – Authentication helpers."""
import requests
from config import API_URL, API_KEY, SUPABASE_ANON_KEY


def get_headers() -> dict:
    """Return auth headers for API requests."""
    return {
        "Authorization": f"Bearer {API_KEY}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }


def test_connection() -> bool:
    """Send a heartbeat to verify connectivity."""
    try:
        resp = requests.post(
            API_URL,
            json={"action": "heartbeat", "agent_version": "1.0.0"},
            headers=get_headers(),
            timeout=15,
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"[auth] Connection test failed: {e}")
        return False
`,
  },
  {
    name: 'executor.py',
    content: `"""CriderGPT Agent – Local command executor."""
import subprocess
import webbrowser
import os
from config import AUTHORIZED_KEYWORDS


def is_authorized(command: str, keyword: str) -> bool:
    """Check if the command contains an authorized keyword."""
    cmd_lower = command.lower()
    if keyword and keyword.lower() in [k.lower() for k in AUTHORIZED_KEYWORDS]:
        return True
    return any(kw.lower() in cmd_lower for kw in AUTHORIZED_KEYWORDS)


def execute(task: dict) -> dict:
    """
    Execute a task dict from the agent queue.
    Returns {"output": ..., "error": ...}
    """
    command = task.get("command", "")
    keyword = task.get("keyword", "")

    if not is_authorized(command, keyword):
        return {"output": None, "error": "Keyword authorization failed"}

    try:
        # URL opening
        if command.strip().startswith("http://") or command.strip().startswith("https://"):
            webbrowser.open(command.strip())
            return {"output": f"Opened URL: {command.strip()}", "error": None}

        # File read
        if command.lower().startswith("read_file "):
            path = command[10:].strip()
            if os.path.isfile(path):
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read(50_000)  # cap at 50KB
                return {"output": content, "error": None}
            return {"output": None, "error": f"File not found: {path}"}

        # Shell command (subprocess)
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=os.path.expanduser("~"),
        )
        return {
            "output": result.stdout[-10_000:] if result.stdout else "",
            "error": result.stderr[-5_000:] if result.stderr else None,
            "exit_code": result.returncode,
        }

    except subprocess.TimeoutExpired:
        return {"output": None, "error": "Command timed out (120s)"}
    except Exception as e:
        return {"output": None, "error": str(e)}
`,
  },
  {
    name: 'vision.py',
    content: `"""CriderGPT Agent – Vision capture (read-only)."""
import base64
import io
import time
import requests

try:
    import pyautogui
    from PIL import Image
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False

from config import API_URL, VISION_INTERVAL
from auth import get_headers


def get_active_window_name() -> str:
    """Return the name of the currently active window."""
    try:
        import psutil
        # pyautogui doesn't expose window title on all OS; fall back gracefully
        if hasattr(pyautogui, "getActiveWindowTitle"):
            return pyautogui.getActiveWindowTitle() or "unknown"
    except Exception:
        pass
    return "unknown"


def capture_screenshot() -> str | None:
    """Capture screen and return base64 PNG string."""
    if not VISION_AVAILABLE:
        return None
    try:
        screenshot = pyautogui.screenshot()
        # Resize to save bandwidth
        screenshot = screenshot.resize((1280, 720), Image.LANCZOS)
        buf = io.BytesIO()
        screenshot.save(buf, format="PNG", optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        print(f"[vision] Screenshot failed: {e}")
        return None


def send_screenshot():
    """Capture and upload a screenshot to the API."""
    b64 = capture_screenshot()
    if not b64:
        return
    try:
        requests.post(
            API_URL,
            json={
                "action": "vision_upload",
                "screenshot_base64": b64,
                "metadata": {
                    "active_window": get_active_window_name(),
                    "timestamp": time.time(),
                },
            },
            headers=get_headers(),
            timeout=30,
        )
    except Exception as e:
        print(f"[vision] Upload failed: {e}")


def vision_loop(stop_event):
    """Background loop that captures screenshots at intervals."""
    while not stop_event.is_set():
        send_screenshot()
        stop_event.wait(VISION_INTERVAL)
`,
  },
  {
    name: 'poller.py',
    content: `"""CriderGPT Agent – Task poller."""
import time
import requests
from config import API_URL, POLL_INTERVAL
from auth import get_headers
from executor import execute


def poll_once() -> list:
    """Fetch pending tasks from the API."""
    try:
        resp = requests.post(
            API_URL,
            json={"action": "poll"},
            headers=get_headers(),
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json().get("tasks", [])
        print(f"[poller] Poll returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"[poller] Poll error: {e}")
    return []


def report_result(task_id: str, result: dict, status: str = "completed"):
    """Send task result back to the API."""
    try:
        requests.post(
            API_URL,
            json={
                "action": "report",
                "task_id": task_id,
                "result": result,
                "status": status,
            },
            headers=get_headers(),
            timeout=15,
        )
    except Exception as e:
        print(f"[poller] Report error: {e}")


def send_heartbeat():
    """Notify the API that the agent is alive."""
    try:
        resp = requests.post(
            API_URL,
            json={"action": "heartbeat", "agent_version": "1.0.0"},
            headers=get_headers(),
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("kill_tasks", [])
    except Exception as e:
        print(f"[poller] Heartbeat error: {e}")
    return []


def poll_loop(stop_event):
    """Main polling loop."""
    heartbeat_counter = 0
    while not stop_event.is_set():
        # Heartbeat every 3 poll cycles
        heartbeat_counter += 1
        if heartbeat_counter % 3 == 0:
            kill_tasks = send_heartbeat()
            if kill_tasks:
                print(f"[poller] Kill switch activated for {len(kill_tasks)} tasks")

        tasks = poll_once()
        for task in tasks:
            if stop_event.is_set():
                break
            task_id = task.get("id")
            print(f"[poller] Executing task {task_id}: {task.get('command', '')[:80]}")
            result = execute(task)
            status = "failed" if result.get("error") else "completed"
            report_result(task_id, result, status)
            print(f"[poller] Task {task_id} -> {status}")

        stop_event.wait(POLL_INTERVAL)
`,
  },
  {
    name: 'agent.py',
    content: `"""
CriderGPT Local Agent – Main Entry Point
==========================================
Starts the poller + optional vision loop.
Handles graceful shutdown.

To run:
    python agent.py

To build EXE (PyInstaller):
    pip install pyinstaller
    pyinstaller --onefile --name CriderGPT-Agent agent.py
"""
import signal
import sys
import threading
from auth import test_connection
from poller import poll_loop
from config import VISION_ENABLED

stop_event = threading.Event()


def shutdown(signum=None, frame=None):
    print("\\n[agent] Shutting down...")
    stop_event.set()


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)


def main():
    print("=" * 50)
    print("  CriderGPT Local Agent v1.0")
    print("=" * 50)

    # Test connection
    print("[agent] Testing API connection...")
    if not test_connection():
        print("[agent] ERROR: Cannot reach CriderGPT API. Check your .env config.")
        sys.exit(1)
    print("[agent] Connected successfully!")

    # Start poller thread
    poller_thread = threading.Thread(target=poll_loop, args=(stop_event,), daemon=True)
    poller_thread.start()
    print("[agent] Poller started.")

    # Start vision thread if enabled
    if VISION_ENABLED:
        from vision import vision_loop
        vision_thread = threading.Thread(target=vision_loop, args=(stop_event,), daemon=True)
        vision_thread.start()
        print("[agent] Vision capture started.")
    else:
        print("[agent] Vision capture disabled.")

    print("[agent] Agent is running. Press Ctrl+C to stop.\\n")

    # Block until stop
    try:
        while not stop_event.is_set():
            stop_event.wait(1)
    except KeyboardInterrupt:
        shutdown()

    print("[agent] Agent stopped.")


if __name__ == "__main__":
    main()
`,
  },
  {
    name: 'gui_agent.py',
    content: `"""
CriderGPT Agent – Desktop GUI (tkinter)
=========================================
Provides a simple UI for:
  - Entering / saving API key to .env
  - Toggling agent on/off
  - Viewing connection status & recent tasks

Run:  python gui_agent.py
"""
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import os
import sys

# Ensure we can import sibling modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv, set_key

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

class CriderGPTAgentGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("CriderGPT Agent Controller")
        self.root.geometry("520x440")
        self.root.resizable(False, False)

        self.agent_running = False
        self.stop_event = threading.Event()
        self.agent_thread = None

        self._build_ui()
        self._load_env()

    def _build_ui(self):
        # Header
        hdr = tk.Frame(self.root, bg="#1a1a2e", height=50)
        hdr.pack(fill="x")
        tk.Label(hdr, text="CriderGPT Agent", fg="#1f8b4c", bg="#1a1a2e",
                 font=("Segoe UI", 16, "bold")).pack(pady=10)

        # API Key
        frm = ttk.LabelFrame(self.root, text="API Configuration", padding=10)
        frm.pack(fill="x", padx=10, pady=5)
        ttk.Label(frm, text="API Key:").grid(row=0, column=0, sticky="w")
        self.api_entry = ttk.Entry(frm, width=50, show="*")
        self.api_entry.grid(row=0, column=1, padx=5)
        ttk.Button(frm, text="Save", command=self._save_api_key).grid(row=0, column=2)

        # Status
        sfrm = ttk.LabelFrame(self.root, text="Status", padding=10)
        sfrm.pack(fill="x", padx=10, pady=5)
        self.status_var = tk.StringVar(value="Offline")
        self.status_label = ttk.Label(sfrm, textvariable=self.status_var,
                                       font=("Segoe UI", 12, "bold"))
        self.status_label.pack(anchor="w")

        self.conn_var = tk.StringVar(value="Not connected")
        ttk.Label(sfrm, textvariable=self.conn_var).pack(anchor="w")

        # Controls
        cfrm = tk.Frame(self.root, pady=10)
        cfrm.pack()
        self.start_btn = ttk.Button(cfrm, text="▶  Start Agent", command=self._start_agent)
        self.start_btn.pack(side="left", padx=5)
        self.stop_btn = ttk.Button(cfrm, text="■  Stop Agent", command=self._stop_agent, state="disabled")
        self.stop_btn.pack(side="left", padx=5)

        # Log
        lfrm = ttk.LabelFrame(self.root, text="Log", padding=5)
        lfrm.pack(fill="both", expand=True, padx=10, pady=5)
        self.log_text = tk.Text(lfrm, height=8, state="disabled", font=("Consolas", 9))
        self.log_text.pack(fill="both", expand=True)

    def _log(self, msg):
        self.log_text.config(state="normal")
        self.log_text.insert("end", msg + "\\n")
        self.log_text.see("end")
        self.log_text.config(state="disabled")

    def _load_env(self):
        if os.path.exists(ENV_PATH):
            load_dotenv(ENV_PATH)
            key = os.getenv("CRIDERGPT_API_KEY", "")
            if key and key != "YOUR_SUPABASE_ACCESS_TOKEN_HERE":
                self.api_entry.insert(0, key)
                self._log("[gui] Loaded API key from .env")

    def _save_api_key(self):
        key = self.api_entry.get().strip()
        if not key:
            messagebox.showwarning("Missing", "Enter an API key first.")
            return
        if not os.path.exists(ENV_PATH):
            with open(ENV_PATH, "w") as f:
                f.write("# CriderGPT Agent\\n")
        set_key(ENV_PATH, "CRIDERGPT_API_KEY", key)
        os.environ["CRIDERGPT_API_KEY"] = key
        self._log("[gui] API key saved to .env")
        messagebox.showinfo("Saved", "API key saved.")

    def _start_agent(self):
        if self.agent_running:
            return
        key = self.api_entry.get().strip()
        if not key or key == "YOUR_SUPABASE_ACCESS_TOKEN_HERE":
            messagebox.showwarning("Missing", "Enter a valid API key first.")
            return
        os.environ["CRIDERGPT_API_KEY"] = key

        self.stop_event.clear()
        self.agent_running = True
        self.status_var.set("Online")
        self.conn_var.set("Agent running...")
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        self._log("[gui] Starting agent...")

        def run():
            try:
                from auth import test_connection
                if not test_connection():
                    self._log("[gui] Connection failed!")
                    self.root.after(0, self._stop_agent)
                    return
                self._log("[gui] Connected to CriderGPT API")
                self.root.after(0, lambda: self.conn_var.set("Connected"))
                from poller import poll_loop
                poll_loop(self.stop_event)
            except Exception as e:
                self._log(f"[gui] Agent error: {e}")
            finally:
                self.root.after(0, self._on_agent_stopped)

        self.agent_thread = threading.Thread(target=run, daemon=True)
        self.agent_thread.start()

    def _stop_agent(self):
        self.stop_event.set()
        self._log("[gui] Stopping agent...")

    def _on_agent_stopped(self):
        self.agent_running = False
        self.status_var.set("Offline")
        self.conn_var.set("Not connected")
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self._log("[gui] Agent stopped.")


if __name__ == "__main__":
    root = tk.Tk()
    app = CriderGPTAgentGUI(root)
    root.mainloop()
`,
  },
  {
    name: 'build_exe.py',
    content: `"""
CriderGPT Agent – EXE Builder
===============================
Uses PyInstaller to package the agent into a single .exe.

Prerequisites:
    pip install pyinstaller

Usage:
    python build_exe.py

Output:
    dist/CriderGPT-Agent.exe
"""
import subprocess
import sys
import os


def main():
    print("=" * 50)
    print("  CriderGPT Agent EXE Builder")
    print("=" * 50)

    # Check PyInstaller
    try:
        import PyInstaller
        print(f"[build] PyInstaller {PyInstaller.__version__} found.")
    except ImportError:
        print("[build] Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    # Install agent dependencies
    if os.path.exists("requirements.txt"):
        print("[build] Installing agent dependencies...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

    # Build with PyInstaller
    print("[build] Building CriderGPT-Agent.exe ...")
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--name", "CriderGPT-Agent",
        "--icon", "NONE",
        "--add-data", f"requirements.txt{os.pathsep}.",
        "--hidden-import", "config",
        "--hidden-import", "auth",
        "--hidden-import", "poller",
        "--hidden-import", "executor",
        "--hidden-import", "vision",
        "gui_agent.py",
    ]
    subprocess.check_call(cmd)

    exe_path = os.path.join("dist", "CriderGPT-Agent.exe")
    if os.path.exists(exe_path):
        size_mb = os.path.getsize(exe_path) / (1024 * 1024)
        print(f"\\n[build] SUCCESS! Built: {exe_path} ({size_mb:.1f} MB)")
        print("[build] Copy the .exe and your .env file to any Windows PC to run.")
    else:
        print("[build] Build may have failed — check PyInstaller output above.")


if __name__ == "__main__":
    main()
`,
  },
  {
    name: 'setup_agent.py',
    content: `"""
CriderGPT Agent – Setup & Installer Script
=============================================
Run this once to set up the agent environment.

Usage:
    python setup_agent.py
"""
import subprocess
import sys
import os


def install_dependencies():
    print("[setup] Installing Python dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    print("[setup] Dependencies installed.")


def create_env_template():
    env_path = ".env"
    if os.path.exists(env_path):
        print(f"[setup] {env_path} already exists, skipping.")
        return
    template = """# CriderGPT Agent Configuration
CRIDERGPT_API_URL=https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/agent-poll
CRIDERGPT_API_KEY=YOUR_SUPABASE_ACCESS_TOKEN_HERE
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc
POLL_INTERVAL=10
VISION_ENABLED=false
VISION_INTERVAL=30
AUTHORIZED_KEYWORDS=agent_mode,pc_agent
"""
    with open(env_path, "w") as f:
        f.write(template)
    print(f"[setup] Created {env_path} — edit it with your API key.")


def register_startup():
    if sys.platform != "win32":
        print("[setup] Auto-start registration is only supported on Windows.")
        return
    answer = input("[setup] Register agent to start on Windows boot? (y/n): ").strip().lower()
    if answer != "y":
        return
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            0, winreg.KEY_SET_VALUE,
        )
        agent_path = os.path.abspath("agent.py")
        winreg.SetValueEx(key, "CriderGPTAgent", 0, winreg.REG_SZ, f'{sys.executable} "{agent_path}"')
        winreg.CloseKey(key)
        print("[setup] Registered for startup.")
    except Exception as e:
        print(f"[setup] Failed to register startup: {e}")


def main():
    print("=" * 50)
    print("  CriderGPT Agent Setup")
    print("=" * 50)
    install_dependencies()
    create_env_template()
    register_startup()
    print("\\n[setup] Done! Run 'python agent.py' to start the agent.")


if __name__ == "__main__":
    main()
`,
  },
];

const ENV_TEMPLATE = `# CriderGPT Agent Configuration
CRIDERGPT_API_URL=https://udpldrrpebdyuiqdtqnq.supabase.co/functions/v1/agent-poll
CRIDERGPT_API_KEY=YOUR_SUPABASE_ACCESS_TOKEN_HERE
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc
POLL_INTERVAL=10
VISION_ENABLED=false
VISION_INTERVAL=30
AUTHORIZED_KEYWORDS=agent_mode,pc_agent
`;

export function AgentScripts() {
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const [statusRes, tasksRes] = await Promise.all([
        (supabase as any).from('agent_status').select('*').limit(1).maybeSingle(),
        (supabase as any).from('agent_execution_queue').select('*').order('created_at', { ascending: false }).limit(10),
      ]);
      if (statusRes.data) {
        setAgentOnline(statusRes.data.is_online);
        setLastHeartbeat(statusRes.data.last_heartbeat);
      }
      setRecentTasks(tasksRes.data || []);
    } catch (e) {
      console.error('Failed to fetch agent status:', e);
    }
    setLoading(false);
  }

  function copyToClipboard(text: string, name: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${name} to clipboard`);
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  }

  function downloadAll() {
    PYTHON_FILES.forEach((f) => downloadFile(f.content, f.name));
    downloadFile(ENV_TEMPLATE, '.env.template');
    toast.success('All agent files downloaded');
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Agent Status</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {agentOnline ? (
                <><Wifi className="h-4 w-4 text-green-500" /><Badge variant="outline" className="border-green-500 text-green-500">Online</Badge></>
              ) : (
                <><WifiOff className="h-4 w-4 text-muted-foreground" /><Badge variant="outline">Offline</Badge></>
              )}
            </div>
            {lastHeartbeat && (
              <span className="text-xs text-muted-foreground">
                Last heartbeat: {new Date(lastHeartbeat).toLocaleString()}
              </span>
            )}
            <Button size="sm" variant="secondary" onClick={downloadAll}>
              <Download className="h-4 w-4 mr-1" /> Download All Scripts
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                copyToClipboard(ENV_TEMPLATE, '.env template');
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copy .env Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Agent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 text-sm border rounded-lg p-2">
                  {task.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : task.status === 'failed' ? (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
                  )}
                  <span className="truncate flex-1 font-mono text-xs">{task.command?.slice(0, 80)}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">{task.status}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(task.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Python Files */}
      {PYTHON_FILES.map((file) => (
        <Card key={file.name}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono">{file.name}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(file.content, file.name)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => downloadFile(file.content, file.name)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre">
              {file.content}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
