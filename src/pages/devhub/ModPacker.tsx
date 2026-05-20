import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ModPacker() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const { data, error } = await supabase.functions.invoke("process-mod-zip", {
        body: { filename: file.name, content_b64: b64 }
      });
      if (error) throw error;
      setResult(data);
      toast.success("Mod analyzed");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <DevHubPage title="FS25 / FS22 Mod Packer" subtitle="Unpack, inspect, repack Farming Simulator mods">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Boxes className="w-4 h-4" /> Upload Mod ZIP</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept=".zip" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Button onClick={upload} disabled={!file || loading} className="w-full">{loading ? "Processing..." : "Analyze"}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Result</CardTitle></CardHeader>
          <CardContent><pre className="text-xs bg-muted/30 p-3 rounded max-h-[400px] overflow-y-auto">{result ? JSON.stringify(result, null, 2) : "—"}</pre></CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
