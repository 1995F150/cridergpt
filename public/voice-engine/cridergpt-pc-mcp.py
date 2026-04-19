"""
CriderGPT Local PC — MCP Server (stdio transport)
==================================================
Run inside Cursor / Claude Desktop / any MCP client. No Docker, no Flask,
no Supabase queue — just direct stdio JSON-RPC.

Install once:
    pip install mcp pyautogui pillow

Cursor config (~/.cursor/mcp.json or Settings → MCP):
{
  "mcpServers": {
    "cridergpt-pc": {
      "command": "python",
      "args": ["C:\\\\path\\\\to\\\\cridergpt-pc-mcp.py"]
    }
  }
}

Tools exposed:
  screenshot, click, type_text, hotkey, mouse_move,
  shell, read_file, write_file, list_files, sysinfo
"""
import os
import sys
import io
import base64
import shutil
import platform
import subprocess
from pathlib import Path

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    print("Install: pip install mcp pyautogui pillow", file=sys.stderr)
    sys.exit(1)

WORKSPACE = os.environ.get("CRIDERGPT_WORKSPACE", str(Path.home()))
BLOCKED = ["rm -rf /", "mkfs", "shutdown", "format c:", ":(){"]

mcp = FastMCP("cridergpt-pc")


def _safe(cmd: str) -> bool:
    low = cmd.lower()
    return not any(b in low for b in BLOCKED)


@mcp.tool()
def screenshot() -> str:
    """Capture the entire screen. Returns base64-encoded PNG."""
    try:
        import pyautogui
        img = pyautogui.screenshot()
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        return f"ERROR: {e}"


@mcp.tool()
def click(x: int, y: int) -> str:
    """Click the mouse at screen coordinates (x, y)."""
    import pyautogui
    pyautogui.click(x, y)
    return f"clicked at {x},{y}"


@mcp.tool()
def type_text(text: str) -> str:
    """Type text at the current keyboard focus."""
    import pyautogui
    pyautogui.typewrite(text, interval=0.02)
    return f"typed {len(text)} chars"


@mcp.tool()
def hotkey(keys: str) -> str:
    """Press a key combo like 'ctrl+c' or 'alt+tab' (use + as separator)."""
    import pyautogui
    parts = [k.strip() for k in keys.split("+")]
    pyautogui.hotkey(*parts)
    return f"pressed {parts}"


@mcp.tool()
def mouse_move(x: int, y: int) -> str:
    """Move the mouse to screen coordinates (x, y)."""
    import pyautogui
    pyautogui.moveTo(x, y, duration=0.2)
    return f"moved to {x},{y}"


@mcp.tool()
def shell(command: str, timeout: int = 60) -> str:
    """Run a shell command in the workspace dir. Blocks dangerous commands."""
    if not _safe(command):
        return "BLOCKED: unsafe command"
    try:
        r = subprocess.run(
            command, shell=True, cwd=WORKSPACE,
            capture_output=True, text=True, timeout=timeout,
        )
        out = (r.stdout or "")[:20000]
        err = (r.stderr or "")[:5000]
        return f"exit={r.returncode}\nstdout:\n{out}\nstderr:\n{err}"
    except subprocess.TimeoutExpired:
        return "ERROR: timed out"
    except Exception as e:
        return f"ERROR: {e}"


@mcp.tool()
def read_file(path: str) -> str:
    """Read a text file from the workspace. Returns first 50KB."""
    full = os.path.join(WORKSPACE, path) if not os.path.isabs(path) else path
    if not os.path.exists(full):
        return f"ERROR: not found: {full}"
    try:
        with open(full, "r", encoding="utf-8", errors="replace") as f:
            return f.read()[:50000]
    except Exception as e:
        return f"ERROR: {e}"


@mcp.tool()
def write_file(path: str, content: str) -> str:
    """Write content to a file (creates parent dirs)."""
    full = os.path.join(WORKSPACE, path) if not os.path.isabs(path) else path
    os.makedirs(os.path.dirname(full) or ".", exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    return f"wrote {len(content)} bytes to {full}"


@mcp.tool()
def list_files(path: str = "") -> str:
    """List files in a directory (defaults to workspace)."""
    target = os.path.join(WORKSPACE, path) if path else WORKSPACE
    if not os.path.isdir(target):
        return f"ERROR: not a dir: {target}"
    items = sorted(os.listdir(target))[:300]
    return "\n".join(items)


@mcp.tool()
def sysinfo() -> str:
    """Return system info: OS, CPU, RAM, disk."""
    usage = shutil.disk_usage(WORKSPACE)
    return (
        f"OS: {platform.system()} {platform.release()}\n"
        f"Python: {platform.python_version()}\n"
        f"Hostname: {platform.node()}\n"
        f"Workspace: {WORKSPACE}\n"
        f"Disk total: {usage.total // (1024**3)} GB\n"
        f"Disk free:  {usage.free  // (1024**3)} GB\n"
    )


if __name__ == "__main__":
    mcp.run()
