from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src/components/admin/EngineStatusPanel.tsx"
text = path.read_text()
text = text.replace(
    "type ControlResponse = {",
    'type DisplayState = "online" | "degraded" | "maintenance" | "offline" | "unknown";\n\ntype ControlResponse = {',
    1,
)
text = text.replace(
    "  const state = useMemo(() => {",
    "  const state = useMemo<DisplayState>(() => {",
    1,
)
text = text.replace('.replaceAll("_", " ")', '.split("_").join(" ")')
path.write_text(text)
print("Applied EngineStatusPanel TypeScript compatibility fixes.")
