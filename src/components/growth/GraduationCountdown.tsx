import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

// Local-time graduation day. Practice 8:00 AM, ceremony assumed later same day.
const GRAD_DATE_ISO = '2026-05-22';
const PRACTICE_HOUR = 8;

function getCountdown() {
  const [y, m, d] = GRAD_DATE_ISO.split('-').map(Number);
  const target = new Date(y, m - 1, d, PRACTICE_HOUR, 0, 0, 0);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs, target };
}

export function GraduationCountdown() {
  const [c, setC] = useState(getCountdown());

  useEffect(() => {
    const i = setInterval(() => setC(getCountdown()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!c) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/15 to-accent/10 border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-full bg-primary/20 p-2">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">Graduation Countdown</div>
            <div className="text-xs text-muted-foreground">
              May 22 · Practice 8:00 AM
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { v: c.days, l: 'days' },
            { v: c.hours, l: 'hrs' },
            { v: c.mins, l: 'min' },
            { v: c.secs, l: 'sec' },
          ].map(x => (
            <div key={x.l} className="rounded-md bg-background/60 py-2">
              <div className="text-xl font-bold tabular-nums">{x.v}</div>
              <div className="text-[10px] uppercase text-muted-foreground">{x.l}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
