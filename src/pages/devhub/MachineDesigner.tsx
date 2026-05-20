import { useState } from "react";
import { DevHubPage } from "./_layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Cpu } from "lucide-react";
import { toast } from "sonner";

export default function MachineDesigner() {
  const [task, setTask] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!task.trim()) return;
    setLoading(true); setOut("");
    try {
      const { data, error } = await supabase.functions.invoke("chat-with-ai", {
        body: {
          model: "cridergpt-pro",
          messages: [
            { role: "system", content: "You are a senior robotics engineer. For the given task, output: 1) Parts list with quantities and rough cost, 2) Wiring diagram in ASCII, 3) Control loop pseudocode, 4) Starter firmware (Arduino C++ or MicroPython, pick best fit). Be concrete." },
            { role: "user", content: task }
          ]
        }
      });
      if (error) throw error;
      setOut(data?.message || data?.content || JSON.stringify(data));
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally { setLoading(false); }
  };

  return (
    <DevHubPage title="Autonomous Machine Designer" subtitle="Describe what the machine should do — get parts, wiring, firmware.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="w-4 h-4" /> Task</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={10} value={task} onChange={(e) => setTask(e.target.value)} placeholder="Build a robot that drives around the shop, finds welding rods on the floor with a camera, and picks them up..." />
            <Button onClick={generate} disabled={loading || !task.trim()} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Designing...</> : "Generate Spec"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Generated Spec</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded max-h-[600px] overflow-y-auto min-h-[300px]">{out || "Output will appear here..."}</pre>
          </CardContent>
        </Card>
      </div>
    </DevHubPage>
  );
}
