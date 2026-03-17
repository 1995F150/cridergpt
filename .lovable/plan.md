

# Add PC Modding Guide Tab + SEO Keywords to RDR2 Guide

## What We're Adding

A fourth tab — **"PC Mods"** — to the existing RDR2 Guide panel with step-by-step installation tutorials for the major RDR2 PC modding tools, plus SEO keyword updates so this content ranks on Google.

## New Content (PC Mods Tab)

Tutorials added to a new `moddingGuides` array, same expandable card format as existing tutorials:

1. **How to Install Script Hook RDR2** — Download from Alexander Blade's site, extract `ScriptHookRDR2.dll` + `dinput8.dll` to game root, version matching, updating after game patches
2. **How to Install Lenny's Mod Loader (LML)** — Download, extract to game folder, `lml` folder structure, how mods go inside `lml/`, load order basics
3. **How to Install Rampage Trainer** — Requires Script Hook, extract to game root, key bindings (F5 to open), menu navigation, spawning/teleporting/weather controls
4. **How to Install .ASI Mods** — Requires Script Hook, just drop `.asi` files in game root, common examples
5. **How to Install XML/Data Mods with LML** — Create mod folder inside `lml/`, `install.xml` structure, replacing vs merging game files
6. **Troubleshooting — Mods Not Working** — Game version mismatch, antivirus blocking DLLs, verifying game files resets mods, load order conflicts, how to disable all mods quickly

## Tab Structure

Add a `Monitor` (or `Wrench`) icon tab labeled "PC Mods" next to the existing Crafting/Cooking/Tutorials tabs. Uses the same search filtering — users can search "rampage" or "script hook" and find the right guide.

## SEO Changes

Add to `src/config/seo.ts`:
```
"rdr2-guide": {
  title: "RDR2 Guide — Crafting Recipes, Tutorials & PC Mods | CriderGPT",
  description: "Complete Red Dead Redemption 2 guide. Crafting recipes, cooking, hunting tips, and PC modding tutorials for Script Hook, Lenny's Mod Loader, and Rampage Trainer.",
  keywords: "RDR2 crafting recipes, Red Dead Redemption 2 guide, RDR2 cooking, RDR2 PC mods, how to install Script Hook RDR2, Lenny Mod Loader RDR2, Rampage Trainer RDR2, RDR2 mod tutorial, RDR2 hunting guide"
}
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/panels/RDR2GuidePanel.tsx` | Add `moddingGuides` data array, new "PC Mods" tab with filtered cards, update TabsList to 4 columns |
| `src/config/seo.ts` | Add `rdr2-guide` SEO entry with modding + recipe keywords |
| `src/pages/Index.tsx` | Apply `rdr2-guide` SEO config when that panel is active |

