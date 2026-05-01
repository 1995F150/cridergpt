// Static seed data for the breed encyclopedia. Each entry becomes its own SEO page.
export interface Breed {
  slug: string;
  name: string;
  species: 'Cattle' | 'Sheep' | 'Swine' | 'Goat' | 'Poultry';
  origin: string;
  weight: string;
  primaryUse: string;
  temperament: string;
  ffaShowTips: string[];
  description: string;
}

export const BREEDS: Breed[] = [
  {
    slug: 'angus',
    name: 'Angus',
    species: 'Cattle',
    origin: 'Scotland',
    weight: 'Bulls 1,800–2,200 lb · Cows 1,200–1,400 lb',
    primaryUse: 'Beef',
    temperament: 'Docile, easy to handle',
    ffaShowTips: [
      'Keep the topline straight and the hide shining black — Angus judges look for breed character first.',
      'Walk slow with the head up; an Angus that drags is an Angus that places low.',
      'Trim the tail switch clean and square the legs in the lineup.',
    ],
    description:
      'Angus is the most popular beef breed in the U.S. for a reason — solid black hide, naturally polled, marbles like crazy, and finishes at a good frame size for FFA market shows.',
  },
  {
    slug: 'hereford',
    name: 'Hereford',
    species: 'Cattle',
    origin: 'England',
    weight: 'Bulls 1,800 lb · Cows 1,200 lb',
    primaryUse: 'Beef',
    temperament: 'Calm and gentle',
    ffaShowTips: [
      'White face and red body — keep both clean. A muddy face hurts your placing.',
      'Herefords thrive on grass; show them with a full but not bloated middle.',
    ],
    description:
      'A classic American beef breed. Easy keepers, hardy on pasture, and a staple in 4-H and FFA show rings since the early 1900s.',
  },
  {
    slug: 'holstein',
    name: 'Holstein',
    species: 'Cattle',
    origin: 'Netherlands',
    weight: 'Cows 1,500 lb',
    primaryUse: 'Dairy',
    temperament: 'Friendly, very productive',
    ffaShowTips: [
      'Dairy classes score on udder, frame, and dairy character — feed for angularity, not bulk.',
      'Clip the topline and tailhead the night before for a sharp silhouette.',
    ],
    description:
      'The black-and-white queen of the dairy barn. Holsteins produce more milk than any other breed, which makes them the go-to for FFA dairy projects and SAEs.',
  },
  {
    slug: 'jersey',
    name: 'Jersey',
    species: 'Cattle',
    origin: 'Jersey Island',
    weight: 'Cows 900 lb',
    primaryUse: 'Dairy',
    temperament: 'Curious, very social',
    ffaShowTips: [
      'Jerseys are smaller — show them confident, never timid. Judges punish a shy walk.',
      'High butterfat — feed quality forage for a deep yellow milk and shiny coat.',
    ],
    description:
      'Smallest dairy breed but highest butterfat percentage. Easier to handle than a Holstein for a first-year FFA dairy showman.',
  },
  {
    slug: 'duroc',
    name: 'Duroc',
    species: 'Swine',
    origin: 'United States',
    weight: 'Boars 800 lb · Sows 700 lb',
    primaryUse: 'Pork',
    temperament: 'Calm, fast-growing',
    ffaShowTips: [
      'Red color must be solid; spots cost you points.',
      'Keep the hog moving — Durocs that stop in the ring lose to ones that drive forward.',
    ],
    description:
      "A red, drooping-eared American breed prized for fast growth and good muscling — a favorite for FFA market hog projects because they finish on time for spring shows.",
  },
  {
    slug: 'yorkshire',
    name: 'Yorkshire',
    species: 'Swine',
    origin: 'England',
    weight: 'Boars 750 lb · Sows 650 lb',
    primaryUse: 'Pork',
    temperament: 'Mild, maternal',
    ffaShowTips: [
      'White hogs stain easy — wash the night before, then dust with cornstarch in the morning.',
      'Erect ears are breed character — judges check from the side.',
    ],
    description:
      'The white, erect-eared "mother breed" of the hog world. Yorkshires bring length, growth, and lean muscle to FFA market and breeding projects.',
  },
  {
    slug: 'suffolk',
    name: 'Suffolk',
    species: 'Sheep',
    origin: 'England',
    weight: 'Rams 250–350 lb · Ewes 180–250 lb',
    primaryUse: 'Meat',
    temperament: 'Active, alert',
    ffaShowTips: [
      'Black face and legs must stay clean — wash and shear properly the week of the show.',
      'Set the lamb square with weight on all four legs; brace the hindquarter when the judge handles.',
    ],
    description:
      'The most common terminal sire breed in the U.S. Black-faced, fast-growing, heavily muscled — the workhorse of FFA market lamb shows.',
  },
  {
    slug: 'boer',
    name: 'Boer',
    species: 'Goat',
    origin: 'South Africa',
    weight: 'Bucks 200–340 lb · Does 190–230 lb',
    primaryUse: 'Meat',
    temperament: 'Hardy, friendly',
    ffaShowTips: [
      'Red head with white body is breed standard — pigment matters in the show ring.',
      'Brace a Boer wether with a firm hand on the chest; show off the rear end muscle.',
    ],
    description:
      'The dominant meat goat breed in the U.S. Boers grow fast, finish heavy, and are a top pick for FFA market goat projects.',
  },
];

export function getBreedBySlug(slug: string): Breed | undefined {
  return BREEDS.find((b) => b.slug === slug);
}
