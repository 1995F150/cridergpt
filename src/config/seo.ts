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
  livestock: {
    title: "Livestock Manager — Track Animals & Health Records | CriderGPT",
    description: "Track your animals, health records, vaccinations, weights, and breeding history. Full livestock management for FFA members and farmers — free inside CriderGPT.",
    keywords: "CriderGPT livestock, animal tracker, livestock management, cattle tracker, farm animals app, FFA livestock, SAE animal tracking",
    canonical: "https://cridergpt.lovable.app/livestock"
  },
  "rdr2-guide": {
    title: "RDR2 Guide — Crafting Recipes, Tutorials & PC Mods | CriderGPT",
    description: "Complete Red Dead Redemption 2 guide. Crafting recipes, cooking, hunting tips, and PC modding tutorials for Script Hook, Lenny's Mod Loader, and Rampage Trainer.",
    keywords: "RDR2 crafting recipes, Red Dead Redemption 2 guide, RDR2 cooking recipes, RDR2 PC mods, how to install Script Hook RDR2, Lenny Mod Loader RDR2, Rampage Trainer RDR2, RDR2 mod tutorial, RDR2 hunting guide, RDR2 tonics, RDR2 ammo crafting",
    canonical: "https://cridergpt.lovable.app/rdr2-guide",
    ogImage: "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png"
  },
  "voice-studio": {
    title: "Voice Studio — AI Voice Cloning & Music | CriderGPT",
    description: "Clone voices, generate speech, and create music with AI. CriderGPT's Voice Studio lets you build custom voice profiles and audio content.",
    keywords: "AI voice cloning, text to speech, voice studio, CriderGPT voice, AI music generator, voice synthesis",
    canonical: "https://cridergpt.lovable.app/voice-studio"
  },
  "mod-tools": {
    title: "FS25 Mod Tools — Build & Debug Farming Simulator Mods | CriderGPT",
    description: "Create, edit, and debug Farming Simulator 22/25 mods. ZIP packaging, XML analysis, and AI-powered mod consulting built into CriderGPT.",
    keywords: "FS25 mod tools, Farming Simulator mod creator, FS22 mod builder, mod XML editor, Farming Simulator modding, CriderGPT mod tools",
    canonical: "https://cridergpt.lovable.app/mod-tools"
  },
  guardian: {
    title: "Guardian Dashboard — Parental Controls | CriderGPT",
    description: "Monitor your child's CriderGPT usage with the Guardian Dashboard. Set content filters, view activity timelines, and get real-time alerts.",
    keywords: "CriderGPT parental controls, guardian dashboard, child safety AI, family controls, content monitoring",
    canonical: "https://cridergpt.lovable.app/guardian"
  },
  "shared-spending": {
    title: "Shared Spending Tracker — Split Bills & Expenses | CriderGPT",
    description: "Track shared expenses with friends, roommates, or family. Split bills, log payments, and keep spending groups organized inside CriderGPT.",
    keywords: "shared spending, split bills, expense tracker, group expenses, CriderGPT spending tracker",
    canonical: "https://cridergpt.lovable.app/shared-spending"
  },
  receipts: {
    title: "Receipt Scanner — AI Receipt Analysis | CriderGPT",
    description: "Scan and organize receipts with AI. Extract totals, dates, and items automatically for expense tracking and FFA record books.",
    keywords: "receipt scanner, AI receipt reader, expense tracking, CriderGPT receipts, FFA expense log",
    canonical: "https://cridergpt.lovable.app/receipts"
  },
  frequency: {
    title: "Frequency Generator — Audio Tones & Sound Tools | CriderGPT",
    description: "Generate precise audio frequencies and tones. Useful for testing speakers, tuning instruments, and audio diagnostics.",
    keywords: "frequency generator, tone generator, audio tools, sound generator, Hz generator, CriderGPT frequency",
    canonical: "https://cridergpt.lovable.app/frequency"
  },
  sensors: {
    title: "Sensor Dashboard — Device Sensor Monitoring | CriderGPT",
    description: "Monitor your device's sensors in real-time. Accelerometer, gyroscope, compass, and environmental data all in one dashboard.",
    keywords: "sensor dashboard, device sensors, accelerometer, gyroscope, compass app, CriderGPT sensors",
    canonical: "https://cridergpt.lovable.app/sensors"
  },
  "snapchat-lens": {
    title: "Vibe Check Bot — CriderGPT Snapchat Lens",
    description: "Try the Vibe Check Bot Snapchat Lens by CriderGPT! AI-powered personality quiz filter. Scan the Snapcode or tap to try it now.",
    keywords: "CriderGPT Snapchat lens, Vibe Check Bot, Snapchat AI filter, CriderGPT filter, personality quiz Snapchat, CriderGPT snap",
    canonical: "https://cridergpt.lovable.app/snapchat-lens",
    ogImage: "https://cridergpt.lovable.app/lovable-uploads/1b1242ff-1483-4ec4-ba1d-41b6c2478a76.png"
  },
  plan: {
    title: "Pricing & Plans — CriderGPT Official App",
    description: "Choose your CriderGPT plan. Free, Plus, Pro, or Lifetime access. AI chat, calculators, FFA tools, livestock tracking, and more.",
    keywords: "CriderGPT pricing, CriderGPT plans, CriderGPT free, CriderGPT pro, CriderGPT lifetime, AI app pricing",
    canonical: "https://cridergpt.lovable.app/plan"
  },
  projects: {
    title: "Project Manager — CriderGPT Official App",
    description: "Manage projects, track progress, and stay organized with CriderGPT's built-in project management tools.",
    keywords: "CriderGPT projects, project manager, task tracker, farm project planner",
    canonical: "https://cridergpt.lovable.app/projects"
  },
  contact: {
    title: "Contact — CriderGPT Official App",
    description: "Get in touch with the CriderGPT team. Report bugs, request features, or say hello to Jessie Crider.",
    keywords: "CriderGPT contact, CriderGPT support, contact Jessie Crider, CriderGPT feedback",
    canonical: "https://cridergpt.lovable.app/contact"
  }
};

export const getPageSEO = (page: string): SEOConfig => {
  return seoConfig[page] || seoConfig.default;
};
