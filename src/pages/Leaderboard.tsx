import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

interface ChapterRow {
  chapter_id: string;
  chapter_name: string;
  member_count: number;
  active_members_30d: number;
  total_score: number;
}

export default function Leaderboard() {
  const [rows, setRows] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('chapter_activity')
        .select('chapter_id, chapter_name, member_count, active_members_30d, total_score')
        .order('total_score', { ascending: false })
        .limit(50);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Helmet>
        <title>FFA Chapter Leaderboard — CriderGPT</title>
        <meta
          name="description"
          content="See which FFA chapters are leading on CriderGPT. Public leaderboard ranked by member activity."
        />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
            <h1 className="text-4xl font-bold tracking-tight">FFA Chapter Leaderboard</h1>
            <p className="text-muted-foreground">
              Top chapters by activity this season. Check in daily to climb.
            </p>
          </div>

          <Card className="divide-y">
            {loading && <div className="p-6 text-center text-muted-foreground">Loading...</div>}
            {!loading && rows.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No chapters ranked yet. Be the first — invite your chapter to join.
              </div>
            )}
            {rows.map((row, i) => (
              <div key={row.chapter_id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold">
                  {i < 3 ? <Medal className={['h-5 w-5 text-yellow-500', 'h-5 w-5 text-gray-400', 'h-5 w-5 text-orange-700'][i]} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{row.chapter_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.member_count} members · {row.active_members_30d} active (30d)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{row.total_score}</div>
                  <div className="text-xs text-muted-foreground">pts</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
