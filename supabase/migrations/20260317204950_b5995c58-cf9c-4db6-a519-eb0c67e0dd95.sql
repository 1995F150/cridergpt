
INSERT INTO public.cridergpt_training_data (
  dataset_name, description, category, data_type, content, status, metadata
) VALUES (
  'Snapchat Lens Promotion Strategy',
  'Lens concepts designed to promote CriderGPT based on audience analytics data',
  'marketing',
  'lens_strategy',
  '# Snapchat Lens Promotion Strategy for CriderGPT

## Audience Profile (from Vibe Check Bot analytics)
- 75.57% United States
- Top interests: Gamers, Sports Fans, Casual & Mobile Gamers, Console & PC Gamers, Music Fans
- Total Reach: 3,109 | Plays: 3,088 | Shares: 33
- Spike period: March 8-15, 2026 (peak ~750/day on March 9)

## Lens Concepts (Priority Order)

### 1. Gaming Personality Quiz (HIGHEST PRIORITY)
- Targets #1 audience: Gamers
- Random wheel mechanic: "CriderGPT says you are a… Sneaky Outlaw / Legendary Hunter / Moonshine King / Speed Demon / Loot Goblin"
- Brand wheel with CriderGPT logo + CTA: "Full AI at cridergpt.lovable.app"
- Highly shareable format to boost share count
- RDR2-themed variants align with RDR2 Guide content on the site

### 2. AI Roast Mode Lens
- Selfie filter with rotating funny text overlays
- Example roasts: "CriderGPT says: You look like you rage-quit in Chapter 2" / "You definitely Google cheat codes" / "Main character energy… of the tutorial level"
- Pre-write 15-20 roasts that rotate randomly
- Viral share potential — people love sharing roasts
- Connects to CriderGPT Roast Mode feature

### 3. "Ask CriderGPT" AR Chat Lens
- Point camera at anything, CriderGPT-branded overlay gives a fun AI-style response
- Simulates talking to an AI through the camera
- Strongest direct CTA to the actual app
- More complex Lens Studio build

### 4. Farm Life / FFA Filter
- FFA jacket overlay, tractor backgrounds, farm score generator
- Niche but loyal audience — ag/rural community
- Cross-promotes FFA Dashboard feature on CriderGPT
- Best for long-term ag-tech brand identity
- "Rate My Farm Setup" score randomizer

## Branding Rules for All Lenses
- Always include CriderGPT logo (use /cridergpt-logo.png style)
- Consistent color scheme matching CriderGPT app theme
- Include swipe-up link or visible text: cridergpt.lovable.app
- Use CriderGPT name prominently in lens title and description

## Content Calendar Suggestion
- Week 1: Launch Gaming Personality Quiz
- Week 2: Launch AI Roast Mode
- Week 3: Launch Ask CriderGPT AR
- Week 4: Launch Farm Life / FFA Filter
- Ongoing: Track analytics per lens, double down on highest performer',
  'active',
  '{"source": "promotion_strategy", "importance": "high", "type": "marketing_playbook", "based_on": "snapchat_lens_analytics"}'::jsonb
);
