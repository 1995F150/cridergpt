import { useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Smartphone, Search, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Idea = { name: string; pkg: string; desc: string; price: number };

const IDEAS: Idea[] = [
  // Shop / Trade Utilities
  { name: "Welding Hours Tracker", pkg: "com.crider.weldhours", desc: "Clock in/out at the shop, log job notes, export weekly CSV/PDF timesheet. Local SQLite only.", price: 1.99 },
  { name: "Cattle Weight Estimator", pkg: "com.crider.cattleweight", desc: "Heart-girth + length input, returns estimated lbs using Schaeffer formula. Save history per animal.", price: 0.99 },
  { name: "Hay Bale Calculator", pkg: "com.crider.haycalc", desc: "Compute bales needed per head per winter. Inputs: head count, days, lbs/day, bale weight.", price: 0.99 },
  { name: "Feed Cost Splitter", pkg: "com.crider.feedsplit", desc: "Split bag of feed cost across multiple animals by weight or days fed.", price: 0.99 },
  { name: "Pasture Rotation Planner", pkg: "com.crider.pastureplan", desc: "Track paddocks, days grazed, rest period, alerts when rotation is due.", price: 2.99 },
  { name: "Tractor Maintenance Log", pkg: "com.crider.tractorlog", desc: "Log hours, oil changes, filters per piece of equipment. Reminder when due.", price: 1.99 },
  { name: "Chainsaw Sharpening Log", pkg: "com.crider.sawlog", desc: "Track sharpening intervals, chain types, file size per saw.", price: 0.99 },
  { name: "Fence Post Calculator", pkg: "com.crider.fencecalc", desc: "Inputs perimeter, post spacing, gate count. Returns posts, wire rolls, staples needed.", price: 0.99 },
  { name: "Concrete Volume Calc", pkg: "com.crider.concretecalc", desc: "Slab, footer, sonotube. Cubic yards + bag count.", price: 0.99 },
  { name: "Lumber Board Foot Calc", pkg: "com.crider.boardfoot", desc: "T x W x L / 12. Batch list with total + cost.", price: 0.99 },
  { name: "Welding Rod Picker", pkg: "com.crider.rodpicker", desc: "Pick stick/MIG/TIG rod by metal type and thickness.", price: 0.99 },
  { name: "Plasma Cutter Settings", pkg: "com.crider.plasma", desc: "Recommended amps and travel speed by material thickness.", price: 0.99 },
  { name: "Welding Gas Mix Picker", pkg: "com.crider.weldgas", desc: "Suggest gas mix by process and metal.", price: 0.99 },
  { name: "Bolt Torque Lookup", pkg: "com.crider.torque", desc: "Grade 5/8 bolt torque chart, ft-lb and Nm.", price: 0.99 },
  { name: "Pipe Cut Length Calc", pkg: "com.crider.pipecut", desc: "Miter and saddle cut layouts, prints to PDF template.", price: 1.99 },
  { name: "Sheet Metal Bend Calc", pkg: "com.crider.bendcalc", desc: "K-factor, bend allowance, flat pattern.", price: 1.99 },
  { name: "Drill & Tap Chart", pkg: "com.crider.tapchart", desc: "Tap size to drill size lookup, imperial + metric.", price: 0.99 },
  { name: "Battery Voltage Tester Log", pkg: "com.crider.battlog", desc: "Log 12V battery voltage over time per vehicle, alert on drop.", price: 1.99 },
  { name: "12V Wire Gauge Calc", pkg: "com.crider.wirecalc", desc: "Amps + run length to AWG recommendation.", price: 0.99 },
  { name: "Solar Sizing Estimator", pkg: "com.crider.solarcalc", desc: "Daily watt-hours to panel + battery bank size.", price: 1.99 },

  // FFA / Livestock
  { name: "FFA Record Book Lite", pkg: "com.crider.ffarecord", desc: "Track SAE hours, projects, expenses. Export to PDF/CSV.", price: 2.99 },
  { name: "Show Animal Weigh-In", pkg: "com.crider.showweigh", desc: "Daily weight log with average daily gain chart per show animal.", price: 1.99 },
  { name: "Show Day Checklist", pkg: "com.crider.showday", desc: "Editable show-day packing + grooming checklist.", price: 0.99 },
  { name: "Breeding Calendar", pkg: "com.crider.breedcal", desc: "Track heat cycles + due dates for cows, sheep, goats, hogs.", price: 2.99 },
  { name: "Calf Birth Log", pkg: "com.crider.calflog", desc: "Quick calf entry: dam, sire, tag, sex, weight, notes.", price: 1.99 },
  { name: "Medication Withdrawal Tracker", pkg: "com.crider.medwithdraw", desc: "Log meds, calc withdrawal date before slaughter/show.", price: 2.99 },
  { name: "Vaccination Schedule", pkg: "com.crider.vaxsched", desc: "Per-species vaccine schedule with push reminders.", price: 1.99 },
  { name: "Feed Ration Mixer", pkg: "com.crider.feedmix", desc: "Build mixed ration, target protein %, cost per ton.", price: 2.99 },
  { name: "Goat Hoof Trim Log", pkg: "com.crider.hoofcal", desc: "Track last trim date per goat, alerts at 6 weeks.", price: 0.99 },
  { name: "Egg Production Tracker", pkg: "com.crider.egglog", desc: "Daily egg counts per coop with weekly chart.", price: 1.99 },
  { name: "Chicken Feed Calc", pkg: "com.crider.chickfeed", desc: "Layers vs broilers, lbs/day by age.", price: 0.99 },
  { name: "Bee Hive Inspection Log", pkg: "com.crider.beelog", desc: "Per-hive inspection notes, queen status, honey supers.", price: 1.99 },
  { name: "Pig Grow-Out Tracker", pkg: "com.crider.pigrow", desc: "Track ADG, feed conversion, projected sale weight.", price: 2.99 },
  { name: "Sheep Lambing Log", pkg: "com.crider.lamblog", desc: "Lambing records, ewe productivity report.", price: 1.99 },
  { name: "Pasture Forage Tester", pkg: "com.crider.foragecal", desc: "Estimate dry matter intake and stocking rate.", price: 1.99 },
  { name: "Manure Spread Calc", pkg: "com.crider.manurecalc", desc: "Acres, tons/acre, NPK estimate.", price: 0.99 },
  { name: "Livestock Sale Logger", pkg: "com.crider.salelog", desc: "Log sales by buyer, weight, $/lb, total.", price: 1.99 },
  { name: "FFA Officer Tracker", pkg: "com.crider.ffaoffice", desc: "Track chapter officer duties + meeting minutes.", price: 1.99 },
  { name: "CDE Practice Drill", pkg: "com.crider.cdeprep", desc: "Flashcards for livestock judging, parli pro, ag sales.", price: 1.99 },
  { name: "Parli Pro Reference", pkg: "com.crider.parlipro", desc: "Offline Robert's Rules quick reference for FFA meetings.", price: 0.99 },

  // Outdoors / Hunting / Fishing
  { name: "Hunting Log", pkg: "com.crider.huntlog", desc: "Log harvests: date, GPS, species, weapon, weather.", price: 1.99 },
  { name: "Trail Cam Photo Sorter", pkg: "com.crider.trailcam", desc: "Sort SD card photos by date, tag bucks, mark trophies.", price: 2.99 },
  { name: "Deer Score Calculator", pkg: "com.crider.deerscore", desc: "Boone & Crockett gross/net typical + non-typical scoring.", price: 1.99 },
  { name: "Fish Catch Log", pkg: "com.crider.fishlog", desc: "Species, length, weight, lure, GPS, weather.", price: 1.99 },
  { name: "Fishing Knot Trainer", pkg: "com.crider.knotapp", desc: "Animated step-by-step knot tutorials, offline.", price: 2.99 },
  { name: "Tackle Box Inventory", pkg: "com.crider.tacklebox", desc: "Inventory lures, line, hooks. Reorder list.", price: 1.99 },
  { name: "Sunrise/Sunset/Moon", pkg: "com.crider.sunmoon", desc: "Hunting/fishing best times by date + location.", price: 0.99 },
  { name: "Wind Direction Stand Picker", pkg: "com.crider.standwind", desc: "Pick best deer stand based on today's wind.", price: 0.99 },
  { name: "Reloading Recipe Log", pkg: "com.crider.reloadlog", desc: "Log powder, primer, bullet, COAL per load. Group sizes.", price: 1.99 },
  { name: "Rifle Zero Tracker", pkg: "com.crider.zerolog", desc: "Log zeros, scope clicks, ammo lots per rifle.", price: 1.99 },

  // Garage / Vehicle
  { name: "Vehicle Maintenance Log", pkg: "com.crider.vehlog", desc: "Per-vehicle service log, mileage reminders.", price: 1.99 },
  { name: "Fuel MPG Tracker", pkg: "com.crider.mpglog", desc: "Log fillups, calc MPG, $/mile.", price: 0.99 },
  { name: "Tire Pressure Log", pkg: "com.crider.tirelog", desc: "Track cold pressure per tire, rotation reminders.", price: 0.99 },
  { name: "OBD-II Code Lookup", pkg: "com.crider.obd2", desc: "Offline P0/P1 code dictionary, common causes + fixes.", price: 2.99 },
  { name: "Trailer Load Calc", pkg: "com.crider.trailerload", desc: "Tongue weight, GVWR, axle distribution warnings.", price: 1.99 },
  { name: "Hitch Class Picker", pkg: "com.crider.hitchpick", desc: "Pick hitch class by trailer GVWR.", price: 0.99 },
  { name: "Engine Bolt Pattern", pkg: "com.crider.boltpattern", desc: "Lug pattern lookup for trucks + trailers.", price: 0.99 },
  { name: "Brake Pad Reminder", pkg: "com.crider.brakelog", desc: "Track pad thickness, miles since last replace.", price: 0.99 },
  { name: "Oil Change Reminder", pkg: "com.crider.oilreminder", desc: "Per vehicle interval + push reminder.", price: 0.99 },
  { name: "VIN Decoder Offline", pkg: "com.crider.vindecode", desc: "Decode US VIN to year/make/plant locally.", price: 1.99 },

  // Construction / Trade
  { name: "Stud Spacing Calc", pkg: "com.crider.studcalc", desc: "Wall length to stud count at 16 or 24 oc.", price: 0.99 },
  { name: "Rafter Length Calc", pkg: "com.crider.raftercalc", desc: "Run + pitch to rafter length, plumb + bird's mouth angles.", price: 0.99 },
  { name: "Stair Calculator", pkg: "com.crider.staircalc", desc: "Total rise/run to riser + tread, stringer length.", price: 0.99 },
  { name: "Roof Pitch Finder", pkg: "com.crider.roofpitch", desc: "Use phone gyroscope to read roof pitch.", price: 1.99 },
  { name: "Drywall Estimator", pkg: "com.crider.drywallcalc", desc: "Sheets + screws + mud + tape from sq ft.", price: 0.99 },
  { name: "Paint Coverage Calc", pkg: "com.crider.paintcalc", desc: "Gallons per coat from room dimensions.", price: 0.99 },
  { name: "Insulation R-Value", pkg: "com.crider.rvaluecalc", desc: "Recommended R-value by zone, batt vs blown depth.", price: 0.99 },
  { name: "Floor Joist Span", pkg: "com.crider.joistspan", desc: "Span table lookup by lumber size + spacing.", price: 1.99 },
  { name: "Beam Sizing Helper", pkg: "com.crider.beamcalc", desc: "Quick beam sizing for residential loads.", price: 1.99 },
  { name: "Trim Cut List", pkg: "com.crider.trimcut", desc: "Optimize cut list from stock lengths.", price: 1.99 },

  // Home / Personal
  { name: "Grocery Price Book", pkg: "com.crider.pricebook", desc: "Track unit prices per store, find best deal.", price: 1.99 },
  { name: "Pantry Inventory", pkg: "com.crider.pantry", desc: "Scan barcodes, expiry alerts.", price: 1.99 },
  { name: "Recipe Box Offline", pkg: "com.crider.recipebox", desc: "Personal recipes with shopping list export.", price: 1.99 },
  { name: "Meal Plan Calendar", pkg: "com.crider.mealplan", desc: "Drag recipes onto week, auto shopping list.", price: 2.99 },
  { name: "Canning Time Lookup", pkg: "com.crider.canlog", desc: "Pressure/water-bath times by jar size + food.", price: 0.99 },
  { name: "Freezer Inventory", pkg: "com.crider.freezerlog", desc: "Track meat cuts, dates, weights.", price: 1.99 },
  { name: "Cattle Beef Cut Yield", pkg: "com.crider.beefyield", desc: "Live weight to hanging weight to take-home cuts.", price: 1.99 },
  { name: "Smoker Temp Log", pkg: "com.crider.smokerlog", desc: "Track pit + meat temp over cook time.", price: 1.99 },
  { name: "BBQ Rub Builder", pkg: "com.crider.rubbuilder", desc: "Build + scale dry rub recipes.", price: 0.99 },
  { name: "Garden Planner", pkg: "com.crider.gardenplan", desc: "Plant by frost date, square-foot layout.", price: 1.99 },

  // Money / Productivity
  { name: "Tip Splitter", pkg: "com.crider.tipsplit", desc: "Split tab + tip across people, per-item assign.", price: 0.99 },
  { name: "Cash Envelope Budget", pkg: "com.crider.envelope", desc: "Local-only envelope budget.", price: 2.99 },
  { name: "Coin Roll Counter", pkg: "com.crider.coinroll", desc: "Count coins by denomination, rolls + value.", price: 0.99 },
  { name: "Daily Cash Log", pkg: "com.crider.cashlog", desc: "Quick cash-in/cash-out journal.", price: 0.99 },
  { name: "Side Hustle Income", pkg: "com.crider.sidelog", desc: "Log income streams, weekly + monthly totals.", price: 1.99 },
  { name: "Invoice PDF Generator", pkg: "com.crider.invoicepdf", desc: "One-page invoice PDF, no account needed.", price: 2.99 },
  { name: "Receipt Scanner Offline", pkg: "com.crider.receiptscan", desc: "OCR receipts to CSV, fully local.", price: 3.99 },
  { name: "Mileage Log IRS", pkg: "com.crider.mileagelog", desc: "GPS auto-track business miles, IRS report.", price: 2.99 },
  { name: "Time Card Stamp", pkg: "com.crider.timecard", desc: "Punch in/out, export weekly timesheet.", price: 1.99 },
  { name: "Goal Streak Tracker", pkg: "com.crider.streak", desc: "Daily habit streaks with reminders.", price: 1.99 },

  // Communication / Camera / Hardware
  { name: "NFC Tag Writer", pkg: "com.crider.nfcwrite", desc: "Write text/URL/wifi to NTAG215, lock optional.", price: 2.99 },
  { name: "QR Code Maker", pkg: "com.crider.qrmake", desc: "Generate QR for text/URL/wifi/vcard, save PNG.", price: 0.99 },
  { name: "Barcode Inventory", pkg: "com.crider.barscan", desc: "Scan UPC, build inventory list, CSV export.", price: 1.99 },
  { name: "Flashlight Pro", pkg: "com.crider.flashpro", desc: "SOS, strobe, lantern modes.", price: 0.99 },
  { name: "Bubble Level", pkg: "com.crider.level", desc: "Gyroscope-based level + protractor.", price: 0.99 },
  { name: "Decibel Meter", pkg: "com.crider.dbmeter", desc: "Sound level meter with logging.", price: 1.99 },
  { name: "Compass Pro", pkg: "com.crider.compass", desc: "True/magnetic compass with declination.", price: 0.99 },
  { name: "GPS Coordinates", pkg: "com.crider.gpscoords", desc: "Show lat/long in multiple formats, share location.", price: 0.99 },
  { name: "Walkie Talkie LAN", pkg: "com.crider.walkielan", desc: "Push-to-talk over local wifi, no internet.", price: 2.99 },
  { name: "Offline Notes", pkg: "com.crider.offnotes", desc: "Markdown notes, fully local, export TXT.", price: 1.99 },

  // Education / Reference
  { name: "Ag Acronym Dictionary", pkg: "com.crider.agdict", desc: "Offline ag/FFA acronym + term dictionary.", price: 0.99 },
  { name: "Cattle Breed Guide", pkg: "com.crider.cattlebreeds", desc: "Photos + traits for 50+ beef + dairy breeds.", price: 1.99 },
  { name: "Sheep Breed Guide", pkg: "com.crider.sheepbreeds", desc: "Photos + traits for sheep breeds.", price: 1.99 },
  { name: "Hog Breed Guide", pkg: "com.crider.hogbreeds", desc: "Photos + traits for swine breeds.", price: 1.99 },
  { name: "Chicken Breed Guide", pkg: "com.crider.chickbreeds", desc: "Egg color, hardiness, temperament.", price: 1.99 },
  { name: "Plant ID Guide", pkg: "com.crider.plantid", desc: "Common pasture grasses + weeds reference.", price: 1.99 },
  { name: "Poison Plant Guide", pkg: "com.crider.poisonplant", desc: "Toxic plants by species for livestock.", price: 1.99 },
  { name: "Knot Tying Reference", pkg: "com.crider.knotref", desc: "Rope knots: bowline, clove hitch, etc., animated.", price: 2.99 },
  { name: "Welding Symbol Guide", pkg: "com.crider.weldsym", desc: "AWS welding symbol cheatsheet.", price: 0.99 },
  { name: "Blueprint Symbol Guide", pkg: "com.crider.bpsym", desc: "Electrical, plumbing, HVAC symbol reference.", price: 0.99 },

  // Games / Fun
  { name: "Coin Flip Multi", pkg: "com.crider.coinflip", desc: "Flip 1-100 coins, stats.", price: 0.99 },
  { name: "Dice Roller", pkg: "com.crider.diceroll", desc: "D4-D100 polyhedral dice.", price: 0.99 },
  { name: "Truck or Trailer? Quiz", pkg: "com.crider.truckquiz", desc: "Guess truck make/model from photo.", price: 0.99 },
  { name: "Tractor Trivia", pkg: "com.crider.tractortrivia", desc: "Daily ag + tractor trivia.", price: 0.99 },
  { name: "Cattle Breed Quiz", pkg: "com.crider.breedquiz", desc: "Identify breed from photo.", price: 0.99 },
  { name: "FFA Creed Trainer", pkg: "com.crider.creedtrainer", desc: "Memorize creed line-by-line.", price: 0.99 },
  { name: "State Capital Quiz", pkg: "com.crider.capquiz", desc: "Flashcards for US state capitals.", price: 0.99 },
  { name: "Country Flag Quiz", pkg: "com.crider.flagquiz", desc: "Identify world flags.", price: 0.99 },
  { name: "Tip-of-the-Day", pkg: "com.crider.tipday", desc: "Daily ag/shop/life tip widget.", price: 0.99 },
  { name: "Quote of the Day", pkg: "com.crider.quoteday", desc: "Daily inspirational quote, share to socials.", price: 0.99 },

  // Health / Lifestyle
  { name: "Water Intake", pkg: "com.crider.waterlog", desc: "Track daily oz of water with reminders.", price: 0.99 },
  { name: "Steps Pedometer", pkg: "com.crider.steps", desc: "Phone-only step counter with goals.", price: 0.99 },
  { name: "Sleep Log", pkg: "com.crider.sleeplog", desc: "Bed/wake times, quality rating.", price: 0.99 },
  { name: "Weight Log", pkg: "com.crider.weightlog", desc: "Daily weight + bodyfat, trend chart.", price: 0.99 },
  { name: "Push-Up Counter", pkg: "com.crider.pushup", desc: "Proximity sensor counts push-ups.", price: 0.99 },
  { name: "Hydration for Workers", pkg: "com.crider.workhydrate", desc: "Heat index alerts for outside crews.", price: 1.99 },
  { name: "First Aid Offline", pkg: "com.crider.firstaid", desc: "Offline first aid reference, no ads.", price: 2.99 },
  { name: "Medication Reminder", pkg: "com.crider.medremind", desc: "Pill reminders, local notifications only.", price: 1.99 },
  { name: "Mood Journal", pkg: "com.crider.moodlog", desc: "Daily mood + note, weekly chart.", price: 1.99 },
  { name: "Gratitude Journal", pkg: "com.crider.gratlog", desc: "3 things daily, monthly review.", price: 0.99 },

  // Tools / Misc
  { name: "Magnifier with Light", pkg: "com.crider.magnify", desc: "Camera magnifier with flashlight.", price: 0.99 },
  { name: "Mirror App", pkg: "com.crider.mirror", desc: "Front cam mirror, no recording.", price: 0.99 },
  { name: "Stopwatch Multi", pkg: "com.crider.stopmulti", desc: "Run 4 stopwatches at once for shop timing.", price: 0.99 },
  { name: "Countdown Timer Multi", pkg: "com.crider.timermulti", desc: "Multiple named timers (smoker, oven, etc.).", price: 0.99 },
  { name: "Unit Converter", pkg: "com.crider.units", desc: "Length/weight/volume/temp/area converter.", price: 0.99 },
  { name: "Currency Converter Offline", pkg: "com.crider.currency", desc: "Last-fetched rates, works offline after sync.", price: 1.99 },
  { name: "Tip Calculator", pkg: "com.crider.tipcalc", desc: "Quick tip + bill split.", price: 0.99 },
  { name: "Discount Calculator", pkg: "com.crider.discount", desc: "% off, double discount, final price.", price: 0.99 },
  { name: "Sales Tax Calc", pkg: "com.crider.taxcalc", desc: "Per-state sales tax, save default.", price: 0.99 },
  { name: "Loan Payment Calc", pkg: "com.crider.loancalc", desc: "Auto, mortgage, equipment loan payment.", price: 0.99 },
  { name: "Mortgage Amortization", pkg: "com.crider.amortcalc", desc: "Full schedule, extra payment savings.", price: 1.99 },
  { name: "Compound Interest", pkg: "com.crider.compound", desc: "Long-term savings projection.", price: 0.99 },
  { name: "Random Password Gen", pkg: "com.crider.passgen", desc: "Offline secure password generator.", price: 0.99 },
  { name: "Random Name Picker", pkg: "com.crider.namepick", desc: "Pick random name from list, raffle mode.", price: 0.99 },
  { name: "Decision Wheel", pkg: "com.crider.decide", desc: "Spin-the-wheel decision maker.", price: 0.99 },
  { name: "Coin Inventory", pkg: "com.crider.coininv", desc: "Track coin collection with photos + values.", price: 1.99 },
  { name: "Knife Sharpening Log", pkg: "com.crider.knifelog", desc: "Track sharpening per knife, angle, stone.", price: 0.99 },
  { name: "Boot/Workwear Log", pkg: "com.crider.bootlog", desc: "Track wear on boots, gloves, helmets — reorder reminders.", price: 0.99 },
  { name: "Glove Size Picker", pkg: "com.crider.glovesize", desc: "Measure hand to size lookup by brand.", price: 0.99 },
  { name: "Hat Size Calculator", pkg: "com.crider.hatsize", desc: "Head circumference to US/EU/UK hat size.", price: 0.99 },
];

function buildPrompt(idea: Idea): string {
  return `You are an expert Android engineer working inside Android Studio (Gemini in-IDE). Scaffold a complete, production-ready Android app.

APP NAME: ${idea.name}
PACKAGE: ${idea.pkg}
ONE-LINER: ${idea.desc}
PRICE: $${idea.price.toFixed(2)} one-time purchase on Google Play

REQUIREMENTS
- Language: Kotlin, single-module
- Min SDK 24, Target SDK 34, AGP 8.7, Kotlin 1.9.25
- UI: Jetpack Compose + Material 3, dark/light theme support
- Architecture: MVVM with ViewModel + StateFlow, Hilt for DI
- Persistence: Room (local SQLite). NO backend, NO accounts, NO network calls unless feature requires it
- Storage: DataStore Preferences for settings
- Navigation: Compose Navigation
- Testing: JUnit + Compose UI test for one happy-path
- Build a clean settings screen with: theme toggle, units (imperial/metric where relevant), export data, about
- One-time purchase model: gate all premium features behind a single Google Play in-app product id "${idea.pkg}.unlock_pro" using BillingClient v6. Show paywall sheet for locked features.
- Include export to CSV and share-sheet for primary records
- Include adaptive launcher icon placeholder
- Provide proper AndroidManifest permissions (only what's needed) and runtime permission flows
- Include a README.md explaining build, signing, and Play Store release steps
- Code must compile out of the box with \`./gradlew assembleDebug\`

DELIVER
1. Full project tree
2. All Kotlin source files
3. build.gradle (project + app)
4. AndroidManifest.xml
5. Compose screens for: main feature, history/list, detail, settings, paywall
6. Room entities, DAOs, database
7. Sample data seeded on first launch
8. README with one-time purchase setup in Play Console

Begin scaffolding now. Use idiomatic 2026 Android best practices. No deprecated APIs.`;
}

export default function AndroidAppIdeas() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"default" | "priceHigh" | "priceLow">("default");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let result = s
      ? IDEAS.filter(
          (i) =>
            i.name.toLowerCase().includes(s) ||
            i.pkg.toLowerCase().includes(s) ||
            i.desc.toLowerCase().includes(s) ||
            i.price.toFixed(2).includes(s)
        )
      : [...IDEAS];

    if (sort === "priceHigh") {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === "priceLow") {
      result.sort((a, b) => a.price - b.price);
    }

    return result;
  }, [q, sort]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: label });
    } catch {
      toast({ title: "Copy failed", description: "Long-press to copy manually", variant: "destructive" });
    }
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Smartphone className="w-7 h-7 text-primary" />
                  Android App Ideas
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {IDEAS.length} one-time-purchase app ideas. Tap an idea to copy the AI prompt for Android Studio (Gemini).
                </p>
              </div>
              <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
                Owner Vault
              </Badge>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search 150 ideas…"
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "default" | "priceHigh" | "priceLow")}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="default">Default</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="priceLow">Price: Low to High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((idea) => {
              const prompt = buildPrompt(idea);
              return (
                <Card key={idea.pkg} className="hover:border-primary/60 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{idea.name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                        ${idea.price.toFixed(2)}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-[10px] break-all">
                      {idea.pkg}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-3">{idea.desc}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(idea.name, "App name")}>
                        <Copy className="w-3 h-3 mr-1" />Name
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copy(idea.pkg, "Package id")}>
                        <Copy className="w-3 h-3 mr-1" />Pkg
                      </Button>
                      <Button size="sm" onClick={() => copy(prompt, "Gemini prompt")}>
                        <Copy className="w-3 h-3 mr-1" />Prompt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">No ideas match &quot;{q}&quot;.</p>
          )}
        </div>
      </div>
    </DevHubGuard>
  );
}
