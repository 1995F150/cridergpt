import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DevHubGuard } from "@/components/devhub/DevHubGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Download, Megaphone } from "lucide-react";
import { toast } from "sonner";

const ADMOB_APP_ID = "ca-app-pub-1884621321896668~7174244598";

const AD_UNITS = {
  rewarded: "ca-app-pub-1884621321896668/8461902383",
  interstitial: "ca-app-pub-1884621321896668/6979140189",
  banner: "ca-app-pub-1884621321896668/5478019545",
} as const;

const TEST_IDS = {
  android: {
    rewarded: "ca-app-pub-3940256099942544/5224354917",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
    banner: "ca-app-pub-3940256099942544/6300978111",
  },
  ios: {
    rewarded: "ca-app-pub-3940256099942544/1712485313",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
    banner: "ca-app-pub-3940256099942544/2934735716",
  },
} as const;

const SUPABASE_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc";

function buildPrompt(opts: {
  appName: string;
  packageId: string;
  extraNotes: string;
}) {
  return `# 🎯 ADMOB ADD-ON PROMPT — ${opts.appName}
> Paste this into Cursor, Claude Code, Codex CLI, or any agentic AI IDE.
> This is a SCOPE-LIMITED add-on: wire AdMob into an EXISTING native app.
> Assumes Supabase auth, subscription tables, and UI screens already exist.

Package / Bundle ID: \`${opts.packageId}\`

---

## 1. NON-NEGOTIABLE HARD RULES
1. **AdMob is free-tier ONLY.** Plus / Pro / Lifetime users see ZERO ads. Gate every ad call behind a subscription check.
2. **Rewarded ads MUST be user-initiated.** Button tap only — never autoplay rewarded.
3. **Interstitial cooldown:** max 1 per 10 app cold opens. NEVER between rapid screen changes.
4. **Banner:** bottom-center, adaptive size, removed when the screen leaves.
5. **Use Google's TEST ad unit IDs during development.** NEVER click your own real ads — instant ban.
6. **Do NOT overlap the status bar (battery/clock) or gesture nav bar.** See §4 Safe-Area Rules.
7. **Paid users = no ad SDK initialization.** Skip MobileAds.initialize entirely if the user has an active paid plan.

---

## 2. IDENTIFIERS

**App ID:** \`${ADMOB_APP_ID}\`

**Production Unit IDs:**
- Rewarded (unlock +5 messages): \`${AD_UNITS.rewarded}\`
- Interstitial (session break): \`${AD_UNITS.interstitial}\`
- Banner (demo page): \`${AD_UNITS.banner}\`

**Test Unit IDs (development ONLY):**
Android:
- Rewarded: \`${TEST_IDS.android.rewarded}\`
- Interstitial: \`${TEST_IDS.android.interstitial}\`
- Banner: \`${TEST_IDS.android.banner}\`

iOS:
- Rewarded: \`${TEST_IDS.ios.rewarded}\`
- Interstitial: \`${TEST_IDS.ios.interstitial}\`
- Banner: \`${TEST_IDS.ios.banner}\`

---

## 3. SHARED BACKEND CONTRACT (already live)
**Supabase URL:** \`${SUPABASE_URL}\`
**Anon key:** \`${SUPABASE_ANON}\`

**Tables to query before ANY ad load:**
- \`user_subscriptions\` — check \`status = 'active'\` and \`plan\` field.
- \`plan_configurations\` — reference table mapping plan slugs to features.
- \`iap_purchases\` — mirror of StoreKit / Play Billing receipts.

**Gating logic (run synchronously before initialization):**
\`\`\`kotlin
// Pseudo-code — adapt to your platform
suspend fun shouldShowAds(userId: String): Boolean {
  val sub = supabase.from("user_subscriptions")
    .select { filter { eq("user_id", userId); eq("status", "active") } }
    .decodeSingleOrNull<UserSubscription>()
  val paid = setOf("plus", "pro", "lifetime")
  return sub?.plan?.let { it !in paid } ?: true  // no sub = free = show ads
}
\`\`\`

---

## 4. SAFE-AREA RULES (mandatory — do NOT overlap system UI)
- **Android (Compose):** Wrap ad surfaces in \`Scaffold\`. Banner sits inside \`bottomBar\` or uses \`Modifier.windowInsetsPadding(WindowInsets.systemBars)\`. Interstitial is full-screen — system handles insets. Rewarded is full-screen — same.
- **iOS (SwiftUI):** Place banner inside \`.safeAreaInset(edge: .bottom)\`. Interstitial / rewarded are presented modally — UIKit handles safe area automatically.
- **Status bar icons:** stay dark-on-light or light-on-dark so battery/clock remain readable. Test on devices with notches, Dynamic Island, and gesture bars.

---

## 5. ANDROID IMPLEMENTATION (Kotlin + Jetpack Compose)

### 5.1 Gradle dependencies
Add to \`app/build.gradle\` (or \`build.gradle.kts\`):
\`\`\`kotlin
dependencies {
    implementation("com.google.android.gms:play-services-ads:23.+")
}
\`\`\`

### 5.2 AndroidManifest.xml
Inside \`<application>\`:
\`\`\`xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="${ADMOB_APP_ID}" />
\`\`\`

### 5.3 AdMobManager singleton
\`\`\`kotlin
@Singleton
class AdMobManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val supabase: SupabaseClient
) {
    private val paidPlans = setOf("plus", "pro", "lifetime")
    private var initialized = false

    suspend fun initialize(userId: String) {
        if (initialized) return
        val showAds = shouldShowAds(userId)
        if (!showAds) return  // paid user — skip entirely

        MobileAds.initialize(context) {}
        initialized = true
    }

    suspend fun showRewarded(activity: Activity, onReward: (Int) -> Unit) {
        if (!initialized) return
        val ad = RewardedAd.load(context, AD_UNITS.rewarded, AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    ad.show(activity) { rewardItem ->
                        onReward(rewardItem.amount)
                    }
                }
                override fun onAdFailedToLoad(error: LoadAdError) {}
            })
    }

    suspend fun showInterstitial(activity: Activity) {
        if (!initialized) return
        InterstitialAd.load(context, AD_UNITS.interstitial, AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) { ad.show(activity) }
                override fun onAdFailedToLoad(error: LoadAdError) {}
            })
    }

    fun showBanner(layout: FrameLayout) {
        if (!initialized) return
        val adView = AdView(context).apply {
            setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(context, layout.width))
            adUnitId = AD_UNITS.banner
        }
        layout.addView(adView)
        adView.loadAd(AdRequest.Builder().build())
    }

    fun removeBanner(layout: FrameLayout) {
        layout.removeAllViews()
    }
}
\`\`\`

### 5.4 Compose UI surfaces
\`\`\`kotlin
// Rewarded — "Watch ad for +5 messages" button
@Composable
fun RewardedMessageButton(
    adManager: AdMobManager,
    activity: Activity,
    onGranted: (Int) -> Unit
) {
    var loading by remember { mutableStateOf(false) }
    Button(onClick = {
        loading = true
        coroutineScope.launch {
            adManager.showRewarded(activity) { amount ->
                loading = false
                onGranted(amount)
            }
        }
    }) {
        Text(if (loading) "Loading ad…" else "📺 Watch ad → +5 messages")
    }
}

// Banner — mount on demo / public pages
@Composable
fun BannerAdSurface(adManager: AdMobManager) {
    AndroidView(
        factory = { context -> FrameLayout(context) },
        update = { layout -> adManager.showBanner(layout) },
        onRelease = { layout -> adManager.removeBanner(layout) }
    )
}
\`\`\`

### 5.5 Interstitial trigger (every 10th cold open)
\`\`\`kotlin
// In your MainActivity or Application onCreate
val prefs = context.getSharedPreferences("app_open", Context.MODE_PRIVATE)
var count = prefs.getInt("open_count", 0) + 1
prefs.edit().putInt("open_count", count).apply()
if (count % 10 == 0) {
    lifecycleScope.launch { adManager.showInterstitial(this@MainActivity) }
}
\`\`\`

---

## 6. iOS IMPLEMENTATION (Swift + SwiftUI)

### 6.1 SPM / CocoaPods
Add \`Google-Mobile-Ads-SDK\` via SPM or CocoaPods.

### 6.2 Info.plist
\`\`\`xml
<key>GADApplicationIdentifier</key>
<string>${ADMOB_APP_ID}</string>
\`\`\`

### 6.3 AdMobManager actor
\`\`\`swift
@MainActor
class AdMobManager: ObservableObject {
    private let paidPlans: Set<String> = ["plus", "pro", "lifetime"]
    private var initialized = false

    func initialize(userId: String) async {
        guard !initialized else { return }
        let showAds = await shouldShowAds(userId: userId)
        guard showAds else { return }
        await GADMobileAds.sharedInstance().start()
        initialized = true
    }

    func showRewarded(root: UIViewController, onReward: @escaping (Int) -> Void) async {
        guard initialized else { return }
        let request = GADRequest()
        do {
            let ad = try await GADRewardedAd.load(withAdUnitID: "${AD_UNITS.rewarded}", request: request)
            ad.present(fromRootViewController: root) {
                onReward(Int(ad.reward.amount))
            }
        } catch {
            print("Rewarded failed: \\(error)")
        }
    }

    func showInterstitial(root: UIViewController) async {
        guard initialized else { return }
        let request = GADRequest()
        do {
            let ad = try await GADInterstitialAd.load(withAdUnitID: "${AD_UNITS.interstitial}", request: request)
            ad.present(fromRootViewController: root)
        } catch {
            print("Interstitial failed: \\(error)")
        }
    }

    func showBanner() -> GADBannerView {
        let banner = GADBannerView(adSize: GADAdSizeBanner)
        banner.adUnitID = "${AD_UNITS.banner}"
        banner.load(GADRequest())
        return banner
    }
}
\`\`\`

### 6.4 SwiftUI surfaces
\`\`\`swift
struct RewardedButton: View {
    @StateObject var adManager = AdMobManager()
    @Environment(\.viewController) var root
    @State var granted = 0

    var body: some View {
        Button("📺 Watch ad → +5 messages") {
            Task {
                await adManager.showRewarded(root: root!) { amount in
                    granted += amount
                }
            }
        }
    }
}

struct BannerAdView: UIViewRepresentable {
    @StateObject var adManager = AdMobManager()

    func makeUIView(context: Context) -> GADBannerView {
        return adManager.showBanner()
    }
    func updateUIView(_ uiView: GADBannerView, context: Context) {}
}
\`\`\`

### 6.5 Interstitial trigger (every 10th open)
\`\`\`swift
let count = UserDefaults.standard.integer(forKey: "appOpenCount") + 1
UserDefaults.standard.set(count, forKey: "appOpenCount")
if count % 10 == 0 {
    Task { await adManager.showInterstitial(root: rootViewController) }
}
\`\`\`

---

## 7. AD SURFACES & TRIGGERS

| Surface | Ad type | Trigger | Paid user? |
|---|---|---|---|
| Free user hits message cap | Rewarded → +5 msgs | Daily limit reached | Hidden |
| Image gen cooldown | Rewarded → skip cooldown | Cooldown timer active | Hidden |
| Between chat sessions | Interstitial | Every 10th cold open | Hidden |
| Public /demo page | Banner | Page mounted | Hidden |
| AGI Mode preview | Rewarded → 1 free use | Free user opens AGI | Hidden |

---

## 8. POLICY RULES (break = ban)
- Never click your own ads.
- No ads in paid apps or for paid users.
- Never autoplay rewarded ads.
- Don't put interstitials between every screen.
- COPPA: mark app as child-safe in AdMob console if applicable.
- Add AdMob disclosure to your privacy policy.

---

## 9. TESTING CHECKLIST
- [ ] Test IDs active in debug builds; production IDs only in release.
- [ ] Paid plan mock → confirm zero ad SDK calls.
- [ ] Free plan mock → confirm all three formats load.
- [ ] Rotate device → banner adapts size.
- [ ] Trigger interstitial → no crash, respects 10-open cooldown.
- [ ] Trigger rewarded → grant +5 messages only on \`onUserEarnedReward\` / \`adDidPresentFullScreenContent\`.
- [ ] Background app during ad → resume cleanly.
- [ ] Status bar / notch / gesture bar not overlapped by banner.

---

## 10. EXTRA NOTES
${opts.extraNotes || "_(none)_"}
`;
}

export default function AdMobAddonPrompt() {
  const [appName, setAppName] = useState("CriderGPT");
  const [packageId, setPackageId] = useState("com.cridergpt.app");
  const [extraNotes, setExtraNotes] = useState("");

  const prompt = useMemo(
    () => buildPrompt({ appName, packageId, extraNotes }),
    [appName, packageId, extraNotes]
  );

  const copy = () => {
    navigator.clipboard.writeText(prompt).then(() => toast.success("AdMob prompt copied!"));
  };

  const download = () => {
    const blob = new Blob([prompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admob-addon-${packageId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <DevHubGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/40 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Megaphone className="h-6 w-6 text-primary" />
                  AdMob Add-On Prompt
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Scope-limited prompt: wire AdMob into an existing native Android/iOS app. Copy / paste into any AI IDE.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copy}>
                  <Copy className="h-4 w-4 mr-1.5" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={download}>
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link to="/devhub">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dev Hub
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">App Settings</CardTitle>
              <CardDescription>Customize the prompt for your app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">App name</Label>
                  <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packageId">Package / Bundle ID</Label>
                  <Input id="packageId" value={packageId} onChange={(e) => setPackageId(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra">Extra notes (optional)</Label>
                <Input
                  id="extra"
                  placeholder="e.g., Use Jetpack Compose Navigation, or existing architecture is MVVM..."
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{prompt.split(/\s+/).length.toLocaleString()} words</Badge>
            <Badge variant="outline">{prompt.length.toLocaleString()} chars</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 rounded-md border overflow-auto max-h-[70vh]">
                {prompt}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </DevHubGuard>
  );
}
