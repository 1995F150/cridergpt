import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Guide { slug: string; title: string; category: string; meta_description: string | null }

export default function Guides() {
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    supabase.from("seo_guides").select("slug,title,category,meta_description")
      .eq("published", true).order("generated_at", { ascending: false })
      .then(({ data }) => setGuides((data as Guide[]) ?? []));
  }, []);

  return (
    <main className="container max-w-4xl py-8">
      <Helmet>
        <title>FFA & Livestock Guides | CriderGPT</title>
        <meta name="description" content="Free guides on FFA contests, livestock care, breed showing, and farming sim mods. Written by FFA students for FFA students." />
        <link rel="canonical" href="https://cridergpt.com/guides" />
      </Helmet>
      <h1 className="text-3xl font-bold mb-6">Guides</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((g) => (
          <Link key={g.slug} to={`/guides/${g.slug}`}>
            <Card className="h-full hover:border-primary transition-colors">
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2">{g.category}</Badge>
                <CardTitle className="text-lg">{g.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{g.meta_description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {guides.length === 0 && <p className="text-muted-foreground">No guides published yet.</p>}
      </div>
    </main>
  );
}
