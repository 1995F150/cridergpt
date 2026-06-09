import { useEffect, useMemo, useState } from "react";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Smartphone, Search, ArrowUpDown, Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BUILDER_TOOLS = [
  { value: "android-studio", label: "Android Studio (Gemini)" },
  { value: "rork", label: "Rork" },
  { value: "flutterflow", label: "FlutterFlow" },
  { value: "bolt", label: "Bolt.new" },
  { value: "lovable", label: "Lovable" },
  { value: "a0dev", label: "a0.dev" },
  { value: "replit", label: "Replit Agent" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "idea", label: "Idea" },
  { value: "building", label: "Building" },
  { value: "published", label: "Published" },
];

type DBIdea = {
  id: string;
  user_id: string;
  name: string;
  pkg: string;
  description: string;
  price: number;
  builder_tool: string;
  needs_backend: boolean;
  category: string;
  status: string;
};

type Idea = { name: string; pkg: string; desc: string; price: number };

const IDEAS: Idea[] = [
  // Premium Flagship Suites ($199+)
  { name: "CriderOps Ranch Command Center", pkg: "com.crider.ranchcommand", desc: "Enterprise-grade ranch operations platform: multi-property livestock, employee payroll/timecards, equipment fleet, GPS pasture mapping, AI yield forecasting, integrated accounting, USDA-compliant traceability exports, custom dashboards for owners + foremen. Lifetime license.", price: 399.00 },
  { name: "WeldShop Enterprise Suite", pkg: "com.crider.weldshopent", desc: "Complete fabrication shop manager: job estimating, AWS-compliant WPS/PQR documentation, welder certification tracking, material inventory, customer CRM, invoicing, photo job logs, multi-user shop floor terminals. Lifetime license.", price: 299.00 },
  { name: "FFA Chapter Pro Admin", pkg: "com.crider.ffachapterpro", desc: "Full chapter management for advisors: member roster, SAE record books, CDE team prep, fundraiser ledger, parent communications, banquet planner, officer election system, state report exports. Lifetime per chapter.", price: 249.00 },
  { name: "AgriTrack Commercial Cattle Suite", pkg: "com.crider.agritrack", desc: "Commercial cow-calf and feedlot operation: EID integration, individual animal P/L, ration formulator, breeding genetics tracker, market price feed, hauling logs, lender-ready financial reports. Lifetime license.", price: 199.00 },

  // Shop / Trade Utilities
  { name: "Complete Farm & Livestock Manager Pro", pkg: "com.crider.farmpro", desc: "All-in-one farm management: livestock records, breeding calendar, feed rations, equipment maintenance, pasture rotation, sales ledger, vet log, financial reports, and weather integration. Multi-property, full offline, optional cloud sync.", price: 10.00 },
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
  // Expanded catalog ($0.99 - $99.99, ~400 ideas)
  { name: "CriderShop Pro Suite", pkg: "com.crider.crishopproui", desc: "Full welding/fab shop management: jobs, invoices, time, inventory, quoting, customer portal export.", price: 99.99 },
  { name: "FarmOps Enterprise", pkg: "com.crider.farmopsent", desc: "Multi-farm enterprise: livestock, crops, payroll for hired help, equipment depreciation, P&L.", price: 89.99 },
  { name: "Livestock Auction Manager", pkg: "com.crider.lvauctionmgr", desc: "Run a small sale barn: consignors, lots, bidders, settlement sheets, 1099 export.", price: 79.99 },
  { name: "Custom Harvest Manager", pkg: "com.crider.custharvest", desc: "Track acres cut, baled, hauled per customer, invoice by acre/bale/hour.", price: 69.99 },
  { name: "Trucking Dispatch Lite", pkg: "com.crider.truckdisp", desc: "Owner-op dispatch: loads, miles, fuel, IFTA prep, settlements.", price: 59.99 },
  { name: "Construction Bid Builder", pkg: "com.crider.cbidbuilder", desc: "Itemized residential bids with markup, material lists, signed PDF export.", price: 54.99 },
  { name: "Excavator Job Tracker Pro", pkg: "com.crider.excavpro", desc: "Track dozer/excavator hours per job site with photo log + invoice export.", price: 49.99 },
  { name: "Cabinet Shop Cutlist", pkg: "com.crider.cabcutlist", desc: "Optimized sheet goods cutlist with kerf, grain direction, label printer support.", price: 44.99 },
  { name: "CNC Plasma Nest Planner", pkg: "com.crider.plasmanest", desc: "Import DXF, auto-nest parts on sheet, export G-code preview.", price: 39.99 },
  { name: "Hay Brokerage Manager", pkg: "com.crider.haybroker", desc: "Track loads bought/sold, basis, freight, profit per ton.", price: 34.99 },
  { name: "Livestock Order Buyer", pkg: "com.crider.ordbuyer", desc: "Buy/sell cattle book: pens, weights, splits, daily P&L.", price: 34.99 },
  { name: "Saddle Shop Manager", pkg: "com.crider.saddleshop", desc: "Custom tack orders, leather inventory, customer measurements, photo gallery.", price: 29.99 },
  { name: "Gunsmith Job Book", pkg: "com.crider.gunbook", desc: "Customer firearm intake, work orders, ATF-style logbook (offline).", price: 29.99 },
  { name: "Taxidermy Studio Manager", pkg: "com.crider.taxstudio", desc: "Mount intake, deposit, due date, supplier orders, customer SMS reminders.", price: 29.99 },
  { name: "Small Engine Repair Shop", pkg: "com.crider.smengshop", desc: "Mower/tractor repair tickets, parts markup, customer history.", price: 29.99 },
  { name: "Farrier Route Manager", pkg: "com.crider.farrierroute", desc: "Per-horse trim/shoe schedule across barns, route map, invoicing.", price: 29.99 },
  { name: "Vet Mobile Practice", pkg: "com.crider.vetmobile", desc: "Solo vet mobile practice: charts, vaccines, drug log, billing.", price: 29.99 },
  { name: "AI Cattle Photo Grader", pkg: "com.crider.cattlegrade", desc: "Take a side photo, estimate USDA yield/quality grade. Offline ML model.", price: 27.99 },
  { name: "Land Survey Helper", pkg: "com.crider.landsurv", desc: "GPS waypoints, area calc, basic boundary sketch export to PDF.", price: 26.99 },
  { name: "Logging Operation Tracker", pkg: "com.crider.loggertrk", desc: "Cords cut, loads hauled, mill tickets, crew payroll.", price: 25.99 },
  { name: "Welder Estimator Pro", pkg: "com.crider.welderest", desc: "Rod lbs + labor hr + travel = quote with PDF.", price: 19.99 },
  { name: "Farm Vehicle Maintenance", pkg: "com.crider.farmveh", desc: "Per-VIN service log, DOT inspection reminders, fuel log.", price: 19.99 },
  { name: "Livestock Genetics Tracker", pkg: "com.crider.lvgenetic", desc: "Pedigree, EPDs, breeding plan, photo per animal.", price: 18.99 },
  { name: "Pasture Walk Recorder", pkg: "com.crider.pastwalk", desc: "GPS-tagged forage notes, brix readings, season chart.", price: 17.99 },
  { name: "Dairy Parlor Log", pkg: "com.crider.dairylog", desc: "Per-cow milk, SCC, mastitis log, vet bill split.", price: 17.99 },
  { name: "Goat Dairy Manager", pkg: "com.crider.goatdairy", desc: "Doe milk records, cheese yield calc, fat/protein log.", price: 16.99 },
  { name: "Backyard Slaughter Log", pkg: "com.crider.slaughterlog", desc: "Custom processing record book for on-farm butcher, label printing.", price: 15.99 },
  { name: "Smokehouse Cure Calculator", pkg: "com.crider.smokecure", desc: "Pink salt #1/#2 calc by lb, brine percent, time/temp logs.", price: 14.99 },
  { name: "Sausage Recipe Vault", pkg: "com.crider.sausvault", desc: "Recipe builder by % seasoning, scale up/down, PDF print.", price: 13.99 },
  { name: "Beekeeper Pro", pkg: "com.crider.beekeeperpro", desc: "Apiary mgmt, queen tracking, harvest log, treatment timeline.", price: 13.99 },
  { name: "Maple Sap Tracker", pkg: "com.crider.mapletrack", desc: "Tap counts, sap gallons, sugar content, syrup yield.", price: 12.99 },
  { name: "Orchard Spray Log", pkg: "com.crider.orchardspray", desc: "Per-block spray records, REI/PHI compliance, weather pull.", price: 12.99 },
  { name: "Pesticide Applicator Log", pkg: "com.crider.pestapply", desc: "State-compliant restricted-use pesticide app records.", price: 12.99 },
  { name: "CDL Pre-Trip Inspector", pkg: "com.crider.cdlpretrip", desc: "Walk-around checklist with photos + e-signature for fleet.", price: 11.99 },
  { name: "DOT Hours of Service", pkg: "com.crider.dotlog", desc: "Personal HOS log for ag-exempt operations, weekly summary PDF.", price: 11.99 },
  { name: "Hay Drying Calculator", pkg: "com.crider.haydry", desc: "Predict cure time from moisture, RH, wind, swath density.", price: 10.99 },
  { name: "Silage Pack Calculator", pkg: "com.crider.silagepack", desc: "Tractor weight + pack time to density target.", price: 10.99 },
  { name: "Corn Yield Estimator", pkg: "com.crider.cornyield", desc: "Ear count, kernel rows, length to bushels/acre estimate.", price: 10.99 },
  { name: "Soybean Yield Estimator", pkg: "com.crider.soyyield", desc: "Pod count, seeds/pod, weight to yield.", price: 10.99 },
  { name: "Greenhouse Climate Log", pkg: "com.crider.ghclimate", desc: "Manual temp/RH log, alert thresholds, chart export.", price: 10.99 },
  { name: "Hydroponic Nutrient Mixer", pkg: "com.crider.hydromix", desc: "EC/PPM target, A+B mix, weekly schedule.", price: 10.99 },
  { name: "Mushroom Grow Log", pkg: "com.crider.shroomlog", desc: "Per-block colonization timeline, yield/lb of substrate.", price: 10.99 },
  { name: "Microgreens Production Plan", pkg: "com.crider.micrgrn", desc: "Tray schedule, harvest by restaurant order.", price: 10.99 },
  { name: "Farmers Market POS Offline", pkg: "com.crider.fmpos", desc: "Card-reader-free POS, cash drawer, end-of-day report.", price: 10.99 },
  { name: "CSA Box Builder", pkg: "com.crider.csabuild", desc: "Plan weekly boxes, member portal export, packing list.", price: 10.99 },
  { name: "Sawmill Log Scaler", pkg: "com.crider.logscaler", desc: "Doyle/Scribner/Intl 1/4 board-foot lookup per log.", price: 9.99 },
  { name: "Firewood Cord Calculator", pkg: "com.crider.firewd", desc: "Stack dims to cords, split charge calc.", price: 4.99 },
  { name: "Tree DBH & Volume", pkg: "com.crider.treevol", desc: "Diameter, height to merch volume + species lookup.", price: 6.99 },
  { name: "Land Acreage from GPS", pkg: "com.crider.acregps", desc: "Walk perimeter, get acres + map.", price: 5.99 },
  { name: "Drone Spray Mission Log", pkg: "com.crider.dronesp", desc: "Acres flown, chem used, battery cycles.", price: 8.99 },
  { name: "Fence Charger Tester", pkg: "com.crider.fencech", desc: "Log volts at posts, find shorts.", price: 4.99 },
  { name: "Mineral Lick Reminder", pkg: "com.crider.minlick", desc: "Per-pasture mineral fill reminder + cost.", price: 3.99 },
  { name: "Fly Spray Schedule", pkg: "com.crider.flyspray", desc: "Pasture rotation of pour-on, ear tags, sprays.", price: 3.99 },
  { name: "Worming Schedule", pkg: "com.crider.wormsched", desc: "Per-species worming reminders + product rotation.", price: 3.99 },
  { name: "Bull Soundness Tracker", pkg: "com.crider.bullsound", desc: "BSE results per bull, breeding load, cull alerts.", price: 6.99 },
  { name: "AI Breeding Log", pkg: "com.crider.aibreed", desc: "AI tech: bull semen inventory, breed records, conception rate.", price: 7.99 },
  { name: "Embryo Transfer Tracker", pkg: "com.crider.etlog", desc: "Donor/recip records, freeze inventory.", price: 8.99 },
  { name: "Feedlot Pen Rider Log", pkg: "com.crider.penride", desc: "Daily pen rider sick pulls, treatment, mortality.", price: 7.99 },
  { name: "Backgrounder Profit Calc", pkg: "com.crider.bgcalc", desc: "In weight, out weight, days, ADG, $/lb gain.", price: 5.99 },
  { name: "Auction Barn Bid Tracker", pkg: "com.crider.bidtrack", desc: "Personal buyer log: lot, weight, $/cwt, total.", price: 4.99 },
  { name: "Show Pig Wash Schedule", pkg: "com.crider.showpig", desc: "Daily wash/walk/feed schedule with reminders.", price: 4.99 },
  { name: "Show Steer Rinse Log", pkg: "com.crider.steerrinse", desc: "Hair care schedule with photo progress.", price: 4.99 },
  { name: "County Fair Checklist", pkg: "com.crider.fairchk", desc: "Editable per-species fair packing list.", price: 3.99 },
  { name: "FFA Banquet Planner", pkg: "com.crider.ffabanq", desc: "Run-of-show + awards script printer for chapter banquet.", price: 4.99 },
  { name: "Officer Election Counter", pkg: "com.crider.officelec", desc: "Secret ballot counter for chapter elections.", price: 2.99 },
  { name: "Career Dev Event Timer", pkg: "com.crider.cdetimer", desc: "CDE prep timer + score sheet (livestock, parli, ag sales).", price: 4.99 },
  { name: "Junior Fair Score Card", pkg: "com.crider.fairscore", desc: "Judge score input + ranking export.", price: 6.99 },
  { name: "County Extension Notebook", pkg: "com.crider.extnote", desc: "Voice notes per extension visit with GPS + crop tag.", price: 4.99 },
  { name: "Soil Test Tracker", pkg: "com.crider.soiltest", desc: "Field-by-field soil test history with lime/fert recs.", price: 6.99 },
  { name: "Tile Drainage Mapper", pkg: "com.crider.tiledrain", desc: "GPS-mark tile lines + outlet photos for repair.", price: 7.99 },
  { name: "Pocket Pasture Notes", pkg: "com.crider.pastnote", desc: "Voice/photo pasture notes with date stamp.", price: 1.99 },
  { name: "Coyote Sighting Log", pkg: "com.crider.coyotelog", desc: "GPS log of predator sightings on the farm.", price: 0.99 },
  { name: "Deer Stand Wind Picker", pkg: "com.crider.standwind", desc: "Pick best stand by wind direction.", price: 1.99 },
  { name: "Moon Phase Hunter", pkg: "com.crider.moonhunt", desc: "Moon overhead/underfoot for hunt planning.", price: 0.99 },
  { name: "Trail Cam Renamer", pkg: "com.crider.camrename", desc: "Bulk rename by date/location.", price: 1.99 },
  { name: "Buck Score Estimator", pkg: "com.crider.buckscore", desc: "B&C green score input.", price: 2.99 },
  { name: "Antler Shed Map", pkg: "com.crider.shedmap", desc: "Mark where you found sheds, year tag.", price: 1.99 },
  { name: "Fish Catch Log", pkg: "com.crider.fishlog", desc: "Species, length, weight, lure, water temp.", price: 1.99 },
  { name: "Tackle Box Inventory", pkg: "com.crider.tackleinv", desc: "Photo inventory of lures + counts.", price: 1.99 },
  { name: "Boat Trip Log", pkg: "com.crider.boatlog", desc: "Trip hours, fuel, ramps used.", price: 1.99 },
  { name: "Kayak Mileage", pkg: "com.crider.kayakmi", desc: "GPS paddle distance + map.", price: 1.99 },
  { name: "Camp Site Notes", pkg: "com.crider.camplog", desc: "Reviews of sites with photos for return trips.", price: 0.99 },
  { name: "Camp Food Calculator", pkg: "com.crider.campfood", desc: "Meal planner by person + days.", price: 0.99 },
  { name: "Backpack Weight Calc", pkg: "com.crider.packweight", desc: "Item weights → total + base weight.", price: 0.99 },
  { name: "Hike GPS Track", pkg: "com.crider.hikegps", desc: "Record + export GPX of hikes.", price: 2.99 },
  { name: "Survival Knot Reference", pkg: "com.crider.knotref", desc: "Offline animated knot tutorials.", price: 1.99 },
  { name: "Ham Radio Logger", pkg: "com.crider.hamlog", desc: "Quick QSO log with band, mode, signal.", price: 2.99 },
  { name: "CB Radio Channel Notes", pkg: "com.crider.cbnotes", desc: "Note who runs which channel locally.", price: 0.99 },
  { name: "Police Scanner Notes", pkg: "com.crider.scannote", desc: "Note codes used on local channels (no broadcasting).", price: 0.99 },
  { name: "Range Day Log", pkg: "com.crider.rangelog", desc: "Per-firearm rounds fired, group size, load.", price: 1.99 },
  { name: "Reloading Powder Log", pkg: "com.crider.reloadlog", desc: "Per-cartridge powder/primer/bullet/COL.", price: 2.99 },
  { name: "Ammo Inventory", pkg: "com.crider.ammoinv", desc: "Track ammo by caliber + storage location.", price: 1.99 },
  { name: "Firearm Maintenance Log", pkg: "com.crider.fmaint", desc: "Cleaning + part replacement log per gun.", price: 1.99 },
  { name: "Holster Draw Timer", pkg: "com.crider.drawtime", desc: "Phone-as-shot-timer for dry fire practice.", price: 2.99 },
  { name: "Archery Score Card", pkg: "com.crider.archcard", desc: "3D + target round score keeping.", price: 1.99 },
  { name: "Bow Tuning Log", pkg: "com.crider.bowtune", desc: "Track tiller, draw weight, arrow flight.", price: 1.99 },
  { name: "Compound Bow Speed Calc", pkg: "com.crider.bowspeed", desc: "IBO speed adjusted for setup.", price: 0.99 },
  { name: "Knife Inventory", pkg: "com.crider.knifeinv", desc: "Photo + steel + sharpening log per knife.", price: 1.99 },
  { name: "EDC Loadout", pkg: "com.crider.edcload", desc: "Plan everyday carry by occasion.", price: 0.99 },
  { name: "Boot Break-In Log", pkg: "com.crider.bootbreak", desc: "Days worn, blisters, comfort rating.", price: 0.99 },
  { name: "Workout Reps Counter", pkg: "com.crider.repcount", desc: "Voice rep counter for sets.", price: 0.99 },
  { name: "Farm Chore Checklist", pkg: "com.crider.chorechk", desc: "Daily chore list with kids accountability.", price: 1.99 },
  { name: "Kid Allowance Tracker", pkg: "com.crider.allow", desc: "Per-kid earned/spent.", price: 0.99 },
  { name: "Pocket Money Saver", pkg: "com.crider.savepock", desc: "Round-up savings tracker, local only.", price: 0.99 },
  { name: "Cash Envelope Budget", pkg: "com.crider.envelope", desc: "Digital envelope method.", price: 1.99 },
  { name: "Tip Jar Log", pkg: "com.crider.tiplog", desc: "Per-shift tip log + tax estimate.", price: 0.99 },
  { name: "Mileage Log Pro", pkg: "com.crider.milelog", desc: "IRS-style mileage with auto-detect drive.", price: 2.99 },
  { name: "Receipt Scanner Local", pkg: "com.crider.recscan", desc: "OCR receipts to category, no cloud.", price: 2.99 },
  { name: "Tax Deduction Tracker", pkg: "com.crider.taxded", desc: "Categorize self-employed expenses.", price: 2.99 },
  { name: "Subscription Killer", pkg: "com.crider.subkill", desc: "Manual log of subs + cancel reminders.", price: 1.99 },
  { name: "Bill Due Reminder", pkg: "com.crider.billdue", desc: "Local-only bill due dates + chart.", price: 0.99 },
  { name: "Grocery List Smart", pkg: "com.crider.grocsmart", desc: "Aisle-sorted list per store.", price: 0.99 },
  { name: "Meal Plan Weekly", pkg: "com.crider.mealweek", desc: "Drag meals to days, auto grocery list.", price: 1.99 },
  { name: "Recipe Card Vault", pkg: "com.crider.recvault", desc: "Family recipe vault with photo + print.", price: 1.99 },
  { name: "Canning Jar Inventory", pkg: "com.crider.jarinv", desc: "Track Mason jars by year + contents.", price: 0.99 },
  { name: "Freezer Inventory", pkg: "com.crider.freezinv", desc: "What's in each freezer + first-in-first-out alert.", price: 1.99 },
  { name: "Pantry Inventory", pkg: "com.crider.pantryinv", desc: "Barcode scan to pantry, expiration alerts.", price: 1.99 },
  { name: "Garden Plan Grid", pkg: "com.crider.gardenplan", desc: "Square-foot garden grid planner.", price: 2.99 },
  { name: "Seed Starting Calendar", pkg: "com.crider.seedcal", desc: "Frost-date based starting schedule per crop.", price: 2.99 },
  { name: "Harvest Log Garden", pkg: "com.crider.harvlog", desc: "Daily garden harvest weight + value.", price: 1.99 },
  { name: "Compost Tracker", pkg: "com.crider.compostlog", desc: "Pile turns, temp readings, ready date.", price: 0.99 },
  { name: "Worm Bin Log", pkg: "com.crider.wormbin", desc: "Vermicompost feeding + harvest schedule.", price: 0.99 },
  { name: "Rainwater Cistern Log", pkg: "com.crider.cisternlog", desc: "Tank level, last refill, projected days left.", price: 0.99 },
  { name: "Well Water Test Log", pkg: "com.crider.welllog", desc: "Test results per year, retest reminders.", price: 1.99 },
  { name: "Septic Pump Reminder", pkg: "com.crider.septicrm", desc: "Last pump date + 3-yr reminder.", price: 0.99 },
  { name: "Propane Tank Tracker", pkg: "com.crider.propanetk", desc: "Tank level by % + reorder reminder.", price: 0.99 },
  { name: "Heating Oil Log", pkg: "com.crider.oillog", desc: "Tank refills, gal/day burn rate.", price: 0.99 },
  { name: "Firewood Stack Counter", pkg: "com.crider.fwstack", desc: "Photo stacks, estimate cords on hand.", price: 0.99 },
  { name: "Chainsaw Run-Time Log", pkg: "com.crider.cstime", desc: "Hours per saw, mix oil reminder.", price: 0.99 },
  { name: "Two-Stroke Mix Calc", pkg: "com.crider.2tmix", desc: "32:1/40:1/50:1 oz of oil per gal.", price: 0.99 },
  { name: "Diesel Fuel Filter Log", pkg: "com.crider.dieselfilt", desc: "Per-tractor filter change schedule.", price: 0.99 },
  { name: "DEF Fluid Tracker", pkg: "com.crider.deflog", desc: "Gallons of DEF per tractor.", price: 0.99 },
  { name: "Lubrication Schedule", pkg: "com.crider.lubesched", desc: "Grease zerks per equipment, weekly checklist.", price: 0.99 },
  { name: "Bolt Length Picker", pkg: "com.crider.boltpick", desc: "SAE/metric bolt length lookup by job.", price: 0.99 },
  { name: "Thread Pitch ID", pkg: "com.crider.threadid", desc: "Identify thread pitch from photo or gauge.", price: 1.99 },
  { name: "Hardware Bin Locator", pkg: "com.crider.hwbin", desc: "Tag where every bolt size lives in shop.", price: 0.99 },
  { name: "Shop Inventory Lite", pkg: "com.crider.shopinv", desc: "Barcode scan parts + min-on-hand alerts.", price: 2.99 },
  { name: "Welding Coupon Log", pkg: "com.crider.weldcoupon", desc: "Track test coupons by process + position.", price: 1.99 },
  { name: "Pipe Schedule Lookup", pkg: "com.crider.pipesched", desc: "Sch 40/80 pipe ID/OD/weight per size.", price: 0.99 },
  { name: "Steel Beam Weight Calc", pkg: "com.crider.beamcalc", desc: "W-shape weight per foot, total per piece.", price: 0.99 },
  { name: "Rebar Bend Diagram", pkg: "com.crider.rebarbend", desc: "ACI bend hooks, weight per bar size.", price: 0.99 },
  { name: "Concrete Mix Designer", pkg: "com.crider.conmix", desc: "Strength target → cement/sand/agg by ratio.", price: 1.99 },
  { name: "Mortar Calc Block", pkg: "com.crider.mortcalc", desc: "CMU block + mortar bag count.", price: 0.99 },
  { name: "Drywall Sheet Calc", pkg: "com.crider.dwcalc", desc: "Wall area to sheets + mud bucket count.", price: 0.99 },
  { name: "Paint Coverage Calc", pkg: "com.crider.paintcalc", desc: "Sq ft to gallons by coat.", price: 0.99 },
  { name: "Roofing Square Calc", pkg: "com.crider.roofsq", desc: "Pitch + footprint to squares + bundles.", price: 0.99 },
  { name: "Gutter Length Calc", pkg: "com.crider.guttercalc", desc: "Linear ft + downspout count.", price: 0.99 },
  { name: "Insulation R-Value", pkg: "com.crider.insulcalc", desc: "Climate zone → R recommendation by surface.", price: 0.99 },
  { name: "HVAC Tonnage Calc", pkg: "com.crider.hvactonna", desc: "Sq ft to tons of cooling.", price: 1.99 },
  { name: "Duct Sizing Helper", pkg: "com.crider.ductsize", desc: "CFM to duct dimensions.", price: 1.99 },
  { name: "Electric Load Calc", pkg: "com.crider.elecload", desc: "Whole-house panel load calculator.", price: 1.99 },
  { name: "Wire Conduit Fill", pkg: "com.crider.conduitfill", desc: "NEC fill calc by THHN size.", price: 1.99 },
  { name: "Voltage Drop Calc", pkg: "com.crider.vdropcalc", desc: "Run length + amps → voltage drop.", price: 0.99 },
  { name: "Ohm's Law Toolkit", pkg: "com.crider.ohmkit", desc: "V/I/R/P calc cheatsheet.", price: 0.99 },
  { name: "Resistor Color Code", pkg: "com.crider.rescolor", desc: "4/5 band color decoder.", price: 0.99 },
  { name: "Battery Capacity Calc", pkg: "com.crider.battcap", desc: "Ah needed for runtime.", price: 0.99 },
  { name: "Solar Charge Controller", pkg: "com.crider.solarchg", desc: "MPPT vs PWM sizing.", price: 1.99 },
  { name: "Off-Grid Cabin Planner", pkg: "com.crider.cabinplan", desc: "Solar + battery + propane sizing for cabin.", price: 2.99 },
  { name: "Wood Stove BTU Calc", pkg: "com.crider.stovebtu", desc: "Sq ft to BTU/hr for heating.", price: 0.99 },
  { name: "Cord-to-BTU Estimator", pkg: "com.crider.cordbtu", desc: "Wood species to BTU per cord.", price: 0.99 },
  { name: "Generator Sizing", pkg: "com.crider.gensize", desc: "Appliances to watts + surge.", price: 1.99 },
  { name: "UPS Runtime Calc", pkg: "com.crider.upsrun", desc: "Server load to UPS minutes.", price: 0.99 },
  { name: "Network Subnet Calc", pkg: "com.crider.subnetcalc", desc: "CIDR + subnet planner.", price: 1.99 },
  { name: "WiFi Channel Picker", pkg: "com.crider.wifich", desc: "Scan nearby APs, pick clearest channel.", price: 1.99 },
  { name: "IP Address Logger", pkg: "com.crider.iplog", desc: "Document devices on home LAN.", price: 0.99 },
  { name: "MAC Vendor Lookup", pkg: "com.crider.maclookup", desc: "OUI to vendor offline DB.", price: 0.99 },
  { name: "Cable Length Tester", pkg: "com.crider.cablen", desc: "Estimate Cat5/6 length needed by run.", price: 0.99 },
  { name: "RJ45 Wire Order", pkg: "com.crider.rj45wire", desc: "568A/B reference card.", price: 0.99 },
  { name: "Server Rack Planner", pkg: "com.crider.rackplan", desc: "Plan U-space, weight, power per rack.", price: 2.99 },
  { name: "Docker Container Notes", pkg: "com.crider.dockernote", desc: "Document running containers + env vars.", price: 1.99 },
  { name: "Cron Schedule Builder", pkg: "com.crider.cronbuild", desc: "Visual cron expression builder.", price: 0.99 },
  { name: "Regex Tester Offline", pkg: "com.crider.regextest", desc: "Test regex against sample text, no cloud.", price: 1.99 },
  { name: "JSON Formatter Local", pkg: "com.crider.jsonfmt", desc: "Format/validate JSON offline.", price: 0.99 },
  { name: "YAML Linter", pkg: "com.crider.yamllint", desc: "Validate YAML offline.", price: 0.99 },
  { name: "Markdown Previewer", pkg: "com.crider.mdprev", desc: "Live preview Markdown notes.", price: 0.99 },
  { name: "UUID Generator", pkg: "com.crider.uuidgen", desc: "Bulk UUID v4 generator.", price: 0.99 },
  { name: "Hash Calculator", pkg: "com.crider.hashcalc", desc: "MD5/SHA1/256 of file or text.", price: 0.99 },
  { name: "Base64 Encoder", pkg: "com.crider.b64enc", desc: "Encode/decode text or file.", price: 0.99 },
  { name: "QR Code Maker", pkg: "com.crider.qrmake", desc: "Generate QR from text/URL/wifi.", price: 0.99 },
  { name: "Barcode Maker", pkg: "com.crider.barmake", desc: "Code128/UPC barcode generator.", price: 1.99 },
  { name: "Color Picker Pro", pkg: "com.crider.colorpick", desc: "Pick color from camera, hex/rgb/hsl.", price: 0.99 },
  { name: "Font Size Picker", pkg: "com.crider.fontsize", desc: "Print font size guide for shop labels.", price: 0.99 },
  { name: "Label Printer Helper", pkg: "com.crider.labelprt", desc: "Bluetooth label printer text formatter.", price: 2.99 },
  { name: "DYMO Address Book", pkg: "com.crider.dymoab", desc: "Local address book → DYMO labels.", price: 1.99 },
  { name: "Inventory Label Maker", pkg: "com.crider.invlabel", desc: "Bulk QR labels for shop inventory.", price: 2.99 },
  { name: "Asset Tag Tracker", pkg: "com.crider.assettag", desc: "Per-tag asset history + location.", price: 2.99 },
  { name: "Tool Crib Sign-Out", pkg: "com.crider.toolcrib", desc: "Sign out tools to crew, return alerts.", price: 2.99 },
  { name: "Equipment Reservation", pkg: "com.crider.eqresv", desc: "Book shared shop equipment by hour.", price: 1.99 },
  { name: "Shop Safety Audit", pkg: "com.crider.shopsafe", desc: "Monthly safety walkaround checklist + photo.", price: 2.99 },
  { name: "Lockout Tagout Log", pkg: "com.crider.lototlog", desc: "LOTO procedure log per machine.", price: 2.99 },
  { name: "MSDS Sheet Vault", pkg: "com.crider.msdsvault", desc: "Local PDF MSDS library, search by chemical.", price: 1.99 },
  { name: "PPE Issue Log", pkg: "com.crider.ppelog", desc: "Track PPE issued to each employee.", price: 1.99 },
  { name: "Injury Log OSHA", pkg: "com.crider.injlog", desc: "OSHA 300 log offline.", price: 2.99 },
  { name: "Crew Time Clock", pkg: "com.crider.crewclock", desc: "GPS clock-in for crews, weekly export.", price: 3.99 },
  { name: "Per-Diem Tracker", pkg: "com.crider.perdiem", desc: "Crew per-diem by state + city rate.", price: 1.99 },
  { name: "Cross-Country Truck Stop", pkg: "com.crider.truckstop", desc: "Trucker-rated stop notes (showers, parking).", price: 1.99 },
  { name: "Bridge Height Lookup", pkg: "com.crider.bridgeht", desc: "Manual bridge clearance database for routes.", price: 0.99 },
  { name: "Weigh Station Watch", pkg: "com.crider.weighwatch", desc: "Open/closed status notes per state.", price: 0.99 },
  { name: "Permit Load Planner", pkg: "com.crider.permitload", desc: "Oversize load route height/width checker.", price: 2.99 },
  { name: "Trailer Tire Pressure", pkg: "com.crider.trailerpsi", desc: "PSI by load, temp adjustment.", price: 0.99 },
  { name: "Trailer Bearing Log", pkg: "com.crider.beadrlog", desc: "Pack/inspection per axle.", price: 0.99 },
  { name: "DOT Inspection Checklist", pkg: "com.crider.dotinsp", desc: "Annual inspection checklist printable.", price: 1.99 },
  { name: "Pre-Trip CDL Trainer", pkg: "com.crider.cdltrain", desc: "CDL pre-trip script trainer with audio.", price: 2.99 },
  { name: "CDL Air Brake Quiz", pkg: "com.crider.cdlair", desc: "Air brake test flashcards.", price: 0.99 },
  { name: "DMV Practice Test", pkg: "com.crider.dmvtest", desc: "Multi-state DMV practice questions.", price: 2.99 },
  { name: "License Plate Lookup", pkg: "com.crider.platelook", desc: "Note plates spotted, personal log only.", price: 0.99 },
  { name: "VIN Decoder", pkg: "com.crider.vindec", desc: "Decode VIN to year/make/model/engine.", price: 1.99 },
  { name: "Vehicle Title Vault", pkg: "com.crider.titlevault", desc: "Photo of titles + registrations.", price: 0.99 },
  { name: "Auto Repair Estimator", pkg: "com.crider.autoest", desc: "Labor-hour lookup + parts markup quote.", price: 3.99 },
  { name: "Oil Change Sticker", pkg: "com.crider.oilstick", desc: "Print next-due sticker via Bluetooth label.", price: 0.99 },
  { name: "Tire Rotation Reminder", pkg: "com.crider.tirerot", desc: "Per-vehicle rotation reminder.", price: 0.99 },
  { name: "Brake Pad Wear Log", pkg: "com.crider.brakelog", desc: "Pad thickness measurement log.", price: 0.99 },
  { name: "Coolant Test Log", pkg: "com.crider.coollog", desc: "Antifreeze test + flush schedule.", price: 0.99 },
  { name: "Transmission Fluid Tracker", pkg: "com.crider.transfl", desc: "Per-vehicle TF service intervals.", price: 0.99 },
  { name: "Battery CCA Tracker", pkg: "com.crider.ccatrack", desc: "Cold cranking amps test log.", price: 0.99 },
  { name: "Spark Plug Gap Chart", pkg: "com.crider.sparkgap", desc: "Per-engine gap reference.", price: 0.99 },
  { name: "Carburetor Jet Picker", pkg: "com.crider.carbjet", desc: "Altitude/temp jet recommendation.", price: 1.99 },
  { name: "Outboard Motor Log", pkg: "com.crider.outboardlog", desc: "Per-motor hours, fuel mix, service.", price: 1.99 },
  { name: "ATV/UTV Service Log", pkg: "com.crider.atvlog", desc: "Per-machine service interval reminders.", price: 1.99 },
  { name: "Snowmobile Log", pkg: "com.crider.sledlog", desc: "Track rides, mileage, service per sled.", price: 1.99 },
  { name: "RV Trip Planner", pkg: "com.crider.rvtrip", desc: "Campground notes, fuel, dump stations.", price: 2.99 },
  { name: "RV Black Tank Tracker", pkg: "com.crider.blktank", desc: "Fill level, last dump.", price: 0.99 },
  { name: "RV Battery Bank Monitor", pkg: "com.crider.rvbatt", desc: "Manual voltage log per check.", price: 0.99 },
  { name: "Tiny House BOM", pkg: "com.crider.tinybom", desc: "Bill of materials builder for tiny build.", price: 4.99 },
  { name: "Pole Barn Estimator", pkg: "com.crider.polebarn", desc: "30x40 pole barn material list quick-est.", price: 3.99 },
  { name: "Deck Builder Calc", pkg: "com.crider.deckcalc", desc: "Joist span, board count, screw count, footing count.", price: 2.99 },
  { name: "Stair Stringer Calc", pkg: "com.crider.stairstr", desc: "Rise/run + stringer length + cut layout.", price: 1.99 },
  { name: "Roof Pitch Finder", pkg: "com.crider.roofpitch", desc: "Phone-as-level pitch finder.", price: 0.99 },
  { name: "Bubble Level Pro", pkg: "com.crider.bubblepro", desc: "Multi-axis digital level.", price: 0.99 },
  { name: "Stud Finder Companion", pkg: "com.crider.studfinder", desc: "Note stud locations via tap test logging.", price: 0.99 },
  { name: "Hammer Drill Bit Picker", pkg: "com.crider.hdrillbit", desc: "Anchor → drill bit lookup.", price: 0.99 },
  { name: "Anchor Load Chart", pkg: "com.crider.anchchart", desc: "Concrete anchor pull-out by size.", price: 1.99 },
  { name: "Crane Lift Planner Lite", pkg: "com.crider.liftplan", desc: "Basic crane load chart + radius check.", price: 4.99 },
  { name: "Rigging Sling Calc", pkg: "com.crider.slingcalc", desc: "Sling angle to capacity reduction.", price: 2.99 },
  { name: "Wire Rope Sling Log", pkg: "com.crider.wireslog", desc: "Inspection log per sling, retire alerts.", price: 1.99 },
  { name: "Chain Hoist Inspection", pkg: "com.crider.chainhoist", desc: "Monthly inspection checklist per hoist.", price: 1.99 },
  { name: "Forklift Daily Check", pkg: "com.crider.fldaily", desc: "Pre-shift forklift checklist with sig.", price: 1.99 },
  { name: "Aerial Lift Pre-Use", pkg: "com.crider.aerial", desc: "JLG/scissor pre-use inspection.", price: 1.99 },
  { name: "Concrete Slump Log", pkg: "com.crider.slumplog", desc: "Pour log: slump, air, temp, ticket #.", price: 1.99 },
  { name: "Asphalt Mat Temp Log", pkg: "com.crider.matlog", desc: "Mat temps per truck, density estimates.", price: 2.99 },
  { name: "Pavement Stripe Calc", pkg: "com.crider.stripecalc", desc: "Linear ft of stripe → gallons of paint.", price: 0.99 },
  { name: "Snow Plow Route Planner", pkg: "com.crider.plowroute", desc: "Customer route + cycle time + invoice.", price: 3.99 },
  { name: "Mowing Route Manager", pkg: "com.crider.mowroute", desc: "Yard cards: gate code, dog, edge, blow direction.", price: 3.99 },
  { name: "Landscape Bid Builder", pkg: "com.crider.lndbid", desc: "Material + labor + markup bid PDF.", price: 4.99 },
  { name: "Tree Pruning Schedule", pkg: "com.crider.treeprune", desc: "Per-species best month + customer schedule.", price: 1.99 },
  { name: "Stump Grinder Job Log", pkg: "com.crider.stumplog", desc: "Per-stump diameter + time + price.", price: 1.99 },
  { name: "Mulch Yardage Calc", pkg: "com.crider.mulchcalc", desc: "Sq ft + depth → yards + bag count.", price: 0.99 },
  { name: "Topsoil Tonnage Calc", pkg: "com.crider.topsoil", desc: "Yards to tons + truck loads.", price: 0.99 },
  { name: "Gravel Driveway Calc", pkg: "com.crider.gravcalc", desc: "Length/width/depth → tons by stone size.", price: 0.99 },
  { name: "French Drain Planner", pkg: "com.crider.frenchdrain", desc: "Pipe length + gravel + sock fabric quantities.", price: 1.99 },
  { name: "Pond Liner Calculator", pkg: "com.crider.pondcalc", desc: "EPDM liner size from pond dims.", price: 0.99 },
  { name: "Aquaponics Cycle Calc", pkg: "com.crider.aquaponic", desc: "Fish lbs to grow bed sq ft.", price: 2.99 },
  { name: "Chicken Coop Designer", pkg: "com.crider.coopdes", desc: "Sq ft per bird + ventilation + nest box count.", price: 2.99 },
  { name: "Rabbit Hutch Planner", pkg: "com.crider.hutchplan", desc: "Hutch dims by breed + count.", price: 1.99 },
  { name: "Quail Layer Tracker", pkg: "com.crider.quaillog", desc: "Per-pen quail production + cost/egg.", price: 1.99 },
  { name: "Pheasant Brooder Log", pkg: "com.crider.pheaslog", desc: "Brooder temp schedule + mortality.", price: 1.99 },
  { name: "Turkey Grow-Out", pkg: "com.crider.turklog", desc: "Heritage turkey grow-out tracker.", price: 1.99 },
  { name: "Duck Egg Tracker", pkg: "com.crider.duckegg", desc: "Per-breed daily egg count.", price: 0.99 },
  { name: "Goose Down Yield", pkg: "com.crider.goosedown", desc: "Per-bird down weight log.", price: 0.99 },
  { name: "Wool Clip Log", pkg: "com.crider.woolclip", desc: "Per-fleece weight, grade, buyer.", price: 1.99 },
  { name: "Alpaca Fiber Log", pkg: "com.crider.alpacalog", desc: "Per-animal fleece weight + grade.", price: 1.99 },
  { name: "Dairy Goat Show Prep", pkg: "com.crider.dgshow", desc: "Show prep schedule for ADGA shows.", price: 1.99 },
  { name: "Cattle Show Hair Clip", pkg: "com.crider.clipplan", desc: "Pre-show clip plan by class.", price: 0.99 },
  { name: "Steer Show Walk Schedule", pkg: "com.crider.walkstr", desc: "Daily exercise routine for show steers.", price: 0.99 },
  { name: "Hog Show Daily Care", pkg: "com.crider.hogshow", desc: "Show pig daily checklist.", price: 0.99 },
  { name: "Lamb Daily Care", pkg: "com.crider.lambshow", desc: "Show lamb daily checklist.", price: 0.99 },
  { name: "Heifer Daily Care", pkg: "com.crider.heifshow", desc: "Show heifer daily checklist.", price: 0.99 },
  { name: "Junior Livestock Resume", pkg: "com.crider.jrlivres", desc: "Build a youth livestock resume PDF.", price: 1.99 },
  { name: "State Fair Entry Helper", pkg: "com.crider.statefair", desc: "Track entry deadlines + fees per state.", price: 2.99 },
  { name: "Premium Auction Tracker", pkg: "com.crider.premauct", desc: "Track buyer premiums, follow-up letters.", price: 2.99 },
  { name: "Thank-You Letter Builder", pkg: "com.crider.thanknote", desc: "Auto-build sale buyer thank-you letters.", price: 2.99 },
  { name: "FFA Scholarship Tracker", pkg: "com.crider.ffaschol", desc: "Deadlines + essay vault for scholarships.", price: 2.99 },
  { name: "College Ag Search", pkg: "com.crider.collegeag", desc: "Compare ag programs at land-grant schools.", price: 1.99 },
  { name: "FFA Banquet Awards", pkg: "com.crider.banawards", desc: "Auto-generate banquet award certificates.", price: 2.99 },
  { name: "Chapter Officer Handbook", pkg: "com.crider.chofficer", desc: "Offline duties handbook + meeting templates.", price: 1.99 },
  { name: "Star Application Builder", pkg: "com.crider.starapp", desc: "Help build State/American Star app drafts.", price: 3.99 },
  { name: "Proficiency App Helper", pkg: "com.crider.profapp", desc: "Proficiency award draft assistant.", price: 3.99 },
  { name: "Ag Sales CDE Trainer", pkg: "com.crider.agsales", desc: "Practice scripts + score sheets.", price: 2.99 },
  { name: "Livestock Judging Trainer", pkg: "com.crider.lvjudge", desc: "Class evaluation + reasons trainer.", price: 3.99 },
  { name: "Meats Judging Trainer", pkg: "com.crider.meatsjudge", desc: "Retail cut ID + grading practice.", price: 3.99 },
  { name: "Dairy Cattle Judging", pkg: "com.crider.dcjudge", desc: "Linear classification trainer.", price: 3.99 },
  { name: "Horse Judging Trainer", pkg: "com.crider.horsejudge", desc: "Halter + performance evaluation.", price: 3.99 },
  { name: "Poultry Judging Trainer", pkg: "com.crider.pjudge", desc: "Carcass + egg quality grading.", price: 3.99 },
  { name: "Floriculture CDE", pkg: "com.crider.floricde", desc: "Plant ID + arrangement design.", price: 3.99 },
  { name: "Nursery/Landscape CDE", pkg: "com.crider.nurscde", desc: "Plant ID + landscape sketch.", price: 3.99 },
  { name: "Forestry CDE", pkg: "com.crider.forestrycde", desc: "Tree ID + compass + cruise.", price: 3.99 },
  { name: "Wildlife CDE", pkg: "com.crider.wildcde", desc: "Wildlife ID + management trainer.", price: 3.99 },
  { name: "Soil Judging CDE", pkg: "com.crider.soilcde", desc: "Soil pit description trainer.", price: 3.99 },
  { name: "Ag Mechanics CDE", pkg: "com.crider.agmechcde", desc: "Wiring, welding, plumbing test bank.", price: 3.99 },
  { name: "Farm Business Mgmt CDE", pkg: "com.crider.fbmcde", desc: "Records + analysis case studies.", price: 3.99 },
  { name: "Vet Science CDE", pkg: "com.crider.vetcde", desc: "Vet tools ID + breed ID practice.", price: 3.99 },
  { name: "Food Science CDE", pkg: "com.crider.fdscicde", desc: "Food safety + sensory practice.", price: 3.99 },
  { name: "Ag Comms CDE", pkg: "com.crider.agcomcde", desc: "Editing + AP style trainer.", price: 3.99 },
  { name: "Creed Speaking Trainer", pkg: "com.crider.creedtrain", desc: "FFA Creed memorization w/ audio prompt.", price: 1.99 },
  { name: "Prepared Public Speaking", pkg: "com.crider.ppstrain", desc: "Speech timer + judge rubric simulator.", price: 2.99 },
  { name: "Extemp Speaking Trainer", pkg: "com.crider.extemptrain", desc: "Random topic + 30-min prep timer.", price: 2.99 },
  { name: "Conduct of Chapter Mtgs", pkg: "com.crider.ccmcde", desc: "Parli pro abilities practice trainer.", price: 3.99 },
  { name: "Quiz Bowl FFA", pkg: "com.crider.ffaquiz", desc: "FFA history quiz bowl flashcards.", price: 1.99 },
  { name: "Ag History Vault", pkg: "com.crider.aghistvault", desc: "Offline FFA + ag history reference.", price: 1.99 },
  { name: "Crop Variety Notebook", pkg: "com.crider.cropvar", desc: "Per-field hybrid/variety + yield log.", price: 1.99 },
  { name: "Spray Tank Calc", pkg: "com.crider.spraytank", desc: "Tank mix calc by GPA + acres.", price: 1.99 },
  { name: "Sprayer Calibration", pkg: "com.crider.spraycal", desc: "Boom width + speed → GPA calibration.", price: 1.99 },
  { name: "Seeding Rate Calc", pkg: "com.crider.seedrate", desc: "Lbs/acre + seed weight → seeds/acre.", price: 0.99 },
  { name: "Row Crop Population", pkg: "com.crider.rowpop", desc: "Plants per acre by row spacing + drop rate.", price: 0.99 },
  { name: "Combine Yield Monitor Log", pkg: "com.crider.combineyld", desc: "Manual entry yield log per field.", price: 1.99 },
  { name: "Grain Bin Inventory", pkg: "com.crider.grainbin", desc: "Bushels in bin by depth + diameter.", price: 0.99 },
  { name: "Grain Drying Calc", pkg: "com.crider.graindry", desc: "Moisture removal shrink + drying time.", price: 1.99 },
  { name: "Grain Marketing Notebook", pkg: "com.crider.grnmkt", desc: "Track contracts, basis, target sells.", price: 2.99 },
  { name: "Cattle Market Watch", pkg: "com.crider.cattlemkt", desc: "Manual entry of CME prices + chart.", price: 1.99 },
  { name: "Grain Hedge Calculator", pkg: "com.crider.grainhedge", desc: "Futures hedge ratio calc.", price: 2.99 },
  { name: "Cow-Calf Ratio Calc", pkg: "com.crider.cowcalfrat", desc: "Pasture stocking calc with class units.", price: 0.99 },
  { name: "AUM Calculator", pkg: "com.crider.aumcalc", desc: "Animal unit month estimator.", price: 0.99 },
  { name: "Body Condition Score", pkg: "com.crider.bcsapp", desc: "BCS reference + per-cow log.", price: 0.99 },
  { name: "Hoof Trim Schedule Cattle", pkg: "com.crider.hoofcatt", desc: "Per-cow trim schedule for dairy.", price: 0.99 },
  { name: "Calving Ease EPD Lookup", pkg: "com.crider.ceepd", desc: "Bull EPD reference database (manual).", price: 1.99 },
  { name: "Bull Catalog Reader", pkg: "com.crider.bullcat", desc: "Save bull catalogs as PDFs + favorites.", price: 1.99 },
  { name: "Semen Tank Inventory", pkg: "com.crider.semantank", desc: "Per-cane semen inventory + LN2 log.", price: 2.99 },
  { name: "LN2 Tank Refill Log", pkg: "com.crider.ln2log", desc: "Liquid nitrogen refill schedule + level.", price: 0.99 },
  { name: "Embryo Inventory", pkg: "com.crider.embinv", desc: "Frozen embryo inventory + thaw log.", price: 1.99 },
  { name: "Synch Protocol Helper", pkg: "com.crider.synchhelp", desc: "Estrus synch protocol scheduler.", price: 2.99 },
  { name: "AI Heat Detection Log", pkg: "com.crider.heatlog", desc: "Manual heat detection + insemination timing.", price: 1.99 },
  { name: "Vet Drug Inventory", pkg: "com.crider.vetdrug", desc: "Track meds on hand + expiration.", price: 1.99 },
  { name: "Mortality Tracker", pkg: "com.crider.mortlog", desc: "Per-pen death loss tracker + reasons.", price: 1.99 },
  { name: "Necropsy Photo Log", pkg: "com.crider.necrolog", desc: "Field necropsy notes + photos for vet.", price: 0.99 },
  { name: "Brand Inspection Log", pkg: "com.crider.brandinsp", desc: "State brand inspection paperwork tracker.", price: 1.99 },
  { name: "Bill of Sale Generator", pkg: "com.crider.bosgen", desc: "Generate cattle bill of sale PDFs.", price: 2.99 },
  { name: "Lease Hay Ground Tracker", pkg: "com.crider.leasehay", desc: "Per-field rent + cuttings + ton yield.", price: 1.99 },
  { name: "Crop Share Calculator", pkg: "com.crider.cropshare", desc: "Crop share lease split calc.", price: 1.99 },
  { name: "Custom Rates Lookup", pkg: "com.crider.custrates", desc: "Iowa State custom rates reference book.", price: 0.99 },
  { name: "Equipment Depreciation", pkg: "com.crider.equipdep", desc: "MACRS depreciation schedule builder.", price: 2.99 },
  { name: "Section 179 Tracker", pkg: "com.crider.sec179", desc: "Track Section 179 deductions by year.", price: 2.99 },
  { name: "Schedule F Helper", pkg: "com.crider.schedf", desc: "Personal Schedule F categorizer.", price: 3.99 },
  { name: "1099 Generator Local", pkg: "com.crider.gen1099", desc: "Track payments to contractors > $600.", price: 2.99 },
  { name: "Crop Insurance Notebook", pkg: "com.crider.cropins", desc: "Per-field APH + policy notes.", price: 1.99 },
  { name: "FSA Acreage Helper", pkg: "com.crider.fsahelp", desc: "Track FSA reported acres + bases per farm.", price: 1.99 },
  { name: "CRP Contract Tracker", pkg: "com.crider.crpcontract", desc: "CRP contract dates + payment schedule.", price: 0.99 },
  { name: "NRCS Practice Tracker", pkg: "com.crider.nrcstrack", desc: "EQIP practice progress + payment schedule.", price: 1.99 },

];

function builderIntro(tool: string): string {
  switch (tool) {
    case "rork":
      return "You are an expert React Native + Expo engineer in Rork. Scaffold a production-ready cross-platform mobile app (iOS + Android) ready for TestFlight and Play Internal Testing.";
    case "flutterflow":
      return "You are an expert Flutter engineer working inside FlutterFlow. Scaffold a production-ready Flutter app targeting iOS, Android, and web from one codebase.";
    case "bolt":
      return "You are an expert Expo React Native engineer in Bolt.new. Scaffold a production-ready mobile app ready to publish via EAS Build.";
    case "lovable":
      return "You are an expert React + Vite + Tailwind engineer in Lovable. Scaffold a production-ready installable PWA, optionally wrappable with Capacitor for native stores.";
    case "a0dev":
      return "You are an expert Expo engineer in a0.dev. Scaffold a production-ready mobile app with live QR preview support.";
    case "replit":
      return "You are an expert full-stack engineer using Replit Agent. Scaffold a production-ready app with hosting auto-configured.";
    case "android-studio":
    default:
      return "You are an expert Android engineer working inside Android Studio (Gemini in-IDE). Scaffold a complete, production-ready Android app in Kotlin with Jetpack Compose, Material 3, MVVM + Hilt, Room, DataStore, and Compose Navigation.";
  }
}

function buildPrompt(idea: DBIdea): string {
  const backendLine = idea.needs_backend
    ? "- Backend: Supabase (Postgres + Auth + RLS). Include schema, RLS policies, and a Supabase client wired up."
    : "- NO backend, NO accounts, NO network calls unless a specific feature requires it. Local storage only.";
  return `${builderIntro(idea.builder_tool)}

APP NAME: ${idea.name}
PACKAGE / BUNDLE ID: ${idea.pkg}
ONE-LINER: ${idea.description}
PRICE: $${Number(idea.price).toFixed(2)} one-time purchase
CATEGORY: ${idea.category}

REQUIREMENTS
- Dark + light theme, polished UI, accessible
${backendLine}
- One-time purchase paywall using the native store billing (Google Play Billing on Android, StoreKit on iOS). Product id: "${idea.pkg}.unlock_pro"
- Export primary records to CSV with share-sheet
- Settings screen: theme toggle, units, export, about
- Adaptive launcher icon placeholder
- Request only the permissions the feature needs, with runtime prompts
- README.md covering build, signing, and store release steps
- Compile clean out of the box

DELIVER
1. Full project tree
2. All source files
3. Build config
4. Screens for: main feature, history/list, detail, settings, paywall
5. Local persistence layer
6. Sample data seeded on first launch
7. README with one-time purchase setup

Begin scaffolding now. Use idiomatic 2026 best practices. No deprecated APIs.`;
}

type FormState = {
  name: string;
  pkg: string;
  description: string;
  price: string;
  builder_tool: string;
  needs_backend: boolean;
  category: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  pkg: "",
  description: "",
  price: "0.99",
  builder_tool: "android-studio",
  needs_backend: false,
  category: "general",
  status: "idea",
};

export default function AndroidAppIdeas() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"default" | "priceHigh" | "priceLow">("default");
  const [builderFilter, setBuilderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ideas, setIdeas] = useState<DBIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sb = supabase as any;

  const loadIdeas = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await sb
      .from("android_app_ideas")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(2000);
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data || []) as DBIdea[];
    // First-run seed from the hardcoded IDEAS catalog
    if (rows.length === 0 && IDEAS.length > 0) {
      setSeeding(true);
      const seedRows = IDEAS.map((i) => ({
        user_id: user.id,
        name: i.name,
        pkg: i.pkg,
        description: i.desc,
        price: i.price,
        builder_tool: "android-studio",
        needs_backend: false,
        category: "general",
        status: "idea",
      }));
      // Insert in chunks to stay under PostgREST limits
      const CHUNK = 100;
      for (let k = 0; k < seedRows.length; k += CHUNK) {
        const slice = seedRows.slice(k, k + CHUNK);
        const { error: insErr } = await sb.from("android_app_ideas").insert(slice);
        if (insErr) {
          toast({ title: "Seed failed", description: insErr.message, variant: "destructive" });
          break;
        }
      }
      setSeeding(false);
      const { data: after } = await sb
        .from("android_app_ideas")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(2000);
      setIdeas((after || []) as DBIdea[]);
    } else {
      setIdeas(rows);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let result = s
      ? ideas.filter(
          (i) =>
            i.name.toLowerCase().includes(s) ||
            i.pkg.toLowerCase().includes(s) ||
            i.description.toLowerCase().includes(s) ||
            Number(i.price).toFixed(2).includes(s)
        )
      : [...ideas];

    if (builderFilter !== "all") {
      result = result.filter((i) => i.builder_tool === builderFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (sort === "priceHigh") result.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === "priceLow") result.sort((a, b) => Number(a.price) - Number(b.price));

    return result;
  }, [q, sort, ideas, builderFilter, statusFilter]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: label });
    } catch {
      toast({ title: "Copy failed", description: "Long-press to copy manually", variant: "destructive" });
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (idea: DBIdea) => {
    setEditingId(idea.id);
    setForm({
      name: idea.name,
      pkg: idea.pkg,
      description: idea.description,
      price: String(idea.price),
      builder_tool: idea.builder_tool,
      needs_backend: idea.needs_backend,
      category: idea.category,
      status: idea.status,
    });
    setDialogOpen(true);
  };

  const saveForm = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.pkg.trim()) {
      toast({ title: "Missing fields", description: "Name and package are required", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Bad price", description: "Enter a number ≥ 0", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      pkg: form.pkg.trim(),
      description: form.description.trim(),
      price: priceNum,
      builder_tool: form.builder_tool,
      needs_backend: form.needs_backend,
      category: form.category.trim() || "general",
      status: form.status,
    };
    if (editingId) {
      const { error } = await sb.from("android_app_ideas").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Updated", description: form.name });
        setDialogOpen(false);
        await loadIdeas();
      }
    } else {
      const { error } = await sb.from("android_app_ideas").insert({ ...payload, user_id: user.id });
      if (error) {
        toast({ title: "Add failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Added", description: form.name });
        setDialogOpen(false);
        await loadIdeas();
      }
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await sb.from("android_app_ideas").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      setIdeas((prev) => prev.filter((i) => i.id !== deleteId));
    }
    setDeleteId(null);
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
                  {ideas.length} saved ideas. Tap Prompt to copy an AI prompt tailored to the chosen builder tool.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">
                  Owner Vault
                </Badge>
                <a href="/devhub/builder-resources">
                  <Button size="sm" variant="outline">Builder Tools</Button>
                </a>
                <a href="/devhub/ad-networks">
                  <Button size="sm" variant="outline">Ad Networks</Button>
                </a>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="w-4 h-4 mr-1" /> Add App
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search ${ideas.length} ideas…`}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                  <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="priceHigh">Price: High → Low</SelectItem>
                    <SelectItem value="priceLow">Price: Low → High</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={builderFilter} onValueChange={setBuilderFilter}>
                  <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All builders</SelectItem>
                    {BUILDER_TOOLS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {(loading || seeding) && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {seeding ? "Seeding 488 starter ideas into your account…" : "Loading…"}
            </div>
          )}
          {!loading && !seeding && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((idea) => {
                  const prompt = buildPrompt(idea);
                  const builderLabel = BUILDER_TOOLS.find((b) => b.value === idea.builder_tool)?.label || idea.builder_tool;
                  const statusLabel = STATUSES.find((s) => s.value === idea.status)?.label || idea.status;
                  return (
                    <Card key={idea.id} className="hover:border-primary/60 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{idea.name}</CardTitle>
                          <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                            ${Number(idea.price).toFixed(2)}
                          </Badge>
                        </div>
                        <CardDescription className="font-mono text-[10px] break-all">
                          {idea.pkg}
                        </CardDescription>
                        <div className="flex flex-wrap gap-1 pt-1">
                          <Badge variant="outline" className="text-[10px]">{builderLabel}</Badge>
                          <Badge variant="outline" className="text-[10px]">{statusLabel}</Badge>
                          {idea.needs_backend && (
                            <Badge variant="outline" className="text-[10px]">Backend</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground line-clamp-3">{idea.description}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" onClick={() => copy(idea.name, "App name")}>
                            <Copy className="w-3 h-3 mr-1" />Name
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => copy(idea.pkg, "Package id")}>
                            <Copy className="w-3 h-3 mr-1" />Pkg
                          </Button>
                          <Button size="sm" onClick={() => copy(prompt, "AI prompt")}>
                            <Copy className="w-3 h-3 mr-1" />Prompt
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copy(
                                `https://cridergpt.com/privacy/${idea.pkg}?name=${encodeURIComponent(idea.name)}`,
                                "Privacy Policy URL"
                              )
                            }
                          >
                            <Copy className="w-3 h-3 mr-1" />Privacy URL
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              window.open(
                                `/privacy/${idea.pkg}?name=${encodeURIComponent(idea.name)}`,
                                "_blank"
                              )
                            }
                          >
                            <ShieldCheck className="w-3 h-3 mr-1" />Preview Policy
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(idea)}>
                            <Pencil className="w-3 h-3 mr-1" />Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(idea.id)}>
                            <Trash2 className="w-3 h-3 mr-1" />Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-12">
                  {ideas.length === 0 ? "No ideas yet. Tap Add App to create your first one." : `No ideas match the current filters.`}
                </p>
              )}
            </>
          )}
        </div>

        {/* Add / Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit App Idea" : "Add App Idea"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="f-name">App name</Label>
                <Input id="f-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Cool App" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-pkg">Package / Bundle ID</Label>
                <Input id="f-pkg" value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })} placeholder="com.crider.coolapp" className="font-mono text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-desc">Description</Label>
                <Textarea id="f-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="One-liner about what it does." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="f-price">Price (USD)</Label>
                  <Input id="f-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-cat">Category</Label>
                  <Input id="f-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="general" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Builder tool</Label>
                <Select value={form.builder_tool} onValueChange={(v) => setForm({ ...form, builder_tool: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUILDER_TOOLS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label htmlFor="f-backend" className="text-sm">Needs backend?</Label>
                  <p className="text-xs text-muted-foreground">Turn on for GPS loggers, multi-device sync, etc.</p>
                </div>
                <Switch id="f-backend" checked={form.needs_backend} onCheckedChange={(v) => setForm({ ...form, needs_backend: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveForm} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this app idea?</AlertDialogTitle>
              <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DevHubGuard>
  );
}
