import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShareToSnapchat } from "@/components/ShareToSnapchat";
import {
  Bot, Play, Square, History, Zap, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Loader2, Clock, Brain, Paperclip, X, FileText, Image as ImageIcon, File
} from "lucide-react";

interface AgentRole {
  role: string;
  label: string;
  prompt: string;
}

interface SwarmTask {
  id: string;
  agent_index: number;
  role: string;
  role_label: string;
  prompt: string;
  status: string;
  result: string | null;
  tokens_used: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface SwarmSession {
  id: string;
  name: string;
  status: string;
  max_agents: number;
  active_agents: number;
  completed_agents: number;
  objective: string;
  created_at: string;
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string; // base64 or text content
}

const ALL_ROLES: AgentRole[] = [
  { role: 'researcher', label: '🔍 Researcher', prompt: 'Research and find facts' },
  { role: 'writer', label: '✍️ Writer', prompt: 'Draft content' },
  { role: 'coder', label: '💻 Coder', prompt: 'Write code solutions' },
  { role: 'analyst', label: '📊 Analyst', prompt: 'Analyze data and patterns' },
  { role: 'critic', label: '🎯 Critic', prompt: 'Review and improve quality' },
  { role: 'planner', label: '📋 Planner', prompt: 'Create action plans' },
  { role: 'creative', label: '🎨 Creative', prompt: 'Generate ideas' },
  { role: 'ffa_expert', label: '🌾 FFA Expert', prompt: 'FFA and agriculture expertise' },
  { role: 'livestock', label: '🐄 Livestock', prompt: 'Livestock management' },
  { role: 'mechanic', label: '🔧 Mechanic', prompt: 'Equipment and vehicle repair' },
  { role: 'financial', label: '💰 Financial', prompt: 'Budget and finance' },
  { role: 'marketer', label: '📢 Marketer', prompt: 'Marketing strategies' },
  { role: 'mod_builder', label: '🎮 Mod Builder', prompt: 'FS22/FS25 mod building' },
  { role: 'scheduler', label: '📅 Scheduler', prompt: 'Scheduling and planning' },
  { role: 'debugger', label: '🐛 Debugger', prompt: 'Find and fix errors' },
  { role: 'communicator', label: '💬 Communicator', prompt: 'Draft communications' },
  { role: 'educator', label: '📚 Educator', prompt: 'Create study materials' },
  { role: 'synthesizer', label: '🧠 Synthesizer', prompt: 'Combine all outputs' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = [
  'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
  'application/json', 'application/xml', 'text/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
];

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
  if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
  if (type.includes('text') || type.includes('json') || type.includes('xml')) return <FileText className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readFileAsContent(file: globalThis.File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isText = file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/xml';
    
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        content: isText ? (reader.result as string) : (reader.result as string),
      });
    };
    reader.onerror = reject;
    
    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

export default function AgentSwarmPanel() {
  const [objective, setObjective] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<SwarmSession | null>(null);
  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [sessions, setSessions] = useState<SwarmSession[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const { data } = await supabase.functions.invoke('swarm-orchestrator', {
      body: { action: 'list' }
    });
    if (data?.sessions) setSessions(data.sessions);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : prev.length < 18
          ? [...prev, role]
          : prev
    );
  };

  const selectAll = () => setSelectedRoles(ALL_ROLES.map(r => r.role));
  const clearAll = () => setSelectedRoles([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit`, variant: "destructive" });
        continue;
      }
      
      if (uploadedFiles.length >= 5) {
        toast({ title: "Max files reached", description: "You can attach up to 5 files per swarm", variant: "destructive" });
        break;
      }

      try {
        const uploaded = await readFileAsContent(file);
        setUploadedFiles(prev => [...prev, uploaded]);
      } catch {
        toast({ title: "Read failed", description: `Could not read ${file.name}`, variant: "destructive" });
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const launchSwarm = async () => {
    if (!objective.trim()) {
      toast({ title: "Need an objective", description: "Tell the swarm what to work on", variant: "destructive" });
      return;
    }
    if (selectedRoles.length === 0) {
      toast({ title: "No agents selected", description: "Pick at least one agent role", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setTasks([]);
    setCurrentSession(null);

    try {
      const agents = selectedRoles.map(role => ({
        role,
        prompt: objective,
        model: 'google/gemini-3-flash-preview',
      }));

      // Prepare file context for agents
      const fileContext = uploadedFiles.map(f => ({
        name: f.name,
        type: f.type,
        content: f.content.substring(0, 15000), // Truncate large files
      }));

      const { data, error } = await supabase.functions.invoke('swarm-orchestrator', {
        body: { action: 'launch', objective, agents, files: fileContext.length > 0 ? fileContext : undefined }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCurrentSession(data.session);
      setTasks(data.tasks || []);
      setUploadedFiles([]);
      await loadSessions();

      toast({
        title: "🐝 Swarm Complete!",
        description: `${data.summary.completed}/${data.summary.total} agents finished successfully`,
      });
    } catch (err: any) {
      console.error('Swarm error:', err);
      toast({ title: "Swarm Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const viewSession = async (sessionId: string) => {
    const { data } = await supabase.functions.invoke('swarm-orchestrator', {
      body: { action: 'status', sessionId }
    });
    if (data) {
      setCurrentSession(data.session);
      setTasks(data.tasks || []);
      setShowHistory(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Agent Swarm</h2>
          <Badge variant="secondary" className="text-xs">Up to 18 agents</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
          <History className="h-4 w-4 mr-1" />
          History
        </Button>
      </div>

      {showHistory && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Past Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => viewSession(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()} · {session.completed_agents}/{session.max_agents} agents
                        </p>
                      </div>
                      <Badge variant={session.status === 'completed' ? 'default' : session.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Launch Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Launch New Swarm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="What's the mission? e.g., 'Research best cattle feed ratios for show steers and create a 30-day plan'"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="min-h-[80px]"
          />

          {/* File Upload Area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.csv,.md,.json,.xml,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadedFiles.length >= 5}
              className="gap-2"
            >
              <Paperclip className="h-4 w-4" />
              Attach Files ({uploadedFiles.length}/5)
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              PDF, images, text, CSV, JSON, DOCX, XLSX
            </span>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-muted/60 border rounded-md px-2 py-1.5 text-xs">
                  {getFileIcon(file.type)}
                  <span className="max-w-[120px] truncate font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                  <button onClick={() => removeFile(i)} className="ml-1 hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Select Agents ({selectedRoles.length}/18)</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">All 18</Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7">Clear</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {ALL_ROLES.map(role => (
                <label
                  key={role.role}
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors text-xs ${
                    selectedRoles.includes(role.role)
                      ? 'bg-primary/10 border-primary/50'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedRoles.includes(role.role)}
                    onCheckedChange={() => toggleRole(role.role)}
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={launchSwarm}
            disabled={isRunning || !objective.trim() || selectedRoles.length === 0}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running {selectedRoles.length} agents...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Launch Swarm ({selectedRoles.length} agents)
                {uploadedFiles.length > 0 && ` + ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {currentSession?.name || 'Swarm Results'}
              </CardTitle>
              <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                {completedCount}/{tasks.length} done
              </Badge>
            </div>
            <Progress value={progress} className="h-2 mt-2" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="text-sm font-medium">{task.role_label}</span>
                        {task.tokens_used > 0 && (
                          <Badge variant="outline" className="text-xs">{task.tokens_used} tokens</Badge>
                        )}
                      </div>
                      {expandedTask === task.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {expandedTask === task.id && (
                      <div className="px-3 pb-3 border-t">
                        {task.result ? (
                          <div className="mt-2">
                            <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md max-h-64 overflow-y-auto">
                              {task.result}
                            </div>
                            <div className="mt-2 flex justify-end">
                              <ShareToSnapchat
                                title={`CriderGPT Agent: ${task.role_label}`}
                                content={task.result}
                                variant="default"
                              />
                            </div>
                          </div>
                        ) : task.error_message ? (
                          <p className="mt-2 text-sm text-destructive">{task.error_message}</p>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">Waiting...</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
