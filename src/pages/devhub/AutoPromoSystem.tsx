import { useEffect, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Play, RefreshCw } from "lucide-react";

type Settings = {
  id: number; enabled: boolean; hourly_cap: number; min_gap_minutes: number;
  topics: string[]; last_run_at: string | null; last_posted_at: string | null;
};
type Video = {
  id: string; video_url: string; topic_tag: string; description: string | null;
  active: boolean; times_used: number; last_used_at: string | null;
};

export default function AutoPromoSystem() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [newVideo, setNewVideo] = useState({ video_url: "", topic_tag: "general", description: "" });
  const [topicsInput, setTopicsInput] = useState("");
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, v] = await Promise.all([
      supabase.from("auto_promo_settings" as any).select("*").eq("id", 1).maybeSingle(),
      supabase.from("promo_video_library" as any).select("*").order("created_at", { ascending: false }),
    ]);
    if (s.data) {
      setSettings(s.data as any);
      setTopicsInput(((s.data as any).topics || []).join(", "));
    }
    if (v.data) setVideos(v.data as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    const { error } = await supabase.from("auto_promo_settings" as any).update(patch).eq("id", 1);
    if (error) return toast.error(error.message);
    setSettings(next);
    toast.success("Saved");
  };

  const addVideo = async () => {
    if (!newVideo.video_url.trim()) return toast.error("Video URL required");
    const { error } = await supabase.from("promo_video_library" as any).insert(newVideo);
    if (error) return toast.error(error.message);
    setNewVideo({ video_url: "", topic_tag: "general", description: "" });
    toast.success("Video added");
    load();
  };
  const toggleVideo = async (v: Video) => {
    await supabase.from("promo_video_library" as any).update({ active: !v.active }).eq("id", v.id);
    load();
  };
  const deleteVideo = async (id: string) => {
    await supabase.from("promo_video_library" as any).delete().eq("id", id);
    load();
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("auto-generate-promo-post", { body: { trigger: "manual" } });
    setRunning(false);
    if (error) return toast.error(error.message);
    toast.success(JSON.stringify(data));
    load();
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auto-Promo System</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hourly TikTok auto-poster. Pulls from your promo video library, generates a fresh caption + hashtags, dedups against the last 7 days, and queues to TikTok. Guardrails baked in: hourly cap, min-gap, and a kill switch.
          </p>
        </div>

        {loading || !settings ? <p>Loading…</p> : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Kill Switch & Guardrails
                  <Badge variant={settings.enabled ? "default" : "outline"}>
                    {settings.enabled ? "ON" : "OFF"}
                  </Badge>
                </CardTitle>
                <CardDescription>The hourly cron runs at :00 every hour. It only posts if enabled AND guardrails pass.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enabled">Auto-posting enabled</Label>
                  <Switch id="enabled" checked={settings.enabled} onCheckedChange={(v) => saveSettings({ enabled: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Hourly cap</Label>
                    <Input type="number" min={1} max={4} value={settings.hourly_cap}
                      onChange={(e) => setSettings({ ...settings, hourly_cap: +e.target.value })}
                      onBlur={() => saveSettings({ hourly_cap: settings.hourly_cap })} />
                  </div>
                  <div>
                    <Label>Min gap (minutes)</Label>
                    <Input type="number" min={15} value={settings.min_gap_minutes}
                      onChange={(e) => setSettings({ ...settings, min_gap_minutes: +e.target.value })}
                      onBlur={() => saveSettings({ min_gap_minutes: settings.min_gap_minutes })} />
                  </div>
                </div>
                <div>
                  <Label>Rotating topics (comma-separated)</Label>
                  <Input value={topicsInput} onChange={(e) => setTopicsInput(e.target.value)}
                    onBlur={() => saveSettings({ topics: topicsInput.split(",").map(t => t.trim()).filter(Boolean) })} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Last run: {settings.last_run_at ? new Date(settings.last_run_at).toLocaleString() : "never"}</p>
                  <p>Last posted: {settings.last_posted_at ? new Date(settings.last_posted_at).toLocaleString() : "never"}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runNow} disabled={running}>
                    <Play className="w-4 h-4 mr-2" />{running ? "Running…" : "Run Now"}
                  </Button>
                  <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Promo Video Library ({videos.filter(v => v.active).length} active)</CardTitle>
                <CardDescription>Upload videos to Supabase Storage or any public URL, then add the URL here. The bot rotates least-recently-used first.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-[1fr,160px,auto] gap-2">
                  <Input placeholder="https://…/promo.mp4" value={newVideo.video_url}
                    onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })} />
                  <Input placeholder="topic tag" value={newVideo.topic_tag}
                    onChange={(e) => setNewVideo({ ...newVideo, topic_tag: e.target.value })} />
                  <Button onClick={addVideo}>Add</Button>
                </div>
                <Textarea placeholder="Optional description / context for the AI caption" value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })} />

                <div className="space-y-2">
                  {videos.length === 0 && <p className="text-sm text-muted-foreground">No videos yet. Add at least one.</p>}
                  {videos.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 border rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{v.video_url}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.topic_tag} · used {v.times_used}× · last {v.last_used_at ? new Date(v.last_used_at).toLocaleDateString() : "never"}
                        </p>
                      </div>
                      <Switch checked={v.active} onCheckedChange={() => toggleVideo(v)} />
                      <Button size="icon" variant="ghost" onClick={() => deleteVideo(v.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DevHubGuard>
  );
}
