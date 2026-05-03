import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";

interface Officer {
  id: string;
  user_id: string;
  office: string;
  term_year: number;
}

const OFFICE_ORDER = ["president", "vice_president", "secretary", "treasurer", "reporter", "sentinel", "historian", "advisor"];

interface Props { chapterId: string }

export function ChapterOfficersPanel({ chapterId }: Props) {
  const [officers, setOfficers] = useState<Officer[]>([]);

  useEffect(() => {
    supabase.from("chapter_officers").select("id,user_id,office,term_year")
      .eq("chapter_id", chapterId)
      .order("term_year", { ascending: false })
      .then(({ data }) => setOfficers((data as Officer[]) ?? []));
  }, [chapterId]);

  const sorted = [...officers].sort((a, b) => OFFICE_ORDER.indexOf(a.office) - OFFICE_ORDER.indexOf(b.office));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" /> Chapter officers</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">No officers listed yet.</p>}
        {sorted.map((o) => (
          <div key={o.id} className="flex items-center justify-between border rounded p-3">
            <div>
              <div className="font-medium capitalize">{o.office.replace("_", " ")}</div>
              <div className="text-xs text-muted-foreground font-mono">{o.user_id.slice(0, 8)}…</div>
            </div>
            <Badge variant="outline">{o.term_year}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
