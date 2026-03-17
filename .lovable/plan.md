

# Red Dead Redemption 2 Guide Panel

## What We're Building

A new **"RDR2 Guide"** navigation tab under the TOOLS group that serves as a crafting recipe book, tutorial guide, and general reference for Red Dead Redemption 2. This is a static, SEO-friendly content page — no API needed. It targets gamers searching for "RDR2 crafting recipes," "Red Dead cooking recipes," etc., driving organic traffic to CriderGPT.

## Why This Works for Growth

- RDR2 has a massive active player base still searching for guides
- "RDR2 crafting recipes" and similar queries get significant Google traffic
- Once gamers land on this page, they see CriderGPT's AI chat and other tools
- No login required to view — public SEO content with signup nudges

## Content

The panel will include:
- **Crafting Recipes** — Tonics, ammo, throwables, horse items (organized by category with ingredients, locations)
- **Cooking Recipes** — All campfire recipes with ingredients and effects
- **Tutorial Guides** — Hunting tips, fishing guide, horse bonding, money-making methods
- Searchable/filterable so users can quickly find what they need
- A CTA banner: "Ask CriderGPT anything about RDR2" linking to the chat

All data is hardcoded (JSON object in the component) — no database needed.

## Files to Change

| File | Change |
|------|--------|
| `src/components/panels/RDR2GuidePanel.tsx` | **New** — Main panel with recipe book, cooking, and tutorial tabs |
| `src/pages/Index.tsx` | Add `'rdr2-guide'` to PanelType union + render the panel |
| `src/components/NavigationSidebar.tsx` | Add nav item under TOOLS group |
| `src/components/MobileNavigation.tsx` | Add matching mobile nav entry |

## Technical Details

- New PanelType: `'rdr2-guide'`
- Icon: `Gamepad2` or a crosshair icon from lucide
- Navigation placement: TOOLS group, near Cloud Gaming / Mod Tools
- Component structure: Tabs for Crafting / Cooking / Tutorials, each with a search bar and card grid
- All recipe data defined as a const array at the top of the component — roughly 30-40 popular recipes to start
- Fully responsive for the 411px mobile viewport the user is on

