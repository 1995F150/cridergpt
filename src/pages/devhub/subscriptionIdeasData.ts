// Auto-generated catalog of 1000 subscription app ideas for CriderGPT's
// Dev Hub. These are RECURRING-revenue companion concepts to the 150
// one-time-purchase ideas in AndroidAppIdeas.tsx. They fit Jessie's core
// categories: farming, ranching, livestock, FFA / ag-ed, welding / shop,
// trades, ag-finance, hunting / outdoors, faith / family, and creator /
// self-hosted tools.
//
// Each idea has:
//   - name        Display name
//   - pkg         Stable slug used as package id / route slug / bundle suffix
//   - desc        One-sentence pitch
//   - monthly     Suggested USD/month subscription price
//   - yearly      Discounted USD/year price (~16% off)
//   - tier        "basic" | "pro" | "elite"
//   - category    Filter facet

export type SubscriptionIdea = {
  name: string;
  pkg: string;
  desc: string;
  monthly: number;
  yearly: number;
  tier: "basic" | "pro" | "elite";
  category: string;
};

type Template = {
  category: string;
  prefix: string;          // used to build pkg id
  // tuples of [Name, one-liner]
  items: Array<[string, string]>;
};

const TEMPLATES: Template[] = [
  {
    category: "Livestock",
    prefix: "livestock",
    items: [
      ["Cattle Herd Cloud", "Per-animal records, breeding calendar, vet log with auto cloud sync across every device."],
      ["Calving Season Tracker", "Due-date calendar, alerts, calf survival rate dashboard, weekly summary email."],
      ["Replacement Heifer Manager", "Score, rank, and track replacement heifers from weaning to first calf."],
      ["Bull Battery Planner", "Schedule bull rotation, BSE results, sire performance per pasture."],
      ["EPD Compare Pro", "Compare AI sire EPDs side-by-side with live updates from breed associations."],
      ["Pasture Rotation Plus", "Paddock map, rest days, auto-rotation alerts, monthly grazing report."],
      ["Feed Ration Lab", "Build TMR rations from your own feed costs; weekly cost-per-head report."],
      ["Hay Inventory Live", "Bale counts by field + storage, shrink tracking, low-stock alerts."],
      ["Vet Visit Vault", "Cloud-stored vet invoices, vaccines, withdrawal countdowns per animal."],
      ["Showring Prep Coach", "Daily checklist, weigh-in log, exhibitor pep talks until show day."],
      ["Goat & Sheep Pro", "Small-ruminant focused: parasites (FAMACHA), hoof scores, lambing/kidding."],
      ["Swine Farrow-to-Finish", "Sow cards, farrowing alerts, feed conversion, market projection."],
      ["Poultry Flock Manager", "Daily egg counts, mortality, feed conversion, coop temperature log."],
      ["Dairy Daily", "AM/PM milk weights per cow, somatic cell trends, withdrawal alerts."],
      ["Bee Yard Logbook", "Hive inspections, queen status, honey supers, treatment schedule."],
      ["Horse Care Plus", "Farrier, dewormer, vaccine, ride log per horse with cloud backup."],
      ["Llama & Alpaca Tracker", "Shearing log, weight, parasite checks, fiber yield by animal."],
      ["Rabbit Colony Manager", "Litters, weights, pedigrees, ARBA show entries."],
      ["NFC Tag Live", "Cloud sync of CriderGPT NFC tag scans across phones and Pi readers."],
      ["Embryo Transfer Log", "Donor/recipient tracking, flush results, pregnancy checks."],
      ["AI Breeding Calendar", "Heat detection windows, technician notes, conception rate dashboard."],
      ["Mineral Program Tracker", "Per-pasture mineral consumption, cost-per-head, supplier reorder alerts."],
      ["Death Loss Analyzer", "Code every loss, get monthly cause-of-death breakdown for the CPA."],
      ["Branding Day Roster", "Crew sign-up, calf order list, vaccine inventory, payroll printable."],
      ["Sale Barn Companion", "Live USDA market reports, your projected check, fuel + commission deducted."],
    ],
  },
  {
    category: "Farming & Crops",
    prefix: "farm",
    items: [
      ["Field Records Pro", "Per-field planting, spraying, harvest, yield history with cloud backup."],
      ["Spray Log Live", "EPA-compliant pesticide log, wind/temperature capture, PDF auditor report."],
      ["Tank Mix Mixer", "Calculate carrier + chem rates per acre; saves mix history per field."],
      ["Seed Inventory Cloud", "Bag counts by variety + lot #, treatment notes, planter calibration."],
      ["Fertilizer Cost Tracker", "Per-acre N-P-K cost, soil-test integration, ROI per field."],
      ["Soil Sample Vault", "Photo soil sample bags, lab PDFs, multi-year trend graphs."],
      ["Yield Map Light", "Combine yield monitor CSV import → field heat maps without ArcGIS."],
      ["Grain Bin Live", "Bin levels, moisture, fan run hours, sell trigger alerts."],
      ["Drying Curve Tracker", "Bin temp + moisture sensor feed, predict dry-down hours."],
      ["Marketing Window Coach", "Local basis + futures alerts when target price hits."],
      ["Irrigation Pivot Log", "Pivot run hours, GPM, kWh per quarter section, breakdown alerts."],
      ["Tile Drainage Map", "Snap photos of tile, GPS them, generate as-built PDF on demand."],
      ["Cover Crop Planner", "Mix species + seeding rate, termination calendar, NRCS payment tracker."],
      ["No-Till Notes", "Cover crop biomass, planter setup, residue manager photos by field."],
      ["Combine Loss Calc", "Quick paddle drop test, calculates bushels/acre lost behind the head."],
      ["Auger Hours Tracker", "Run hours on every auger + grain leg, grease reminders."],
      ["Hay Production Log", "Cuttings, RFV samples, square/round bale counts, cost-per-ton output."],
      ["Custom Operator Invoicer", "Per-acre billing for spraying/planting/harvest; auto invoice + Stripe ACH."],
      ["Drift Watch Sync", "Auto-pull DriftWatch crop registry around any GPS point you're spraying."],
      ["Weather Pro Ag", "Hyperlocal forecast, GDU accumulation, frost alerts by field."],
      ["Frost Guard Live", "10-min check-ins from your field temp sensors, push alarms below set point."],
      ["Burn Permit Helper", "State-by-state burn rules, RH/wind go/no-go, photo evidence log."],
      ["Tractor Tire Pressure", "Track per-tire PSI, cold/hot deltas, replacement projection."],
      ["GPS Boundary Vault", "Field shapefile cloud storage, share with custom operators in one tap."],
      ["Crop Insurance Notebook+", "Per-field APH, claim packet builder, RMA-ready PDF export."],
    ],
  },
  {
    category: "FFA & Ag-Ed",
    prefix: "ffa",
    items: [
      ["FFA Chapter Hub", "Member roster, dues, SAE records, banquet planner — cloud across officer phones."],
      ["SAE Record Book Plus", "Daily hour log, photo entries, auto-generates AET-ready PDF."],
      ["CDE Coach Pro", "150+ flashcards per event, mock contests, score history."],
      ["Livestock Judging Trainer", "AI reasons coach: enter placings, get a sample 2-min set of reasons."],
      ["Meats CDE Drill", "Daily retail-cut photos, USDA grade timed quizzes, leaderboard."],
      ["Ag Mech CDE Lab", "Bench skill checklists, GMAW/SMAW timer, weld photo grade form."],
      ["Floriculture CDE", "Plant ID flashcards, design timer, judging score sheet."],
      ["Agronomy Bowl", "Weed/insect ID rapid quiz, season-long stat tracking."],
      ["Parli Pro Coach", "Motions, rulings, timed parliamentary procedure practice rounds."],
      ["Public Speaking Studio", "Record yourself, AI gives pacing/filler-word feedback, weekly progress."],
      ["Officer Election Toolkit", "Run secure chapter officer elections from member phones."],
      ["Fundraiser Ledger", "Track every fruit sale / steak dinner / poinsettia order in real time."],
      ["FFA Banquet Planner", "RSVP forms, seating chart, slideshow auto-builder."],
      ["Proficiency App Builder", "Step-by-step proficiency-award entry, photo + financials → PDF packet."],
      ["State Convention Companion", "Chapter schedule, session reminders, hotel/roster sync."],
      ["Discovery Degree Tracker", "8th-grade requirements checklist + advisor sign-off."],
      ["Greenhand Degree", "Per-member requirement checklist, parent push alerts."],
      ["Chapter Degree", "Tracks 15-hour SAE, leadership reqs, ceremony date."],
      ["State Degree Builder", "Auto-pulls SAE hours/earnings, drops them into the state degree app."],
      ["American Degree Packet", "Full requirements + auto-PDF for national submission."],
      ["Alumni Network Lite", "Chapter alumni roster, dues, scholarship donations."],
      ["Advisor Lesson Vault", "Cloud storage of unit plans / labs across multiple advisors."],
      ["BIG Smart Project", "Set chapter SMART goals, monthly progress check-ins, end-year POA report."],
      ["Career Show Planner", "Manage 200+ exhibitors, traffic flow, judging assignments."],
      ["AET Sync Plus", "Two-way sync of CriderGPT records with The AET so hours never get re-typed."],
    ],
  },
  {
    category: "Welding & Shop",
    prefix: "weld",
    items: [
      ["Weld Shop Cloud", "Multi-welder shop dashboard: jobs, hours, materials, profitability."],
      ["WPS / PQR Manager", "AWS-compliant procedure docs, revision history, electronic signatures."],
      ["Welder Cert Tracker", "Expiration alerts per process/position, photo of cert card, requalification log."],
      ["Job Estimator Pro", "Material + labor + overhead → quote PDF, win/loss tracking."],
      ["Shop Hours Live", "Clock in/out from any phone, foreman dashboard, payroll CSV export."],
      ["Cut List Optimizer", "Stick lengths in → optimal cut layout with kerf, scrap percentage."],
      ["Gas Bottle Manager", "Cylinder rental tracking, fill levels, supplier reorder alerts."],
      ["Consumables Cart", "Re-order wire/sticks/tips at a tap; suggested stocking levels by job mix."],
      ["Plasma Table Library", "Cloud-store DXF parts, cut parameters, customer assignment."],
      ["Tig Notes", "Per-job amperage/gas notes, photos of root + cap, AI suggests next setting."],
      ["Mobile Welder Dispatcher", "Customer pings nearest mobile rig, ETA, on-site invoicing."],
      ["Pipe Welder Logbook", "X-ray pass rate, position log, joint-by-joint tracker."],
      ["Fab Shop CRM", "Customer DB with quotes, jobs, drawings, photos, follow-up calendar."],
      ["Drawing Vault", "Cloud PDF + DXF library searchable by customer/part number."],
      ["Quality Hold Tag", "Generate / scan hold tags, escalation alerts, NCR reports."],
      ["Shop Safety Sign-In", "Visitor sign-in + PPE attestation, OSHA-ready CSV export."],
      ["Tooling Calibration", "Calipers, gauges, torque wrenches — calibration interval alerts."],
      ["Pre-Heat Calculator", "Carbon equivalent + thickness → preheat temp; saves per joint."],
      ["Mig Wire Cost", "Compare brands per pound deposited, picks cheapest for the job."],
      ["Forge Project Planner", "Blacksmith project queue, fuel cost, retail price suggestion."],
      ["Welder Helmet Inventory", "Track lenses, batteries, replacement schedule across shop."],
      ["Truck Bed Build Quoter", "Pre-built templates for flatbeds, hauler beds, gooseneck welds."],
      ["Trailer Repair Log", "VIN-linked trailer service history with photos."],
      ["Code Reference Pro", "AWS D1.1/D1.5/API 1104 quick lookups, bookmarks, offline cached."],
      ["Apprentice Hours Logger", "DOL-compliant hours per task, mentor signoff, transcript export."],
    ],
  },
  {
    category: "Ag Finance & Bookkeeping",
    prefix: "agfin",
    items: [
      ["Ranch Books Cloud", "Schedule F-friendly bookkeeping with multi-enterprise tagging."],
      ["1099 Generator Cloud", "Track contractor pay, auto-generate 1099-NEC PDFs at year end."],
      ["Lender Packet Builder", "Balance sheet, income statement, cash flow → bank-ready PDF in one tap."],
      ["Tax Estimator Quarterly", "Pulls income + deductions, estimates federal/state quarterlies."],
      ["Depreciation Tracker", "Section 179 + bonus depreciation calculator per asset."],
      ["Equipment Loan Vault", "All UCC-1 / loan docs, payment schedule, payoff projections."],
      ["Crop Lease Calculator", "Cash + share + flex lease compare; auto-renewal alerts."],
      ["Pasture Lease Manager", "Per-AU rates, lease terms, late-payment reminders."],
      ["Custom Hire Income", "Per-job billing for hay/spray/harvest, ACH via Stripe."],
      ["Fuel Card Reconciler", "Import fuel card CSV, split by truck/tractor, IFTA-ready report."],
      ["Mileage Logbook", "Auto-tracks farm miles via GPS, IRS-ready PDF for tax day."],
      ["Inventory Year-End Count", "Bushels / head / hay counted on a phone, signs off for the CPA."],
      ["FFA Booster Treasurer", "Booster club ledger with bingo, raffle, concession trail."],
      ["Chapter Treasurer Plus", "FFA chapter treasury with state-tournament reimbursement workflow."],
      ["Co-op Settlement Reader", "Snap photos of co-op settlement sheets → CSV ledger."],
      ["Crop Marketing Plan", "Track every bushel sold/priced vs. budget target."],
      ["Land Lease P&L", "Per-section profitability across multiple landlords."],
      ["Auction Calculator", "Computes net check after commission, fuel, beef checkoff."],
      ["Farm Payroll Lite", "Weekly payroll for 1–10 employees with state tax tables."],
      ["Equipment ROI", "Tracks hours + repairs vs. purchase price per piece of iron."],
      ["Farm Credit Coach", "AI walks you through next year's FSA / FCS loan packet."],
      ["NRCS Practice Payments", "Tracks EQIP / CSP practice progress, expected payment dates."],
      ["FSA Acreage Sync", "Year-by-year FSA reported acres, base updates, ARC/PLC election helper."],
      ["Estate Plan Vault", "Cloud-secured will, trust, succession docs with executor access."],
      ["Farm Insurance Binder", "Every policy doc, premium calendar, claim photo log."],
    ],
  },
  {
    category: "Hunting & Outdoors",
    prefix: "hunt",
    items: [
      ["Deer Camp Cloud", "Per-stand sightings, wind plan, harvest log shared with your camp."],
      ["Trail Cam Sort", "Upload SD card photos, AI tags bucks/does/coyotes by stand."],
      ["Hunting Lease Log", "Multi-lease dues, member rules, harvest quota tracking."],
      ["Food Plot Planner", "Per-plot seed mix, planting calendar, soil-test integration."],
      ["Wild Game Processor", "Per-animal cuts, freezer inventory, share-with-family ledger."],
      ["Bow Tuning Notes", "Arrow weight, draw, broadhead, paper-tear photo log."],
      ["Reload Bench Log", "Per-load powder, primer, OAL, group size with photo of target."],
      ["Range Day Coach", "Distance + wind + drop charts, save zeroes per rifle."],
      ["Boat & Motor Log", "Engine hours, lower-unit oil, prop strike history."],
      ["Trotline Tracker", "Trotline locations, bait, daily catch counts."],
      ["Trapper's Logbook", "Sets by GPS, species, lure recipe, fur-buyer ledger."],
      ["Mushroom Foraging Log", "Find spots (private), species, photo, harvest weight per outing."],
      ["Whitetail Score Calc", "Field-score B&C in seconds, photos of every measurement."],
      ["Predator Call Log", "Stand history, calls played, response, wind/temp."],
      ["Duck Blind Crew", "Crew check-in, decoy spread plan, daily limits."],
      ["Turkey Roost Map", "Roost pins, gobble counts, hunt plan AM/PM."],
      ["ATV / Side-by-Side Log", "Hours, oil, brakes, photo of every service per UTV."],
    ],
  },
  {
    category: "Faith & Family",
    prefix: "faith",
    items: [
      ["Family Devotion Daily", "Daily Bible reading + 3-question discussion delivered to the family chat."],
      ["Prayer List Sync", "Shared private prayer list across spouses + grandparents."],
      ["Bible Study Notes", "Highlight verses, tag topics, search across years of notes."],
      ["Sermon Notes Cloud", "Take notes Sunday, auto-emails them Wednesday for follow-up."],
      ["Family Photo Vault", "Private cloud photo album with grandparents-only share link."],
      ["Family Calendar Plus", "Multi-household calendar with chores, sports, church events."],
      ["Chores & Allowance", "Weekly chore checklist, automated allowance tracker."],
      ["Homeschool Planner", "Lesson plans, attendance, transcripts for multi-grade households."],
      ["4-H Project Tracker", "Per-project hours, photos, county fair entry packet."],
      ["FCA Devotional", "Faith + sports daily devotion for high-school athletes."],
      ["Family Cookbook Cloud", "Recipe collection with photos, meal plan, grocery list export."],
      ["Birthday & Anniversary", "Never miss a birthday — auto-text + gift idea suggestions."],
      ["Hospital Visit Log", "When grandma's in the hospital: visitor schedule, meal train, prayer."],
      ["Funeral Planner Vault", "Pre-plan service wishes, hymns, pall bearers stored privately."],
      ["Wedding Anniversary Box", "Year-by-year photos, letters, gifts that surprise on the date."],
    ],
  },
  {
    category: "Trades & Service",
    prefix: "trade",
    items: [
      ["Mobile Mechanic CRM", "Customer DB, vehicle history, on-site invoicing + Stripe pay."],
      ["HVAC Service Log", "Per-unit refrigerant charge, filter, capacitor history."],
      ["Plumber Job Sheet", "Photo before/after, material list, signature on site."],
      ["Electrician Panel Log", "Per-panel breaker inventory, load calc, code reference quick links."],
      ["Lawn Care Routes", "Optimize mowing routes, rain reschedule, recurring billing."],
      ["Snow Plow Dispatch", "Storm-day routes, photo proof, hours billed per lot."],
      ["Fence Builder Quoter", "Linear-foot + corner pricing, instant PDF quote."],
      ["Roofing Estimator", "Pitch + squares + shingle cost → quote with photo of roof."],
      ["Septic Service Log", "Tank size, pump date, alarm history per address."],
      ["Pressure Washer Routes", "Driveways/decks/houses route + before-after photos for marketing."],
      ["Pest Control Visit Log", "Per-property bait stations, product used, label-rate compliance."],
      ["Locksmith Vault", "Key codes by customer (encrypted), call-out invoice."],
      ["Window Cleaner Routes", "Multi-story residential routes, billing per window count."],
      ["Auto Detail Studio", "Package builder, before-after photos, recurring detail subscriptions."],
      ["Tow Truck Dispatch", "Live GPS dispatch, mileage calc, insurance company portal."],
    ],
  },
  {
    category: "Creator & Self-Hosted",
    prefix: "creator",
    items: [
      ["CriderTube Hosting Tier", "Self-hosted streaming with hosted control plane + analytics."],
      ["RanchLive Pro Streaming", "Multi-cam live to your server + YouTube/Facebook simulcast."],
      ["Podcast Network Pro", "Hosted RSS, transcripts, listener stats, dynamic ad insertion."],
      ["Creator CRM Cloud", "Sponsor tracking, rate cards, contracts, payment ledger."],
      ["Newsletter Studio", "Write once, send to your audience, paid-tier paywall."],
      ["Patron Wall Pro", "Subscribers-only feed, tiered perks, Stripe billing."],
      ["Short-Form Auto-Cut", "AI clips long videos into 15 vertical reels per upload."],
      ["Stream Overlay Builder", "Drag-and-drop OBS overlays with live data feeds."],
      ["Caption Generator Live", "Auto-captions for every video, edit + export SRT."],
      ["Comment Mod Cloud", "AI moderates YouTube/TikTok/IG comments across all your accounts."],
      ["Sponsor Pitch AI", "Generates sponsor outreach emails tuned to your channel niche."],
      ["Highlight Reel Bot", "End-of-month auto highlight reel from your best clips."],
      ["Brand Kit Vault", "Logo, fonts, color tokens shared across team in one click."],
      ["TikTok Shop Sync", "Sync your CriderGPT store catalog into TikTok Shop."],
      ["Affiliate Link Vault", "Track every affiliate link, click, payout — across networks."],
    ],
  },
  {
    category: "Smart Home & Property",
    prefix: "home",
    items: [
      ["Property Maintenance Cloud", "Per-house chore + repair calendar, contractor contact list."],
      ["Rental Property Manager", "Tenants, leases, rent collection via Stripe ACH."],
      ["Airbnb Cleaner Dispatch", "Schedule turnovers, photo-proof checklists, payouts."],
      ["Energy Bill Tracker", "Multi-meter electric/gas/water with anomaly alerts."],
      ["Generator Run Log", "Auto-track generator runtime, oil interval alerts."],
      ["Septic & Well Vault", "Test results, pump dates, contractor receipts."],
      ["Solar Output Live", "Pull from inverter API, ROI calculator, kWh export."],
      ["Storm Damage Vault", "Before-after photos per insurance claim, contractor estimates."],
      ["Home Inventory Vault", "Room-by-room photo + value catalog for insurance disasters."],
      ["Fence Line GPS", "Walk your fence, drop posts, share map with neighbor."],
    ],
  },
];

// ===== Generator =====
// Builds a 1000-item array by combining base templates with realistic
// variant prefixes that match Jessie's niches (state, scale, breed, etc.).
// Each base item gets unique variants until 1000 are produced.

const VARIANTS: Array<{ key: string; label: string; pkg: string }> = [
  { key: "core", label: "", pkg: "" },
  { key: "small", label: "Small-Acre", pkg: "smallacre" },
  { key: "mid", label: "Mid-Sized", pkg: "mid" },
  { key: "large", label: "Commercial", pkg: "comm" },
  { key: "youth", label: "Youth", pkg: "youth" },
  { key: "advisor", label: "Advisor", pkg: "advisor" },
  { key: "tx", label: "Texas Edition", pkg: "tx" },
  { key: "ok", label: "Oklahoma Edition", pkg: "ok" },
  { key: "va", label: "Virginia Edition", pkg: "va" },
  { key: "ky", label: "Kentucky Edition", pkg: "ky" },
  { key: "ranch", label: "Ranch Edition", pkg: "ranch" },
  { key: "showbarn", label: "Show Barn", pkg: "show" },
  { key: "fair", label: "County Fair", pkg: "fair" },
  { key: "spanish", label: "Bilingual", pkg: "es" },
];

const TIER_PRICES: Record<"basic" | "pro" | "elite", { m: number; y: number }> = {
  basic: { m: 4.99, y: 49.99 },
  pro: { m: 9.99, y: 99.99 },
  elite: { m: 19.99, y: 199.99 },
};

function tierFor(index: number): "basic" | "pro" | "elite" {
  // 60% basic, 30% pro, 10% elite — realistic distribution
  const m = index % 10;
  if (m < 6) return "basic";
  if (m < 9) return "pro";
  return "elite";
}

function buildAll(): SubscriptionIdea[] {
  const out: SubscriptionIdea[] = [];
  const seen = new Set<string>();
  let i = 0;
  outer: for (const variant of VARIANTS) {
    for (const t of TEMPLATES) {
      for (const [baseName, baseDesc] of t.items) {
        const name = variant.label ? `${baseName} — ${variant.label}` : baseName;
        const pkgBase = baseName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 22);
        const pkg = variant.pkg
          ? `com.crider.${t.prefix}.${pkgBase}.${variant.pkg}`
          : `com.crider.${t.prefix}.${pkgBase}`;
        if (seen.has(pkg)) continue;
        seen.add(pkg);
        const tier = tierFor(i);
        out.push({
          name,
          pkg,
          desc: variant.label
            ? `${baseDesc} Tailored variant: ${variant.label}.`
            : baseDesc,
          monthly: TIER_PRICES[tier].m,
          yearly: TIER_PRICES[tier].y,
          tier,
          category: t.category,
        });
        i++;
        if (out.length >= 1000) break outer;
      }
    }
  }
  return out;
}

export const SUBSCRIPTION_IDEAS: SubscriptionIdea[] = buildAll();

export const SUBSCRIPTION_CATEGORIES = Array.from(
  new Set(SUBSCRIPTION_IDEAS.map((i) => i.category)),
).sort();
