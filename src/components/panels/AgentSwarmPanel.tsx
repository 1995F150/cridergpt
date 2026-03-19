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
  // Agriculture & Crop Science
  { role: 'agronomist', label: '🌱 Agronomist', prompt: 'Crop and soil advice' },
  { role: 'veterinarian', label: '🩺 Veterinarian', prompt: 'Animal health diagnosis' },
  { role: 'nutritionist', label: '🥗 Nutritionist', prompt: 'Animal feed rations' },
  { role: 'soil_scientist', label: '🧪 Soil Scientist', prompt: 'Soil analysis' },
  { role: 'weather_analyst', label: '🌦️ Weather Analyst', prompt: 'Weather risk assessment' },
  { role: 'irrigation_specialist', label: '💧 Irrigation', prompt: 'Watering systems' },
  { role: 'pest_manager', label: '🐛 Pest Manager', prompt: 'Pest control IPM' },
  { role: 'weed_specialist', label: '🌿 Weed Specialist', prompt: 'Weed management' },
  // Livestock Specialties
  { role: 'dairy_specialist', label: '🥛 Dairy', prompt: 'Dairy herd management' },
  { role: 'beef_specialist', label: '🥩 Beef', prompt: 'Beef cattle operations' },
  { role: 'swine_specialist', label: '🐷 Swine', prompt: 'Swine management' },
  { role: 'poultry_specialist', label: '🐔 Poultry', prompt: 'Poultry operations' },
  { role: 'equine_specialist', label: '🐴 Equine', prompt: 'Horse care and training' },
  { role: 'sheep_goat_specialist', label: '🐑 Sheep & Goat', prompt: 'Small ruminants' },
  { role: 'aquaculture_specialist', label: '🐟 Aquaculture', prompt: 'Fish farming' },
  { role: 'genetics_specialist', label: '🧬 Genetics', prompt: 'Breeding programs' },
  { role: 'reproduction_specialist', label: '🐣 Reproduction', prompt: 'Breeding protocols' },
  { role: 'show_prep', label: '🏅 Show Prep', prompt: 'Livestock showing' },
  { role: 'judging_coach', label: '👁️ Judging Coach', prompt: 'Livestock judging' },
  { role: 'meat_science', label: '🥩 Meat Science', prompt: 'Carcass evaluation' },
  // Land & Environment
  { role: 'forestry_specialist', label: '🌲 Forestry', prompt: 'Timber management' },
  { role: 'horticulture_specialist', label: '🌺 Horticulture', prompt: 'Greenhouse operations' },
  { role: 'environmental_specialist', label: '🌍 Environmental', prompt: 'Conservation practices' },
  { role: 'sustainability', label: '♻️ Sustainability', prompt: 'Regenerative agriculture' },
  { role: 'organic_specialist', label: '🌿 Organic', prompt: 'Organic certification' },
  { role: 'pasture_manager', label: '🏕️ Pasture Manager', prompt: 'Rotational grazing' },
  { role: 'wildlife_manager', label: '🦌 Wildlife Manager', prompt: 'Habitat management' },
  { role: 'water_quality', label: '💧 Water Quality', prompt: 'Water testing' },
  { role: 'compost_specialist', label: '🍂 Compost', prompt: 'Waste management' },
  { role: 'permaculture', label: '🍃 Permaculture', prompt: 'Sustainable design' },
  { role: 'climate_advisor', label: '🌡️ Climate Advisor', prompt: 'Climate adaptation' },
  // Technology & Engineering
  { role: 'precision_ag', label: '📡 Precision Ag', prompt: 'GPS and drone data' },
  { role: 'ag_engineer', label: '⚙️ Ag Engineer', prompt: 'Farm structures' },
  { role: 'iot_specialist', label: '📶 IoT Specialist', prompt: 'Sensor networks' },
  { role: 'drone_operator', label: '🛸 Drone Operator', prompt: 'Aerial surveys' },
  { role: 'gis_specialist', label: '🗺️ GIS Specialist', prompt: 'Mapping and spatial data' },
  { role: 'robotics_engineer', label: '🦾 Robotics', prompt: 'Farm automation' },
  { role: 'data_scientist', label: '📊 Data Scientist', prompt: 'Predictive analytics' },
  { role: 'ml_engineer', label: '🤖 ML Engineer', prompt: 'Machine learning models' },
  // Software & IT
  { role: 'web_developer', label: '🌐 Web Developer', prompt: 'Web apps and sites' },
  { role: 'mobile_developer', label: '📲 Mobile Developer', prompt: 'Mobile apps' },
  { role: 'database_admin', label: '🗄️ Database Admin', prompt: 'Database management' },
  { role: 'api_developer', label: '🔌 API Developer', prompt: 'API integrations' },
  { role: 'security_analyst', label: '🔐 Security Analyst', prompt: 'Cybersecurity' },
  { role: 'devops_engineer', label: '🚀 DevOps', prompt: 'CI/CD and deployment' },
  { role: 'qa_tester', label: '✅ QA Tester', prompt: 'Test cases and bugs' },
  { role: 'ux_designer', label: '🖥️ UX Designer', prompt: 'UI/UX improvement' },
  // Trades & Mechanical
  { role: 'welder_specialist', label: '🔥 Welder', prompt: 'Welding and fabrication' },
  { role: 'electrician', label: '⚡ Electrician', prompt: 'Electrical systems' },
  { role: 'plumber', label: '🔧 Plumber', prompt: 'Water and plumbing' },
  { role: 'carpenter', label: '🪚 Carpenter', prompt: 'Building and structures' },
  { role: 'hvac_specialist', label: '🌡️ HVAC', prompt: 'Climate control' },
  { role: 'diesel_mechanic', label: '🛢️ Diesel Mechanic', prompt: 'Diesel engines' },
  { role: 'auto_mechanic', label: '🚗 Auto Mechanic', prompt: 'Vehicle repair' },
  { role: 'small_engine', label: '⛽ Small Engine', prompt: 'Small engine repair' },
  { role: 'hydraulics_specialist', label: '🔴 Hydraulics', prompt: 'Hydraulic systems' },
  { role: 'paint_specialist', label: '🎨 Paint', prompt: 'Painting and coatings' },
  { role: 'concrete_specialist', label: '🧱 Concrete', prompt: 'Concrete and masonry' },
  { role: 'fencing_specialist', label: '🏗️ Fencing', prompt: 'Livestock fencing' },
  { role: 'energy_advisor', label: '☀️ Energy', prompt: 'Solar and renewable' },
  // FFA & Education
  { role: 'sae_advisor', label: '🌾 SAE Advisor', prompt: 'SAE project guidance' },
  { role: 'cde_coach', label: '🏆 CDE Coach', prompt: 'CDE preparation' },
  { role: 'lde_coach', label: '🎭 LDE Coach', prompt: 'Leadership events' },
  { role: 'chapter_advisor', label: '📖 Chapter Advisor', prompt: 'Chapter management' },
  { role: 'public_speaking', label: '🎤 Public Speaking', prompt: 'Speech coaching' },
  { role: 'debate_coach', label: '🗣️ Debate Coach', prompt: 'Parliamentary procedure' },
  { role: 'essay_writer', label: '✏️ Essay Writer', prompt: 'Human-sounding essays' },
  { role: 'scholarship_advisor', label: '🎓 Scholarships', prompt: 'Scholarship applications' },
  { role: 'college_advisor', label: '🏫 College Advisor', prompt: 'College admissions' },
  { role: 'mentor', label: '🧑‍🏫 Mentor', prompt: 'Career guidance' },
  { role: 'historian', label: '📜 Historian', prompt: 'Ag and FFA history' },
  // Business & Finance
  { role: 'ag_economist', label: '📈 Ag Economist', prompt: 'Market analysis' },
  { role: 'grant_writer', label: '📝 Grant Writer', prompt: 'Grant proposals' },
  { role: 'legal_advisor', label: '⚖️ Legal Advisor', prompt: 'Farm law and regulations' },
  { role: 'insurance_advisor', label: '🛡️ Insurance', prompt: 'Crop/livestock insurance' },
  { role: 'real_estate', label: '🏡 Real Estate', prompt: 'Land evaluation' },
  { role: 'tax_specialist', label: '🧾 Tax Specialist', prompt: 'Farm taxes' },
  { role: 'supply_chain', label: '🚚 Supply Chain', prompt: 'Procurement and logistics' },
  { role: 'commodity_trader', label: '📉 Commodity Trader', prompt: 'Futures and hedging' },
  { role: 'equipment_buyer', label: '🏷️ Equipment Buyer', prompt: 'Equipment evaluation' },
  { role: 'auction_specialist', label: '🔨 Auction', prompt: 'Auction strategies' },
  { role: 'fundraising', label: '💵 Fundraising', prompt: 'Fundraising campaigns' },
  { role: 'negotiations', label: '🤝 Negotiator', prompt: 'Deal negotiations' },
  { role: 'brand_strategist', label: '🏷️ Brand Strategist', prompt: 'Brand identity' },
  // Operations & Management
  { role: 'project_manager', label: '📊 Project Manager', prompt: 'Project tracking' },
  { role: 'scrum_master', label: '🔄 Scrum Master', prompt: 'Agile workflows' },
  { role: 'hr_specialist', label: '👥 HR Specialist', prompt: 'Workforce management' },
  { role: 'safety_officer', label: '🦺 Safety Officer', prompt: 'Farm safety' },
  { role: 'compliance_officer', label: '📜 Compliance', prompt: 'USDA/EPA regulations' },
  { role: 'ranch_manager', label: '🤠 Ranch Manager', prompt: 'Daily operations' },
  { role: 'farm_hand', label: '👨‍🌾 Farm Hand', prompt: 'Practical farm tasks' },
  { role: 'inventory_manager', label: '📦 Inventory', prompt: 'Supply tracking' },
  { role: 'logistics_coordinator', label: '🗂️ Logistics', prompt: 'Transportation coordination' },
  { role: 'event_planner', label: '🎪 Event Planner', prompt: 'Event organization' },
  { role: 'cooperative_advisor', label: '🤝 Co-op Advisor', prompt: 'Cooperative management' },
  // Media & Content
  { role: 'social_media', label: '📱 Social Media', prompt: 'Social content strategy' },
  { role: 'video_producer', label: '🎬 Video Producer', prompt: 'Video production' },
  { role: 'graphic_designer', label: '🖌️ Graphic Designer', prompt: 'Visual design' },
  { role: 'photographer', label: '📸 Photographer', prompt: 'Farm photography' },
  { role: 'podcast_producer', label: '🎙️ Podcast', prompt: 'Audio content' },
  { role: 'ag_journalist', label: '📰 Ag Journalist', prompt: 'News and features' },
  { role: 'content_curator', label: '📚 Content Curator', prompt: 'Content aggregation' },
  { role: 'technical_writer', label: '📋 Technical Writer', prompt: 'Documentation' },
  // Specialty
  { role: 'food_scientist', label: '🧫 Food Scientist', prompt: 'Food safety and processing' },
  { role: 'biotech_specialist', label: '🧬 Biotech', prompt: 'Agricultural biotech' },
  { role: 'biosecurity', label: '🦠 Biosecurity', prompt: 'Disease prevention' },
  { role: 'apiculture', label: '🐝 Apiculture', prompt: 'Beekeeping' },
  { role: 'wool_fiber', label: '🧶 Wool & Fiber', prompt: 'Fiber production' },
  { role: 'grain_specialist', label: '🌾 Grain', prompt: 'Grain storage and marketing' },
  { role: 'hay_specialist', label: '🟫 Hay', prompt: 'Hay and forage' },
  { role: 'seed_specialist', label: '🌰 Seed', prompt: 'Seed selection' },
  { role: 'fertilizer_specialist', label: '💊 Fertilizer', prompt: 'Fertilizer rates' },
  { role: 'urban_ag', label: '🏙️ Urban Ag', prompt: 'Urban farming' },
  { role: 'farm_to_table', label: '🍽️ Farm to Table', prompt: 'Direct marketing' },
  { role: 'agritourism', label: '🎪 Agritourism', prompt: 'Farm tourism' },
  // Lifestyle & Misc
  { role: 'resume_builder', label: '📄 Resume Builder', prompt: 'Job applications' },
  { role: 'customer_support', label: '🎧 Customer Support', prompt: 'User assistance' },
  { role: 'translator', label: '🌐 Translator', prompt: 'Language translation' },
  { role: 'statistician', label: '📐 Statistician', prompt: 'Statistical analysis' },
  { role: 'surveyor', label: '📏 Surveyor', prompt: 'Land measurement' },
  { role: 'health_safety', label: '🏥 Health & Safety', prompt: 'Emergency and safety' },
  { role: 'volunteer_coordinator', label: '🙋 Volunteer Coord', prompt: 'Community organizing' },
  { role: 'peer_reviewer', label: '👀 Peer Reviewer', prompt: 'Proofreading and feedback' },
  { role: 'auctioneer', label: '🗣️ Auctioneer', prompt: 'Auction management' },
  { role: 'rdr2_guide', label: '🤠 RDR2 Guide', prompt: 'Red Dead Redemption 2' },
  { role: 'gaming_advisor', label: '🎮 Gaming Advisor', prompt: 'Gaming tips and mods' },
  { role: 'music_advisor', label: '🎵 Music Advisor', prompt: 'Music production' },
  { role: 'fitness_coach', label: '💪 Fitness Coach', prompt: 'Workout plans' },
  { role: 'recipe_creator', label: '👨‍🍳 Recipe Creator', prompt: 'Farm-fresh recipes' },
  { role: 'weather_forecaster', label: '☁️ Weather', prompt: 'Local forecasts' },
  { role: 'emergency_responder', label: '🚨 Emergency', prompt: 'Emergency response' },
  { role: 'hunting_advisor', label: '🎯 Hunting Advisor', prompt: 'Hunting and outdoors' },
  { role: 'fishing_advisor', label: '🎣 Fishing Advisor', prompt: 'Pond management' },
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
        : prev.length < 150
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
        model: 'gpt-4o-mini',
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
          <Badge variant="secondary" className="text-xs">Up to 150 agents</Badge>
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
              <p className="text-sm font-medium">Select Agents ({selectedRoles.length}/150)</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">All {ALL_ROLES.length}</Button>
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
