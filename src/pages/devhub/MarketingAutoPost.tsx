import { useEffect, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Play, Trash2, RefreshCw, Plus } from "lucide-react";

type Row = {
  id: string;
  source: string;
  source_id: string | null;
  caption: string;
  media_url: string | null;
  video_url: string | null;
  status: string;
  scheduled_for: string;
  privacy_level: string;
  tiktok_publish_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  posted_at: string | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  processing: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  posted: "bg-green-500/15 text-green-600 border-green-500/30",
  failed: "bg-red-500/15 text-red-600 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground",
};

export default function MarketingAutoPost() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_auto_post_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("marketing-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketing_auto_post_queue" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function runNow() {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("marketing-auto-post", {
      body: { trigger: "manual" },
    });
    setRunning(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Processed ${data?.processed ?? 0} post(s)`);
      load();
    }
  }

  async function deleteRow(id: string) {
    const { error } = await supabase.from("marketing_auto_post_queue").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  }

  async function retryRow(id: string) {
    const { error } = await supabase
      .from("marketing_auto_post_queue")
      .update({ status: "pending", error: null, attempts: 0 })
      .eq("id", id);
    if (error) toast.error(error.message);
    else load();
  }

  async function addManual() {
    if (!newCaption.trim() || !newVideoUrl.trim()) {
      toast.error("Caption and video URL required");
      return;
    }
    const { error } = await supabase.from("marketing_auto_post_queue").insert({
      source: "manual",
      caption: newCaption.trim(),
      video_url: newVideoUrl.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Queued");
      setNewCaption("");
      setNewVideoUrl("");
      load();
    }
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const postedCount = rows.filter((r) => r.status === "posted").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">TikTok Marketing Auto-Post</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Auto-queues a TikTok post whenever a new store product, SEO guide, or your livestock is added.
                Runs every 15 minutes — or hit Run now.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Pending {pendingCount}</Badge>
              <Badge variant="outline" className="text-green-600">Posted {postedCount}</Badge>
              {failedCount > 0 && <Badge variant="outline" className="text-red-600">Failed {failedCount}</Badge>}
              <Button onClick={runNow} disabled={running} size="sm">
                {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Run now
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add a manual post
              </CardTitle>
              <CardDescription>
                Paste a public video URL (TikTok will pull it). Caption supports hashtags & emoji.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Caption — e.g. 🐂 Just tagged a new Angus heifer with a CriderGPT Smart Tag #FFA"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                rows={3}
              />
              <Input
                placeholder="https://… (public video URL, mp4)"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
              />
              <Button onClick={addManual} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Queue post
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Queue</CardTitle>
                <CardDescription>Last 100 rows. Updates live.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={load}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nothing queued yet. Add a store product, publish an SEO guide, or register an animal — it'll show up here.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className="border rounded-lg p-3 flex items-start gap-3 flex-wrap"
                    >
                      <div className="flex-1 min-w-[240px] space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusColors[r.status] ?? ""} variant="outline">
                            {r.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{r.source}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap line-clamp-3">{r.caption}</p>
                        {r.video_url && (
                          <a
                            href={r.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline break-all"
                          >
                            {r.video_url}
                          </a>
                        )}
                        {r.error && (
                          <p className="text-xs text-red-600 mt-1">⚠ {r.error}</p>
                        )}
                        {r.tiktok_publish_id && (
                          <p className="text-xs text-muted-foreground">
                            publish_id: {r.tiktok_publish_id}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {(r.status === "failed" || r.status === "cancelled") && (
                          <Button size="sm" variant="ghost" onClick={() => retryRow(r.id)}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => deleteRow(r.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Posting uses your personal TikTok OAuth (scope: <code>video.publish</code>). If posts fail with "owner_tiktok_not_connected",
            connect your TikTok in Settings → Integrations once. Rows without a <code>video_url</code> are skipped — TikTok requires a video file.
          </p>
        </div>
      </div>
    </DevHubGuard>
  );
}
