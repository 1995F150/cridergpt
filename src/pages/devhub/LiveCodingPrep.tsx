import { useEffect, useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Play, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Round = {
  id: string;
  level: "warmup" | "mid" | "debug" | "hard";
  color: string;
  minutes: number;
  title: string;
  prompt: string;
  starter?: string;
  gotchas: string[];
};

const ROUNDS: Round[] = [
  {
    id: "r1",
    level: "warmup",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    minutes: 10,
    title: "Round 1 — Warmup: Function Calling",
    prompt:
      "Using the OpenAI Python SDK, define a tool `get_weather(city: str)` and let the model call it. When the user asks 'what's the weather in Dallas?', run the tool call, return a fake temp, and feed it back so the assistant gives a final answer.",
    starter: `from openai import OpenAI
client = OpenAI()

# define tool, call chat.completions.create, handle tool_calls
`,
    gotchas: [
      "response.choices[0].message.tool_calls can be None — guard it.",
      "You must append the assistant message AND the tool message before the second call.",
      "tool message needs the same tool_call_id.",
    ],
  },
  {
    id: "r2",
    level: "mid",
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
    minutes: 20,
    title: "Round 2 — Mid: CSV + Embeddings",
    prompt:
      "You have faqs.csv with 500 rows (question,answer). Embed every question with text-embedding-3-small, store the vectors in memory, then answer a user query by returning the top-1 FAQ via cosine similarity.",
    starter: `import csv, numpy as np
from openai import OpenAI
client = OpenAI()
`,
    gotchas: [
      "Batch the embedding call (input=list of strings) — don't loop one-by-one.",
      "Normalize vectors once, then cosine = dot product.",
      "Handle the 8191 token limit per input.",
    ],
  },
  {
    id: "r3",
    level: "debug",
    color: "bg-orange-500/15 text-orange-400 border-orange-500/40",
    minutes: 15,
    title: "Round 3 — Debug: 4 Bugs",
    prompt:
      "Fix this broken chat() function so it returns a streaming response from gpt-4o. List every bug you found.",
    starter: `def chat(prompt):
    res = openai.ChatCompletion.create(
        model="gpt4",
        message=[{"role":"user","content":prompt}],
        stream=False,
    )
    for chunk in res:
        print(chunk.choices[0].delta.content)
`,
    gotchas: [
      "Old SDK syntax — should be client.chat.completions.create on v1+.",
      "model name is 'gpt-4o', not 'gpt4'.",
      "Param is `messages` (plural), not `message`.",
      "stream=False but iterating chunks — set stream=True.",
    ],
  },
  {
    id: "r4",
    level: "hard",
    color: "bg-red-500/15 text-red-400 border-red-500/40",
    minutes: 30,
    title: "Round 4 — Hard: Mini RAG",
    prompt:
      "Given a 3-page markdown doc, chunk it (~500 tokens), embed chunks, store in memory, retrieve top-3 for a user question, stuff into the system prompt, and answer with gpt-4o-mini. Bonus: refuse to answer when no chunk is relevant.",
    starter: `# 1) load + chunk
# 2) embed chunks
# 3) embed query, cosine sim, top-3
# 4) build system prompt with context
# 5) chat.completions.create
`,
    gotchas: [
      "Chunk on paragraph boundaries first, then size-cap.",
      "Keep chunk_id → text map so you can cite.",
      "For 'no relevant chunk', threshold cosine (e.g. < 0.25) and return a refusal.",
      "System prompt should say: 'Only answer from CONTEXT. If missing, say you don't know.'",
    ],
  },
];

type Attempt = {
  id: string;
  round_id: string;
  answer: string;
  grade: string;
  score: number | null;
  created_at: string;
};

const LS_KEY = "live-coding-prep-attempts-v1";

export default function LiveCodingPrep() {
  const [activeId, setActiveId] = useState<string>(ROUNDS[0].id);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const active = useMemo(() => ROUNDS.find((r) => r.id === activeId)!, [activeId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setAttempts(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: Attempt[]) => {
    setAttempts(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const gradeAnswer = async () => {
    if (!answer.trim()) {
      toast.error("Type your answer first.");
      return;
    }
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-with-ai", {
        body: {
          messages: [
            {
              role: "system",
              content:
                "You are a senior staff engineer grading a live OpenAI API coding interview. Be blunt, terse, Southern Gen-Z tone (Jessie Crider style). Return EXACTLY this format:\n\nSCORE: <0-10>\nWHAT'S RIGHT: <1-2 bullets>\nBUGS: <numbered list>\nFIX: <one short paragraph or code snippet>\nNEXT STEP: <one sentence>",
            },
            {
              role: "user",
              content: `ROUND: ${active.title}\n\nPROMPT:\n${active.prompt}\n\nKEY GOTCHAS THE CANDIDATE SHOULD HIT:\n- ${active.gotchas.join("\n- ")}\n\nCANDIDATE ANSWER:\n${answer}`,
            },
          ],
        },
      });
      if (error) throw error;
      const text: string =
        data?.message || data?.content || data?.choices?.[0]?.message?.content || JSON.stringify(data);
      const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
      const next: Attempt = {
        id: crypto.randomUUID(),
        round_id: active.id,
        answer,
        grade: text,
        score,
        created_at: new Date().toISOString(),
      };
      persist([next, ...attempts].slice(0, 50));
      toast.success(score !== null ? `Graded: ${score}/10` : "Graded");
    } catch (e: any) {
      toast.error(e?.message || "Grader failed");
    } finally {
      setGrading(false);
    }
  };

  const clearHistory = () => {
    persist([]);
    toast.success("History cleared");
  };

  const lastForRound = attempts.find((a) => a.round_id === active.id);

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center gap-3">
            <GraduationCap className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Live Coding Prep</h1>
              <p className="text-sm text-muted-foreground">
                4 mock OpenAI API rounds. Type your answer, AI grades it, history saves locally.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-[260px_1fr]">
          {/* Round picker */}
          <div className="space-y-2">
            {ROUNDS.map((r) => {
              const done = attempts.some((a) => a.round_id === r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveId(r.id);
                    setAnswer("");
                  }}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    r.id === activeId ? "border-primary bg-primary/5" : "border-border bg-card/30 hover:bg-card/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={r.color}>
                      {r.level} · {r.minutes}m
                    </Badge>
                    {done && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <div className="mt-2 text-sm font-medium">{r.title.replace(/^Round \d+ — /, "")}</div>
                </button>
              );
            })}
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={clearHistory}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear history
            </Button>
          </div>

          {/* Active round */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{active.title}</CardTitle>
                  <Badge variant="outline" className={active.color}>
                    {active.minutes} min
                  </Badge>
                </div>
                <CardDescription className="pt-2 whitespace-pre-wrap">{active.prompt}</CardDescription>
              </CardHeader>
              {active.starter && (
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Starter</div>
                  <pre className="text-xs bg-muted/40 border border-border rounded-md p-3 overflow-x-auto">
                    {active.starter}
                  </pre>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your answer</CardTitle>
                <CardDescription>Code or plain English — both work.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type or paste your solution..."
                  className="min-h-[220px] font-mono text-sm"
                />
                <Button onClick={gradeAnswer} disabled={grading}>
                  {grading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Grading...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" /> Grade my answer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {lastForRound && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Latest grade</CardTitle>
                    {lastForRound.score !== null && (
                      <Badge variant="outline">{lastForRound.score}/10</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {new Date(lastForRound.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed">{lastForRound.grade}</pre>
                </CardContent>
              </Card>
            )}

            {attempts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">History ({attempts.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {attempts.map((a) => {
                    const r = ROUNDS.find((x) => x.id === a.round_id);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between border border-border rounded-md p-2 text-xs"
                      >
                        <div>
                          <div className="font-medium">{r?.title.replace(/^Round \d+ — /, "")}</div>
                          <div className="text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
                          </div>
                        </div>
                        {a.score !== null && (
                          <Badge variant="outline" className={r?.color}>
                            {a.score}/10
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DevHubGuard>
  );
}
