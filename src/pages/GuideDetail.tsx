import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Guide {
  slug: string; title: string; category: string; content: string; meta_description: string | null;
}

export default function GuideDetail() {
  const { slug } = useParams();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.from("seo_guides").select("slug,title,category,content,meta_description")
      .eq("slug", slug).eq("published", true).maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else {
          setGuide(data as Guide);
          // increment view counter (best effort)
          supabase.rpc("increment_guide_views" as any, { p_slug: slug }).then(() => {});
        }
      });
  }, [slug]);

  if (notFound) {
    return <main className="container py-12 text-center">
      <p className="text-muted-foreground">Guide not found.</p>
      <Link to="/guides"><Button variant="link">Back to guides</Button></Link>
    </main>;
  }
  if (!guide) return <main className="container py-12">Loading…</main>;

  const url = `https://cridergpt.com/guides/${guide.slug}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.meta_description,
    author: { "@type": "Person", name: "Jessie Crider" },
    publisher: { "@type": "Organization", name: "CriderGPT" },
    mainEntityOfPage: url,
  };

  return (
    <main className="container max-w-3xl py-8">
      <Helmet>
        <title>{guide.title} | CriderGPT Guides</title>
        <meta name="description" content={guide.meta_description ?? guide.title} />
        <link rel="canonical" href={url} />
        <script type="application/ld+json">{JSON.stringify(ld)}</script>
      </Helmet>
      <Link to="/guides"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> All guides</Button></Link>
      <Badge variant="outline" className="mb-2">{guide.category}</Badge>
      <h1 className="text-3xl font-bold mb-6">{guide.title}</h1>
      <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {guide.content}
      </article>
    </main>
  );
}
