import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Terminal, Cpu, Code2, Flame, DollarSign, Activity, BookLock, Bot, Wrench, Boxes
} from "lucide-react";

const modules = [
  { to: "/devhub/server-console", icon: Terminal, title: "Server AI Console", desc: "Send commands to your home server, watch live events from pc_events.", tag: "Server + AI Ops" },
  { to: "/devhub/server-health", icon: Activity, title: "Server Health & Self-Repair", desc: "CPU/RAM/disk + AI diagnoser that proposes fixes for Docker containers.", tag: "Server + AI Ops" },
  { to: "/devhub/vault", icon: BookLock, title: "Knowledge Vault", desc: "Private notes (family, contacts, history) CriderGPT can reference.", tag: "Server + AI Ops" },
  { to: "/devhub/machine-designer", icon: Cpu, title: "Autonomous Machine Designer", desc: "Describe a robot/task → AI drafts parts list, wiring, control loop, firmware.", tag: "Builder" },
  { to: "/devhub/code-generator", icon: Code2, title: "App & Site Code Generator", desc: "Generate Android (Kotlin), iOS (Swift), or Web (React) starter projects.", tag: "Builder" },
  { to: "/devhub/agent-dispatcher", icon: Bot, title: "AGI Agent Dispatcher", desc: "Fire off background agents to research, scaffold, or refactor.", tag: "Builder" },
  { to: "/devhub/laser-studio", icon: Flame, title: "Laser Engraver Studio", desc: "SVG/PNG → G-code with power/speed presets for your engraver.", tag: "Shop + Money" },
  { to: "/devhub/income", icon: DollarSign, title: "Income & Business Calculator", desc: "Welding ($25/hr × 14h × 7d = $2,450/wk) + ad/IAP/Stripe rollup + tax est.", tag: "Shop + Money" },
  { to: "/devhub/weld-jobs", icon: Wrench, title: "Welding Job Tracker", desc: "Clock hours at the shop, log jobs, export weekly timesheet.", tag: "Shop + Money" },
  { to: "/devhub/mod-packer", icon: Boxes, title: "FS25 / FS22 Mod Packer", desc: "Unpack a mod ZIP, edit XML, repack signed. Hooks into process-mod-zip.", tag: "Builder" },
];

export default function DevHub() {
  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Crider Dev Hub</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Owner-only command center. Build, ship, repair — everything in one place.
                </p>
              </div>
              <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
                Verified Owner Access
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link key={m.to} to={m.to} className="group">
                  <Card className="h-full hover:border-primary/60 transition-colors hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-[10px]">{m.tag}</Badge>
                      </div>
                      <CardTitle className="text-base mt-3">{m.title}</CardTitle>
                      <CardDescription className="text-xs">{m.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </DevHubGuard>
  );
}
