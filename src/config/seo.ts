export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  canonical?: string;
  ogImage?: string;
}

export const seoConfig: Record<string, SEOConfig> = {
  default: {
    title: "CriderGPT | AI Systems for FS22 & FS25",
    description: "CriderGPT is an AI-powered farming assistant built by Jessie Crider for FS22 and FS25. It helps players manage production chains, monitor field data, and automate maintenance, bringing real-world AI logic into Farming Simulator.",
    keywords: "CriderGPT, CriderGPT Helper, Apollo Core, FS25 Mods, FS22 Mods, AI Farming Assistant, Farming Simulator Tools, FS25 Scripts, Jessie Crider",
    canonical: "https://cridergpt.lovable.app/",
    ogImage: "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png"
  },
  chat: {
    title: "AI Chat Assistant | CriderGPT",
    description: "Chat with CriderGPT's advanced AI assistant. Get instant help with farming strategies, production planning, and real-time advice for FS22 and FS25.",
    keywords: "AI Chat, CriderGPT Assistant, Farming AI, FS25 AI Helper, Smart Farming Chat, AI Conversation",
    canonical: "https://cridergpt.lovable.app/chat"
  },
  calculators: {
    title: "Smart Calculators | CriderGPT Tools",
    description: "Access powerful calculators for farming, finance, welding, voltage, mechanics, and more. Optimize your FS25 farm operations with precision tools.",
    keywords: "Farming Calculator, Financial Calculator, Welding Calculator, Voltage Calculator, Agriculture Tools, FS25 Calculators",
    canonical: "https://cridergpt.lovable.app/calculators"
  },
  ffa: {
    title: "FFA Dashboard | CriderGPT Agriculture Management",
    description: "Manage your FFA projects with CriderGPT. Track livestock, plan crops, monitor equipment, and maintain detailed agricultural records.",
    keywords: "FFA Dashboard, FFA Record Book, Crop Planner, Livestock Tracker, Agriculture Management, Farm Records",
    canonical: "https://cridergpt.lovable.app/ffa"
  },
  "ai-image": {
    title: "AI Image Generator | CriderGPT",
    description: "Generate custom images with AI for your farming projects, presentations, and documentation. Powered by advanced AI models.",
    keywords: "AI Image Generator, AI Art, Image Creation, Farming Images, FS25 Graphics",
    canonical: "https://cridergpt.lovable.app/ai-image"
  },
  calendar: {
    title: "Calendar & Event Manager | CriderGPT",
    description: "Organize your farming schedule, track maintenance dates, and manage seasonal activities with CriderGPT's calendar system.",
    keywords: "Farm Calendar, Event Management, Seasonal Planning, Maintenance Tracking, FS25 Schedule",
    canonical: "https://cridergpt.lovable.app/calendar"
  },
  invoices: {
    title: "Invoice Creator | CriderGPT Business Tools",
    description: "Create professional invoices for your farming business. Manage payments, track expenses, and generate detailed financial reports.",
    keywords: "Farm Invoices, Invoice Creator, Agricultural Business, Payment Tracking, Financial Management",
    canonical: "https://cridergpt.lovable.app/invoices"
  },
  code: {
    title: "Code Generator | CriderGPT Development",
    description: "Generate custom code and scripts for FS22 and FS25 mods. Build automation systems and enhance your farming experience.",
    keywords: "FS25 Scripts, FS22 Code, Mod Development, Code Generator, Farming Simulator Programming",
    canonical: "https://cridergpt.lovable.app/code"
  },
  maps: {
    title: "Map Builder | CriderGPT",
    description: "Design and plan custom farming maps for FS25. Visualize field layouts, production chains, and optimize your farm design.",
    keywords: "FS25 Map Builder, Farm Planning, Field Layout, Map Design, Agricultural Planning",
    canonical: "https://cridergpt.lovable.app/maps"
  },
  "document-ai": {
    title: "Document AI Analysis | CriderGPT",
    description: "Analyze agricultural documents, extract data, and get AI-powered insights from PDFs, images, and text files.",
    keywords: "Document Analysis, AI Document Reader, PDF Analysis, Agricultural Documents, Data Extraction",
    canonical: "https://cridergpt.lovable.app/document-ai"
  },
  "cloud-gaming": {
    title: "Cloud Gaming | CriderGPT Platform",
    description: "Access cloud gaming services for Farming Simulator and more. Play FS25 from anywhere with GeForce NOW, Xbox Cloud, and other platforms.",
    keywords: "Cloud Gaming, FS25 Cloud, GeForce NOW, Xbox Cloud Gaming, Stream Farming Simulator",
    canonical: "https://cridergpt.lovable.app/cloud-gaming"
  },
  projects: {
    title: "Project Manager | CriderGPT",
    description: "Manage farming projects, track progress, and collaborate on agricultural initiatives with CriderGPT's project management tools.",
    keywords: "Farm Projects, Project Management, Agricultural Planning, Task Tracking, Team Collaboration",
    canonical: "https://cridergpt.lovable.app/projects"
  },
  social: {
    title: "Social Network | CriderGPT Community",
    description: "Connect with other farmers, share experiences, and collaborate on FS25 projects in the CriderGPT community.",
    keywords: "Farming Community, Social Network, FS25 Community, Farmer Connections, Agricultural Networking",
    canonical: "https://cridergpt.lovable.app/social"
  }
};

export const getPageSEO = (page: string): SEOConfig => {
  return seoConfig[page] || seoConfig.default;
};
