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
