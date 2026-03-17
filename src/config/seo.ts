export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  canonical?: string;
  ogImage?: string;
}

export const seoConfig: Record<string, SEOConfig> = {
  default: {
    title: "CriderGPT — Official AI Assistant App by Jessie Crider",
    description: "CriderGPT is the official AI-powered assistant app built by Jessie Crider. Chat with AI, use smart calculators, manage FFA records, generate images, track livestock, and more. This is the real app — not the landing page.",
    keywords: "CriderGPT, CriderGPT app, CriderGPT official, CriderGPT AI, CriderGPT Helper, Jessie Crider AI, Jessie Crider app, CriderGPT login, AI farming assistant, FS25 AI, FS22 AI tools, Farming Simulator assistant, Apollo Core",
    canonical: "https://cridergpt.lovable.app/",
    ogImage: "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png"
  },
  chat: {
    title: "AI Chat — CriderGPT Official App",
    description: "Chat with CriderGPT's AI assistant. Get instant help with farming strategies, homework, production planning, and real-time advice. Built by Jessie Crider.",
    keywords: "CriderGPT chat, CriderGPT AI chat, AI assistant, talk to CriderGPT, Jessie Crider AI, farming AI chat, FS25 AI helper",
    canonical: "https://cridergpt.lovable.app/chat"
  },
  calculators: {
    title: "Smart Calculators — CriderGPT Official App",
    description: "Free calculators for farming, finance, welding, voltage, mechanics, and more. Optimize your FS25 farm or solve real-world math — all inside CriderGPT.",
    keywords: "CriderGPT calculator, farming calculator, welding calculator, voltage calculator, financial calculator, FS25 calculator, free calculator app",
    canonical: "https://cridergpt.lovable.app/calculators"
  },
  ffa: {
    title: "FFA Dashboard — CriderGPT Official App",
    description: "Manage your FFA projects with CriderGPT. Track livestock, plan crops, log records, and stay organized for your chapter — all in one dashboard.",
    keywords: "CriderGPT FFA, FFA record book, FFA dashboard, crop planner, livestock tracker, agriculture management, FFA app",
    canonical: "https://cridergpt.lovable.app/ffa"
  },
  "ai-image": {
    title: "AI Image Generator — CriderGPT Official App",
    description: "Generate custom AI images for your projects, presentations, and social media. Powered by advanced AI models inside CriderGPT.",
    keywords: "CriderGPT image generator, AI art, AI image creator, free AI images, CriderGPT AI image",
    canonical: "https://cridergpt.lovable.app/ai-image"
  },
  calendar: {
    title: "Calendar & Events — CriderGPT Official App",
    description: "Organize your schedule, track farm maintenance, and manage seasonal activities with CriderGPT's built-in calendar system.",
    keywords: "CriderGPT calendar, farm calendar, event manager, schedule planner, CriderGPT events",
    canonical: "https://cridergpt.lovable.app/calendar"
  },
  invoices: {
    title: "Invoice Creator — CriderGPT Official App",
    description: "Create professional invoices for your business. Track payments, manage expenses, and generate reports — all inside CriderGPT.",
    keywords: "CriderGPT invoices, invoice creator, farm invoices, free invoice app, payment tracking",
    canonical: "https://cridergpt.lovable.app/invoices"
  },
  code: {
    title: "Code Generator — CriderGPT Official App",
    description: "Generate custom code and scripts for FS22/FS25 mods or any project. Built-in code editor and AI-powered generation.",
    keywords: "CriderGPT code generator, FS25 scripts, FS22 code, mod development, AI code generator",
    canonical: "https://cridergpt.lovable.app/code"
  },
  maps: {
    title: "Map Builder — CriderGPT Official App",
    description: "Design and plan custom farming maps for FS25. Visualize field layouts, production chains, and optimize your farm.",
    keywords: "CriderGPT map builder, FS25 map, farm planning, field layout, map designer",
    canonical: "https://cridergpt.lovable.app/maps"
  },
  "document-ai": {
    title: "Document AI — CriderGPT Official App",
    description: "Upload and analyze documents with AI. Extract data from PDFs, images, and text files — get instant insights inside CriderGPT.",
    keywords: "CriderGPT document AI, PDF analysis, document reader, AI data extraction, document scanner",
    canonical: "https://cridergpt.lovable.app/document-ai"
  },
  "cloud-gaming": {
    title: "Cloud Gaming — CriderGPT Official App",
    description: "Access cloud gaming services for Farming Simulator and more. Quick links to GeForce NOW, Xbox Cloud, and other platforms.",
    keywords: "CriderGPT cloud gaming, FS25 cloud, GeForce NOW, Xbox Cloud Gaming, stream Farming Simulator",
    canonical: "https://cridergpt.lovable.app/cloud-gaming"
  },
  projects: {
    title: "Project Manager — CriderGPT Official App",
    description: "Manage projects, track progress, and stay organized with CriderGPT's built-in project management tools.",
    keywords: "CriderGPT projects, project manager, task tracker, farm project planner",
    canonical: "https://cridergpt.lovable.app/projects"
  },
  social: {
    title: "Community — CriderGPT Official App",
    description: "Connect with other CriderGPT users, share experiences, and collaborate on farming projects in the community hub.",
    keywords: "CriderGPT community, CriderGPT social, farming community, FS25 community",
    canonical: "https://cridergpt.lovable.app/social"
  },
  "rdr2-guide": {
    title: "RDR2 Guide — Crafting Recipes, Tutorials & PC Mods | CriderGPT",
    description: "Complete Red Dead Redemption 2 guide. Crafting recipes, cooking, hunting tips, and PC modding tutorials for Script Hook, Lenny's Mod Loader, and Rampage Trainer.",
    keywords: "RDR2 crafting recipes, Red Dead Redemption 2 guide, RDR2 cooking recipes, RDR2 PC mods, how to install Script Hook RDR2, Lenny Mod Loader RDR2, Rampage Trainer RDR2, RDR2 mod tutorial, RDR2 hunting guide, RDR2 tonics, RDR2 ammo crafting",
    canonical: "https://cridergpt.lovable.app/rdr2-guide",
    ogImage: "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png"
  },
  livestock: {
    title: "Livestock Manager — CriderGPT Official App",
    description: "Track your animals, health records, production data, and breeding history. Full livestock management inside CriderGPT.",
    keywords: "CriderGPT livestock, animal tracker, livestock management, cattle tracker, farm animals app",
    canonical: "https://cridergpt.lovable.app/livestock"
  }
};

export const getPageSEO = (page: string): SEOConfig => {
  return seoConfig[page] || seoConfig.default;
};
