import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Beaker, Flame, BookOpen, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ── Data ──────────────────────────────────────────────

interface Recipe {
  name: string;
  category: string;
  ingredients: string[];
  effect: string;
  location?: string;
}

interface Tutorial {
  title: string;
  summary: string;
  tips: string[];
}

const craftingRecipes: Recipe[] = [
  { name: 'Potent Health Cure', category: 'Tonics', ingredients: ['Ginseng x2', 'Yarrow'], effect: 'Restores health core and fortifies it', location: 'Campfire / Camp' },
  { name: 'Potent Snake Oil', category: 'Tonics', ingredients: ['Indian Tobacco x2'], effect: 'Restores Dead Eye core and fortifies it', location: 'Campfire / Camp' },
  { name: 'Potent Miracle Tonic', category: 'Tonics', ingredients: ['Sage x2', 'Ginseng', 'Yarrow'], effect: 'Restores and fortifies all cores', location: 'Campfire / Camp' },
  { name: 'Special Health Cure', category: 'Tonics', ingredients: ['Ginseng x3', 'Yarrow x2'], effect: 'Fully restores and greatly fortifies health', location: 'Campfire / Camp' },
  { name: 'Special Snake Oil', category: 'Tonics', ingredients: ['Indian Tobacco x3'], effect: 'Fully restores and greatly fortifies Dead Eye', location: 'Campfire / Camp' },
  { name: 'Special Miracle Tonic', category: 'Tonics', ingredients: ['Sage x3', 'Ginseng x2', 'Yarrow x2'], effect: 'Fully restores and greatly fortifies all cores', location: 'Campfire / Camp' },
  { name: 'Horse Stimulant', category: 'Horse', ingredients: ['Sage', 'Ginseng'], effect: 'Restores horse stamina core', location: 'Campfire / Camp' },
  { name: 'Potent Horse Stimulant', category: 'Horse', ingredients: ['Sage x2', 'Ginseng'], effect: 'Restores and fortifies horse stamina', location: 'Campfire / Camp' },
  { name: 'Horse Medicine', category: 'Horse', ingredients: ['Yarrow', 'Ginseng'], effect: 'Restores horse health core', location: 'Campfire / Camp' },
  { name: 'Potent Horse Medicine', category: 'Horse', ingredients: ['Yarrow x2', 'Ginseng'], effect: 'Restores and fortifies horse health', location: 'Campfire / Camp' },
  { name: 'Regular Arrows', category: 'Ammo', ingredients: ['Arrow Shaft', 'Flight Feather'], effect: 'Standard arrow', location: 'Campfire / Camp' },
  { name: 'Small Game Arrows', category: 'Ammo', ingredients: ['Arrow', 'Shotgun Shell', 'Flight Feather'], effect: 'Perfect pelts from small animals', location: 'Campfire / Camp' },
  { name: 'Poison Arrows', category: 'Ammo', ingredients: ['Arrow', 'Oleander Sage'], effect: 'Poisons target over time', location: 'Campfire / Camp' },
  { name: 'Fire Arrows', category: 'Ammo', ingredients: ['Arrow', 'Animal Fat', 'Flight Feather'], effect: 'Sets target on fire', location: 'Campfire / Camp' },
  { name: 'Improved Arrows', category: 'Ammo', ingredients: ['Arrow', 'Flight Feather'], effect: 'Greater damage than regular arrows', location: 'Campfire / Camp' },
  { name: 'Dynamite Arrow', category: 'Ammo', ingredients: ['Arrow', 'Dynamite', 'Flight Feather'], effect: 'Explosive on impact', location: 'Campfire / Camp' },
  { name: 'Volatile Dynamite', category: 'Throwables', ingredients: ['Dynamite', 'Animal Fat', 'High Velocity Cartridge'], effect: 'More powerful explosion', location: 'Campfire / Camp' },
  { name: 'Fire Bottle', category: 'Throwables', ingredients: ['Moonshine', 'Animal Fat'], effect: 'Creates fire on impact', location: 'Campfire / Camp' },
  { name: 'Volatile Fire Bottle', category: 'Throwables', ingredients: ['Moonshine', 'Animal Fat', 'Oleander Sage'], effect: 'Larger fire area & poisons', location: 'Campfire / Camp' },
  { name: 'Tomahawk', category: 'Throwables', ingredients: ['Hatchet', 'Flight Feather'], effect: 'Throwable melee weapon', location: 'Campfire / Camp' },
  { name: 'Improved Tomahawk', category: 'Throwables', ingredients: ['Tomahawk', 'Homing Tomahawk Pamphlet'], effect: 'Better accuracy & damage', location: 'Campfire / Camp' },
  { name: 'Poison Throwing Knife', category: 'Throwables', ingredients: ['Throwing Knife', 'Oleander Sage'], effect: 'Silent kill with poison', location: 'Campfire / Camp' },
  { name: 'Cover Scent Lotion', category: 'Hunting', ingredients: ['Sage', 'Vanilla Flower'], effect: 'Masks your scent from animals', location: 'Campfire / Camp' },
  { name: 'Potent Predator Bait', category: 'Hunting', ingredients: ['Gritty Fish Meat', 'Blackberry'], effect: 'Attracts predators', location: 'Campfire / Camp' },
  { name: 'Potent Herbivore Bait', category: 'Hunting', ingredients: ['Vanilla Flower', 'Hummingbird Sage'], effect: 'Attracts herbivores', location: 'Campfire / Camp' },
];

const cookingRecipes: Recipe[] = [
  { name: 'Plain Venison', category: 'Meat', ingredients: ['Stringy Meat'], effect: 'Restores health core (slightly)' },
  { name: 'Seasoned Venison', category: 'Meat', ingredients: ['Stringy Meat', 'Oregano'], effect: 'Restores health core (moderately)' },
  { name: 'Thyme Venison', category: 'Meat', ingredients: ['Stringy Meat', 'Thyme'], effect: 'Restores & fortifies Dead Eye' },
  { name: 'Minty Venison', category: 'Meat', ingredients: ['Stringy Meat', 'Wild Mint'], effect: 'Restores & fortifies health' },
  { name: 'Oregano Venison', category: 'Meat', ingredients: ['Stringy Meat', 'Oregano'], effect: 'Restores & fortifies stamina' },
  { name: 'Plain Big Game', category: 'Meat', ingredients: ['Big Game Meat'], effect: 'Restores all cores (slightly)' },
  { name: 'Seasoned Big Game', category: 'Meat', ingredients: ['Big Game Meat', 'Oregano'], effect: 'Restores all cores (moderately)' },
  { name: 'Thyme Big Game', category: 'Meat', ingredients: ['Big Game Meat', 'Thyme'], effect: 'Restores all cores & fortifies Dead Eye' },
  { name: 'Minty Big Game', category: 'Meat', ingredients: ['Big Game Meat', 'Wild Mint'], effect: 'Restores all cores & fortifies health' },
  { name: 'Oregano Big Game', category: 'Meat', ingredients: ['Big Game Meat', 'Oregano'], effect: 'Restores all cores & fortifies stamina' },
  { name: 'Plain Flaky Fish', category: 'Fish', ingredients: ['Flaky Fish Meat'], effect: 'Restores health core' },
  { name: 'Seasoned Flaky Fish', category: 'Fish', ingredients: ['Flaky Fish Meat', 'Oregano'], effect: 'Restores health core (moderately)' },
  { name: 'Plain Succulent Fish', category: 'Fish', ingredients: ['Succulent Fish Meat'], effect: 'Restores health & stamina' },
  { name: 'Seasoned Succulent Fish', category: 'Fish', ingredients: ['Succulent Fish Meat', 'Oregano'], effect: 'Restores health & stamina (moderately)' },
  { name: 'Plain Bird', category: 'Poultry', ingredients: ['Plump Bird Meat'], effect: 'Restores health core' },
  { name: 'Thyme Bird', category: 'Poultry', ingredients: ['Plump Bird Meat', 'Thyme'], effect: 'Restores health & fortifies Dead Eye' },
  { name: 'Minty Bird', category: 'Poultry', ingredients: ['Plump Bird Meat', 'Wild Mint'], effect: 'Restores & fortifies health' },
];

const tutorials: Tutorial[] = [
  {
    title: 'Perfect Pelts — Hunting Guide',
    summary: 'How to get 3-star pelts every time for crafting and the Trapper.',
    tips: [
      'Study the animal first with binoculars to learn its quality (1–3 stars).',
      'Only hunt 3-star animals — lower quality can never yield perfect pelts.',
      'Use the correct weapon: Varmint Rifle for small, Rifle for medium, Rolling Block for large.',
      'Small Game Arrows (crafted) are required for tiny animals like squirrels and frogs.',
      'Aim for the head or critical area for a clean kill — this preserves pelt quality.',
      'Use Cover Scent Lotion and approach from downwind.',
    ],
  },
  {
    title: 'Fishing — Legendary Fish & Tips',
    summary: 'Catch every fish including all 13 Legendary species.',
    tips: [
      'Buy a fishing rod from the Bait Shop in Lagras after Chapter 2.',
      'Use the correct lure: River Lure, Lake Lure, or Swamp Lure depending on location.',
      'Legendary Fish only bite special lures — buy from the Bait Shop.',
      'Reel slowly when the fish is fighting (controller vibrating), reel fast when it stops.',
      'Pull the rod left/right opposite the fish\'s direction to tire it faster.',
      'Mail Legendary Fish to Jeremy Gill for rewards.',
    ],
  },
  {
    title: 'Horse Bonding — Level 4 Fast',
    summary: 'Max out your horse bond for the best handling and abilities.',
    tips: [
      'Lead your horse on foot (hold the lead) for passive bonding XP.',
      'Brush your horse after it gets dirty — each brush gives bonding.',
      'Feed your horse when its cores are low — hay, oats, carrots all work.',
      'Pat your horse while riding (left stick click) for steady bonding gain.',
      'Calm your horse during stressful events (predators, gunfire) for bonus XP.',
      'Level 4 unlocks skid turns, piaffe, and rearing on command.',
    ],
  },
  {
    title: 'Money Making — Early & Late Game',
    summary: 'Best methods to earn money at every stage of the game.',
    tips: [
      'Early: Loot every body and search every building — jewelry sells well at the Fence.',
      'Treasure maps (found on random NPCs) lead to gold bars worth $500 each.',
      'Hunt and sell pelts to the Trapper — perfect pelts are worth significantly more.',
      'The Aberdeen Pig Farm trick: visit, lose your money, return after the epilogue to reclaim it all.',
      'Play Poker in Saint Denis for steady income once you learn the AI patterns.',
      'Late game: do bounties and stranger missions for reliable pay.',
    ],
  },
  {
    title: 'Dead Eye — Mastering the System',
    summary: 'How Dead Eye works and evolves through the story.',
    tips: [
      'Level 1–2: Automatically marks targets while in Dead Eye.',
      'Level 3 (Chapter 2): You manually paint targets with R1/RB.',
      'Level 4 (Chapter 5): Critical areas (head, heart) glow while in Dead Eye.',
      'Level 5 (Chapter 6): Critical areas glow brighter, even on animals.',
      'Chewing tobacco, snake oil, and Indian Tobacco all restore Dead Eye.',
      'Use Dead Eye in every fight to level it up faster.',
    ],
  },
  {
    title: 'Camp Upgrades — What to Buy First',
    summary: 'Prioritize camp upgrades for the best quality-of-life improvements.',
    tips: [
      'First: Leather Working Tools (from the ledger) — unlocks satchel upgrades from Pearson.',
      'Second: Fast Travel Map (from Arthur\'s tent upgrade in the ledger).',
      'Donate hunting carcasses to Pearson for camp provisions — keeps morale high.',
      'Buy the chicken coop and horse station for passive camp bonuses.',
      'The Legend of the East Satchel (all crafted satchels) lets you carry 99 of every item.',
    ],
  },
];

const craftCategories = ['All', 'Tonics', 'Horse', 'Ammo', 'Throwables', 'Hunting'];
const cookCategories = ['All', 'Meat', 'Fish', 'Poultry'];

// ── Component ─────────────────────────────────────────

export function RDR2GuidePanel() {
  const [search, setSearch] = useState('');
  const [craftFilter, setCraftFilter] = useState('All');
  const [cookFilter, setCookFilter] = useState('All');
  const [expandedTutorial, setExpandedTutorial] = useState<number | null>(null);
  const { user } = useAuth();

  const filteredCrafting = useMemo(() => {
    return craftingRecipes.filter(r => {
      const matchCat = craftFilter === 'All' || r.category === craftFilter;
      const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.ingredients.some(i => i.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [search, craftFilter]);

  const filteredCooking = useMemo(() => {
    return cookingRecipes.filter(r => {
      const matchCat = cookFilter === 'All' || r.category === cookFilter;
      const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.ingredients.some(i => i.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [search, cookFilter]);

  const filteredTutorials = useMemo(() => {
    if (!search) return tutorials;
    const q = search.toLowerCase();
    return tutorials.filter(t => t.title.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) || t.tips.some(tip => tip.toLowerCase().includes(q)));
  }, [search]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Red Dead Redemption 2 — Guide & Recipes</h1>
          <p className="text-sm text-muted-foreground mt-1">Crafting recipes, cooking recipes, and gameplay tutorials. Search anything below.</p>
        </div>

        {/* CTA Banner */}
        {!user && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <MessageSquare className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Need more help?</p>
                <p className="text-xs text-muted-foreground">Ask CriderGPT anything about RDR2 — crafting, hunting, story choices & more.</p>
              </div>
              <Badge className="bg-primary text-primary-foreground text-xs shrink-0">Try Free</Badge>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes, ingredients, or tips…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="crafting" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="crafting" className="gap-1.5"><Beaker className="h-3.5 w-3.5" />Crafting</TabsTrigger>
            <TabsTrigger value="cooking" className="gap-1.5"><Flame className="h-3.5 w-3.5" />Cooking</TabsTrigger>
            <TabsTrigger value="tutorials" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Tutorials</TabsTrigger>
          </TabsList>

          {/* Crafting Tab */}
          <TabsContent value="crafting" className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-1.5">
              {craftCategories.map(c => (
                <Badge
                  key={c}
                  variant={craftFilter === c ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setCraftFilter(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
            {filteredCrafting.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No recipes match your search.</p>}
            <div className="grid gap-2">
              {filteredCrafting.map((r, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{r.name}</h3>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{r.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.effect}</p>
                    <div className="flex flex-wrap gap-1">
                      {r.ingredients.map((ing, j) => (
                        <Badge key={j} variant="outline" className="text-[10px] font-normal">{ing}</Badge>
                      ))}
                    </div>
                    {r.location && <p className="text-[10px] text-muted-foreground/70">📍 {r.location}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Cooking Tab */}
          <TabsContent value="cooking" className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-1.5">
              {cookCategories.map(c => (
                <Badge
                  key={c}
                  variant={cookFilter === c ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setCookFilter(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
            {filteredCooking.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No recipes match your search.</p>}
            <div className="grid gap-2">
              {filteredCooking.map((r, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{r.name}</h3>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{r.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.effect}</p>
                    <div className="flex flex-wrap gap-1">
                      {r.ingredients.map((ing, j) => (
                        <Badge key={j} variant="outline" className="text-[10px] font-normal">{ing}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-2 mt-3">
            {filteredTutorials.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No tutorials match your search.</p>}
            {filteredTutorials.map((t, i) => {
              const isOpen = expandedTutorial === i;
              return (
                <Card key={i} className="overflow-hidden">
                  <button
                    className="w-full text-left p-3 flex items-start justify-between gap-2"
                    onClick={() => setExpandedTutorial(isOpen ? null : i)}
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.summary}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                  </button>
                  {isOpen && (
                    <CardContent className="pt-0 px-3 pb-3">
                      <ul className="space-y-1.5">
                        {t.tips.map((tip, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-primary font-bold shrink-0">{j + 1}.</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
