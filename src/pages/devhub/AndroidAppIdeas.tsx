import { useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Smartphone, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Idea = { name: string; pkg: string; desc: string };

const IDEAS: Idea[] = [
  // Shop / Trade Utilities
  { name: "Welding Hours Tracker", pkg: "com.crider.weldhours", desc: "Clock in/out at the shop, log job notes, export weekly CSV/PDF timesheet. Local SQLite only." },
  { name: "Cattle Weight Estimator", pkg: "com.crider.cattleweight", desc: "Heart-girth + length input, returns estimated lbs using Schaeffer formula. Save history per animal." },
  { name: "Hay Bale Calculator", pkg: "com.crider.haycalc", desc: "Compute bales needed per head per winter. Inputs: head count, days, lbs/day, bale weight." },
  { name: "Feed Cost Splitter", pkg: "com.crider.feedsplit", desc: "Split bag of feed cost across multiple animals by weight or days fed." },
  { name: "Pasture Rotation Planner", pkg: "com.crider.pastureplan", desc: "Track paddocks, days grazed, rest period, alerts when rotation is due." },
  { name: "Tractor Maintenance Log", pkg: "com.crider.tractorlog", desc: "Log hours, oil changes, filters per piece of equipment. Reminder when due." },
  { name: "Chainsaw Sharpening Log", pkg: "com.crider.sawlog", desc: "Track sharpening intervals, chain types, file size per saw." },
  { name: "Fence Post Calculator", pkg: "com.crider.fencecalc", desc: "Inputs perimeter, post spacing, gate count. Returns posts, wire rolls, staples needed." },
  { name: "Concrete Volume Calc", pkg: "com.crider.concretecalc", desc: "Slab, footer, sonotube. Cubic yards + bag count." },
  { name: "Lumber Board Foot Calc", pkg: "com.crider.boardfoot", desc: "T x W x L / 12. Batch list with total + cost." },
  { name: "Welding Rod Picker", pkg: "com.crider.rodpicker", desc: "Pick stick/MIG/TIG rod by metal type and thickness." },
  { name: "Plasma Cutter Settings", pkg: "com.crider.plasma", desc: "Recommended amps and travel speed by material thickness." },
  { name: "Welding Gas Mix Picker", pkg: "com.crider.weldgas", desc: "Suggest gas mix by process and metal." },
  { name: "Bolt Torque Lookup", pkg: "com.crider.torque", desc: "Grade 5/8 bolt torque chart, ft-lb and Nm." },
  { name: "Pipe Cut Length Calc", pkg: "com.crider.pipecut", desc: "Miter and saddle cut layouts, prints to PDF template." },
  { name: "Sheet Metal Bend Calc", pkg: "com.crider.bendcalc", desc: "K-factor, bend allowance, flat pattern." },
  { name: "Drill & Tap Chart", pkg: "com.crider.tapchart", desc: "Tap size to drill size lookup, imperial + metric." },
  { name: "Battery Voltage Tester Log", pkg: "com.crider.battlog", desc: "Log 12V battery voltage over time per vehicle, alert on drop." },
  { name: "12V Wire Gauge Calc", pkg: "com.crider.wirecalc", desc: "Amps + run length to AWG recommendation." },
  { name: "Solar Sizing Estimator", pkg: "com.crider.solarcalc", desc: "Daily watt-hours to panel + battery bank size." },

  // FFA / Livestock
  { name: "FFA Record Book Lite", pkg: "com.crider.ffarecord", desc: "Track SAE hours, projects, expenses. Export to PDF/CSV." },
  { name: "Show Animal Weigh-In", pkg: "com.crider.showweigh", desc: "Daily weight log with average daily gain chart per show animal." },
  { name: "Show Day Checklist", pkg: "com.crider.showday", desc: "Editable show-day packing + grooming checklist." },
  { name: "Breeding Calendar", pkg: "com.crider.breedcal", desc: "Track heat cycles + due dates for cows, sheep, goats, hogs." },
  { name: "Calf Birth Log", pkg: "com.crider.calflog", desc: "Quick calf entry: dam, sire, tag, sex, weight, notes." },
  { name: "Medication Withdrawal Tracker", pkg: "com.crider.medwithdraw", desc: "Log meds, calc withdrawal date before slaughter/show." },
  { name: "Vaccination Schedule", pkg: "com.crider.vaxsched", desc: "Per-species vaccine schedule with push reminders." },
  { name: "Feed Ration Mixer", pkg: "com.crider.feedmix", desc: "Build mixed ration, target protein %, cost per ton." },
  { name: "Goat Hoof Trim Log", pkg: "com.crider.hoofcal", desc: "Track last trim date per goat, alerts at 6 weeks." },
  { name: "Egg Production Tracker", pkg: "com.crider.egglog", desc: "Daily egg counts per coop with weekly chart." },
  { name: "Chicken Feed Calc", pkg: "com.crider.chickfeed", desc: "Layers vs broilers, lbs/day by age." },
  { name: "Bee Hive Inspection Log", pkg: "com.crider.beelog", desc: "Per-hive inspection notes, queen status, honey supers." },
  { name: "Pig Grow-Out Tracker", pkg: "com.crider.pigrow", desc: "Track ADG, feed conversion, projected sale weight." },
  { name: "Sheep Lambing Log", pkg: "com.crider.lamblog", desc: "Lambing records, ewe productivity report." },
  { name: "Pasture Forage Tester", pkg: "com.crider.foragecal", desc: "Estimate dry matter intake and stocking rate." },
  { name: "Manure Spread Calc", pkg: "com.crider.manurecalc", desc: "Acres, tons/acre, NPK estimate." },
  { name: "Livestock Sale Logger", pkg: "com.crider.salelog", desc: "Log sales by buyer, weight, $/lb, total." },
  { name: "FFA Officer Tracker", pkg: "com.crider.ffaoffice", desc: "Track chapter officer duties + meeting minutes." },
  { name: "CDE Practice Drill", pkg: "com.crider.cdeprep", desc: "Flashcards for livestock judging, parli pro, ag sales." },
  { name: "Parli Pro Reference", pkg: "com.crider.parlipro", desc: "Offline Robert's Rules quick reference for FFA meetings." },

  // Outdoors / Hunting / Fishing
  { name: "Hunting Log", pkg: "com.crider.huntlog", desc: "Log harvests: date, GPS, species, weapon, weather." },
  { name: "Trail Cam Photo Sorter", pkg: "com.crider.trailcam", desc: "Sort SD card photos by date, tag bucks, mark trophies." },
  { name: "Deer Score Calculator", pkg: "com.crider.deerscore", desc: "Boone & Crockett gross/net typical + non-typical scoring." },
  { name: "Fish Catch Log", pkg: "com.crider.fishlog", desc: "Species, length, weight, lure, GPS, weather." },
  { name: "Fishing Knot Trainer", pkg: "com.crider.knotapp", desc: "Animated step-by-step knot tutorials, offline." },
  { name: "Tackle Box Inventory", pkg: "com.crider.tacklebox", desc: "Inventory lures, line, hooks. Reorder list." },
  { name: "Sunrise/Sunset/Moon", pkg: "com.crider.sunmoon", desc: "Hunting/fishing best times by date + location." },
  { name: "Wind Direction Stand Picker", pkg: "com.crider.standwind", desc: "Pick best deer stand based on today's wind." },
  { name: "Reloading Recipe Log", pkg: "com.crider.reloadlog", desc: "Log powder, primer, bullet, COAL per load. Group sizes." },
  { name: "Rifle Zero Tracker", pkg: "com.crider.zerolog", desc: "Log zeros, scope clicks, ammo lots per rifle." },

  // Garage / Vehicle
  { name: "Vehicle Maintenance Log", pkg: "com.crider.vehlog", desc: "Per-vehicle service log, mileage reminders." },
  { name: "Fuel MPG Tracker", pkg: "com.crider.mpglog", desc: "Log fillups, calc MPG, $/mile." },
  { name: "Tire Pressure Log", pkg: "com.crider.tirelog", desc: "Track cold pressure per tire, rotation reminders." },
  { name: "OBD-II Code Lookup", pkg: "com.crider.obd2", desc: "Offline P0/P1 code dictionary, common causes + fixes." },
  { name: "Trailer Load Calc", pkg: "com.crider.trailerload", desc: "Tongue weight, GVWR, axle distribution warnings." },
  { name: "Hitch Class Picker", pkg: "com.crider.hitchpick", desc: "Pick hitch class by trailer GVWR." },
  { name: "Engine Bolt Pattern", pkg: "com.crider.boltpattern", desc: "Lug pattern lookup for trucks + trailers." },
  { name: "Brake Pad Reminder", pkg: "com.crider.brakelog", desc: "Track pad thickness, miles since last replace." },
  { name: "Oil Change Reminder", pkg: "com.crider.oilreminder", desc: "Per vehicle interval + push reminder." },
  { name: "VIN Decoder Offline", pkg: "com.crider.vindecode", desc: "Decode US VIN to year/make/plant locally." },

  // Construction / Trade
  { name: "Stud Spacing Calc", pkg: "com.crider.studcalc", desc: "Wall length to stud count at 16 or 24 oc." },
  { name: "Rafter Length Calc", pkg: "com.crider.raftercalc", desc: "Run + pitch to rafter length, plumb + bird's mouth angles." },
  { name: "Stair Calculator", pkg: "com.crider.staircalc", desc: "Total rise/run to riser + tread, stringer length." },
  { name: "Roof Pitch Finder", pkg: "com.crider.roofpitch", desc: "Use phone gyroscope to read roof pitch." },
  { name: "Drywall Estimator", pkg: "com.crider.drywallcalc", desc: "Sheets + screws + mud + tape from sq ft." },
  { name: "Paint Coverage Calc", pkg: "com.crider.paintcalc", desc: "Gallons per coat from room dimensions." },
  { name: "Insulation R-Value", pkg: "com.crider.rvaluecalc", desc: "Recommended R-value by zone, batt vs blown depth." },
  { name: "Floor Joist Span", pkg: "com.crider.joistspan", desc: "Span table lookup by lumber size + spacing." },
  { name: "Beam Sizing Helper", pkg: "com.crider.beamcalc", desc: "Quick beam sizing for residential loads." },
  { name: "Trim Cut List", pkg: "com.crider.trimcut", desc: "Optimize cut list from stock lengths." },

  // Home / Personal
  { name: "Grocery Price Book", pkg: "com.crider.pricebook", desc: "Track unit prices per store, find best deal." },
  { name: "Pantry Inventory", pkg: "com.crider.pantry", desc: "Scan barcodes, expiry alerts." },
  { name: "Recipe Box Offline", pkg: "com.crider.recipebox", desc: "Personal recipes with shopping list export." },
  { name: "Meal Plan Calendar", pkg: "com.crider.mealplan", desc: "Drag recipes onto week, auto shopping list." },
  { name: "Canning Time Lookup", pkg: "com.crider.canlog", desc: "Pressure/water-bath times by jar size + food." },
  { name: "Freezer Inventory", pkg: "com.crider.freezerlog", desc: "Track meat cuts, dates, weights." },
  { name: "Cattle Beef Cut Yield", pkg: "com.crider.beefyield", desc: "Live weight to hanging weight to take-home cuts." },
  { name: "Smoker Temp Log", pkg: "com.crider.smokerlog", desc: "Track pit + meat temp over cook time." },
  { name: "BBQ Rub Builder", pkg: "com.crider.rubbuilder", desc: "Build + scale dry rub recipes." },
  { name: "Garden Planner", pkg: "com.crider.gardenplan", desc: "Plant by frost date, square-foot layout." },

  // Money / Productivity
  { name: "Tip Splitter", pkg: "com.crider.tipsplit", desc: "Split tab + tip across people, per-item assign." },
  { name: "Cash Envelope Budget", pkg: "com.crider.envelope", desc: "Local-only envelope budget." },
  { name: "Coin Roll Counter", pkg: "com.crider.coinroll", desc: "Count coins by denomination, rolls + value." },
  { name: "Daily Cash Log", pkg: "com.crider.cashlog", desc: "Quick cash-in/cash-out journal." },
  { name: "Side Hustle Income", pkg: "com.crider.sidelog", desc: "Log income streams, weekly + monthly totals." },
  { name: "Invoice PDF Generator", pkg: "com.crider.invoicepdf", desc: "One-page invoice PDF, no account needed." },
  { name: "Receipt Scanner Offline", pkg: "com.crider.receiptscan", desc: "OCR receipts to CSV, fully local." },
  { name: "Mileage Log IRS", pkg: "com.crider.mileagelog", desc: "GPS auto-track business miles, IRS report." },
  { name: "Time Card Stamp", pkg: "com.crider.timecard", desc: "Punch in/out, export weekly timesheet." },
  { name: "Goal Streak Tracker", pkg: "com.crider.streak", desc: "Daily habit streaks with reminders." },

  // Communication / Camera / Hardware
  { name: "NFC Tag Writer", pkg: "com.crider.nfcwrite", desc: "Write text/URL/wifi to NTAG215, lock optional." },
  { name: "QR Code Maker", pkg: "com.crider.qrmake", desc: "Generate QR for text/URL/wifi/vcard, save PNG." },
  { name: "Barcode Inventory", pkg: "com.crider.barscan", desc: "Scan UPC, build inventory list, CSV export." },
  { name: "Flashlight Pro", pkg: "com.crider.flashpro", desc: "SOS, strobe, lantern modes." },
  { name: "Bubble Level", pkg: "com.crider.level", desc: "Gyroscope-based level + protractor." },
  { name: "Decibel Meter", pkg: "com.crider.dbmeter", desc: "Sound level meter with logging." },
  { name: "Compass Pro", pkg: "com.crider.compass", desc: "True/magnetic compass with declination." },
  { name: "GPS Coordinates", pkg: "com.crider.gpscoords", desc: "Show lat/long in multiple formats, share location." },
  { name: "Walkie Talkie LAN", pkg: "com.crider.walkielan", desc: "Push-to-talk over local wifi, no internet." },
  { name: "Offline Notes", pkg: "com.crider.offnotes", desc: "Markdown notes, fully local, export TXT." },

  // Education / Reference
  { name: "Ag Acronym Dictionary", pkg: "com.crider.agdict", desc: "Offline ag/FFA acronym + term dictionary." },
  { name: "Cattle Breed Guide", pkg: "com.crider.cattlebreeds", desc: "Photos + traits for 50+ beef + dairy breeds." },
  { name: "Sheep Breed Guide", pkg: "com.crider.sheepbreeds", desc: "Photos + traits for sheep breeds." },
  { name: "Hog Breed Guide", pkg: "com.crider.hogbreeds", desc: "Photos + traits for swine breeds." },
  { name: "Chicken Breed Guide", pkg: "com.crider.chickbreeds", desc: "Egg color, hardiness, temperament." },
  { name: "Plant ID Guide", pkg: "com.crider.plantid", desc: "Common pasture grasses + weeds reference." },
  { name: "Poison Plant Guide", pkg: "com.crider.poisonplant", desc: "Toxic plants by species for livestock." },
  { name: "Knot Tying Reference", pkg: "com.crider.knotref", desc: "Rope knots: bowline, clove hitch, etc., animated." },
  { name: "Welding Symbol Guide", pkg: "com.crider.weldsym", desc: "AWS welding symbol cheatsheet." },
  { name: "Blueprint Symbol Guide", pkg: "com.crider.bpsym", desc: "Electrical, plumbing, HVAC symbol reference." },

  // Games / Fun
  { name: "Coin Flip Multi", pkg: "com.crider.coinflip", desc: "Flip 1-100 coins, stats." },
  { name: "Dice Roller", pkg: "com.crider.diceroll", desc: "D4-D100 polyhedral dice." },
  { name: "Truck or Trailer? Quiz", pkg: "com.crider.truckquiz", desc: "Guess truck make/model from photo." },
  { name: "Tractor Trivia", pkg: "com.crider.tractortrivia", desc: "Daily ag + tractor trivia." },
  { name: "Cattle Breed Quiz", pkg: "com.crider.breedquiz", desc: "Identify breed from photo." },
  { name: "FFA Creed Trainer", pkg: "com.crider.creedtrainer", desc: "Memorize creed line-by-line." },
  { name: "State Capital Quiz", pkg: "com.crider.capquiz", desc: "Flashcards for US state capitals." },
  { name: "Country Flag Quiz", pkg: "com.crider.flagquiz", desc: "Identify world flags." },
  { name: "Tip-of-the-Day", pkg: "com.crider.tipday", desc: "Daily ag/shop/life tip widget." },
  { name: "Quote of the Day", pkg: "com.crider.quoteday", desc: "Daily inspirational quote, share to socials." },

  // Health / Lifestyle
  { name: "Water Intake", pkg: "com.crider.waterlog", desc: "Track daily oz of water with reminders." },
  { name: "Steps Pedometer", pkg: "com.crider.steps", desc: "Phone-only step counter with goals." },
  { name: "Sleep Log", pkg: "com.crider.sleeplog", desc: "Bed/wake times, quality rating." },
  { name: "Weight Log", pkg: "com.crider.weightlog", desc: "Daily weight + bodyfat, trend chart." },
  { name: "Push-Up Counter", pkg: "com.crider.pushup", desc: "Proximity sensor counts push-ups." },
  { name: "Hydration for Workers", pkg: "com.crider.workhydrate", desc: "Heat index alerts for outside crews." },
  { name: "First Aid Offline", pkg: "com.crider.firstaid", desc: "Offline first aid reference, no ads." },
  { name: "Medication Reminder", pkg: "com.crider.medremind", desc: "Pill reminders, local notifications only." },
  { name: "Mood Journal", pkg: "com.crider.moodlog", desc: "Daily mood + note, weekly chart." },
  { name: "Gratitude Journal", pkg: "com.crider.gratlog", desc: "3 things daily, monthly review." },

  // Tools / Misc
  { name: "Magnifier with Light", pkg: "com.crider.magnify", desc: "Camera magnifier with flashlight." },
  { name: "Mirror App", pkg: "com.crider.mirror", desc: "Front cam mirror, no recording." },
  { name: "Stopwatch Multi", pkg: "com.crider.stopmulti", desc: "Run 4 stopwatches at once for shop timing." },
  { name: "Countdown Timer Multi", pkg: "com.crider.timermulti", desc: "Multiple named timers (smoker, oven, etc.)." },
  { name: "Unit Converter", pkg: "com.crider.units", desc: "Length/weight/volume/temp/area converter." },
  { name: "Currency Converter Offline", pkg: "com.crider.currency", desc: "Last-fetched rates, works offline after sync." },
  { name: "Tip Calculator", pkg: "com.crider.tipcalc", desc: "Quick tip + bill split." },
  { name: "Discount Calculator", pkg: "com.crider.discount", desc: "% off, double discount, final price." },
  { name: "Sales Tax Calc", pkg: "com.crider.taxcalc", desc: "Per-state sales tax, save default." },
  { name: "Loan Payment Calc", pkg: "com.crider.loancalc", desc: "Auto, mortgage, equipment loan payment." },
  { name: "Mortgage Amortization", pkg: "com.crider.amortcalc", desc: "Full schedule, extra payment savings." },
  { name: "Compound Interest", pkg: "com.crider.compound", desc: "Long-term savings projection." },
  { name: "Random Password Gen", pkg: "com.crider.passgen", desc: "Offline secure password generator." },
  { name: "Random Name Picker", pkg: "com.crider.namepick", desc: "Pick random name from list, raffle mode." },
  { name: "Decision Wheel", pkg: "com.crider.decide", desc: "Spin-the-wheel decision maker." },
  { name: "Coin Inventory", pkg: "com.crider.coininv", desc: "Track coin collection with photos + values." },
  { name: "Knife Sharpening Log", pkg: "com.crider.knifelog", desc: "Track sharpening per knife, angle, stone." },
  { name: "Boot/Workwear Log", pkg: "com.crider.bootlog", desc: "Track wear on boots, gloves, helmets — reorder reminders." },
  { name: "Glove Size Picker", pkg: "com.crider.glovesize", desc: "Measure hand to size lookup by brand." },
  { name: "Hat Size Calculator", pkg: "com.crider.hatsize", desc: "Head circumference to US/EU/UK hat size." },
];

function buildPrompt(idea: Idea): string {
  return `You are an expert Android engineer working inside Android Studio (Gemini in-IDE). Scaffold a complete, production-ready Android app.

APP NAME: ${idea.name}
PACKAGE: ${idea.pkg}
ONE-LINER: ${idea.desc}

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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return IDEAS;
    return IDEAS.filter(i =>
      i.name.toLowerCase().includes(s) ||
      i.pkg.toLowerCase().includes(s) ||
      i.desc.toLowerCase().includes(s)
    );
  }, [q]);

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

            <div className="mt-4 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 150 ideas…"
                className="pl-9"
              />
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
                    <CardTitle className="text-base">{idea.name}</CardTitle>
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
            <p className="text-center text-sm text-muted-foreground py-12">No ideas match "{q}".</p>
          )}
        </div>
      </div>
    </DevHubGuard>
  );
}
