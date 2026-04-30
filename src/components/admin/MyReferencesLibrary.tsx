import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ImageIcon, Globe } from "lucide-react";

interface RefItem {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  image_url: string;
  keywords: string[];
  auto_attach: boolean;
  use_for: string[];
  is_global: boolean;
}

const CATEGORIES = ["vehicle", "blueprint", "place", "object", "general"];

export function MyReferencesLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("general");
  const [keywords, setKeywords] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_reference_library")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load references", description: error.message, variant: "destructive" });
    } else {
      setRefs((data as RefItem[]) || []);
    }
    setLoading(false);
  }

  async function uploadFile(): Promise<string | null> {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}-${slug || "ref"}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("user-references")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("user-references").getPublicUrl(path);
    return data.publicUrl;
  }

  async function addRef() {
    if (!user) return;
    if (!name.trim() || !slug.trim()) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    let finalUrl = imageUrl.trim();
    if (file) {
      const uploaded = await uploadFile();
      if (uploaded) finalUrl = uploaded;
    }
    if (!finalUrl) {
      toast({ title: "Upload a file or paste an image URL", variant: "destructive" });
      setSaving(false);
      return;
    }

    const kwArr = keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const { error } = await supabase.from("user_reference_library").insert({
      user_id: user.id,
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      category,
      image_url: finalUrl,
      keywords: kwArr,
      auto_attach: true,
      use_for: ["image", "blueprint"],
    });

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reference added" });
      setName("");
      setSlug("");
      setKeywords("");
      setImageUrl("");
      setFile(null);
      await load();
    }
    setSaving(false);
  }

  async function toggleAutoAttach(ref: RefItem, value: boolean) {
    const { error } = await supabase
      .from("user_reference_library")
      .update({ auto_attach: value })
      .eq("id", ref.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setRefs((r) => r.map((x) => (x.id === ref.id ? { ...x, auto_attach: value } : x)));
  }

  async function deleteRef(ref: RefItem) {
    if (!confirm(`Delete "${ref.name}"?`)) return;
    const { error } = await supabase.from("user_reference_library").delete().eq("id", ref.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRefs((r) => r.filter((x) => x.id !== ref.id));
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          My References Library
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Save reference photos (truck, future house, places). The AI auto-attaches them when keywords match,
          or pass <code className="text-primary">referenceIds</code> to use them manually.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add form */}
        <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Truck" />
            </div>
            <div>
              <Label className="text-xs">Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-truck" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Upload file</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Or image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">Keywords (comma separated — used to auto-attach)</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="my truck, dodge, my pickup"
            />
          </div>
          <Button onClick={addRef} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Reference
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : refs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No references yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {refs.map((ref) => (
              <div key={ref.id} className="p-3 rounded-lg border border-border bg-card flex gap-3">
                <img
                  src={ref.image_url}
                  alt={ref.name}
                  className="w-20 h-20 object-cover rounded-md border border-border flex-shrink-0"
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{ref.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{ref.slug}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => deleteRef(ref)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] py-0 h-4">{ref.category}</Badge>
                    {ref.is_global && (
                      <Badge variant="secondary" className="text-[10px] py-0 h-4">
                        <Globe className="h-2.5 w-2.5 mr-1" />global
                      </Badge>
                    )}
                  </div>
                  {ref.keywords?.length > 0 && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      🔑 {ref.keywords.slice(0, 4).join(", ")}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <Label className="text-[10px] text-muted-foreground">Auto-attach</Label>
                    <Switch
                      checked={ref.auto_attach}
                      onCheckedChange={(v) => toggleAutoAttach(ref, v)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
