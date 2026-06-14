
import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MaintenanceGuard } from "@/components/MaintenanceGuard";
import { OfflineBanner } from "@/components/OfflineIndicator";
import { initGA } from './utils/analytics';
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import SystemDiagnostics from "./pages/SystemDiagnostics";
import TTSPolicyPage from "./pages/TTSPolicyPage";
import UserAgreement from "./pages/UserAgreement";
import SnapchatLensPage from "./pages/SnapchatLensPage";
import CustomFilters from "./pages/CustomFilters";
import SmartIDStore from "./pages/SmartIDStore";
import TagLookup from "./pages/TagLookup";
import FarmBureau from "./pages/FarmBureau";
import IdeaPlanner from "./pages/IdeaPlanner";
import Invite from "./pages/Invite";
import Leaderboard from "./pages/Leaderboard";
import PublicProfile from "./pages/PublicProfile";
import BreedIndex from "./pages/BreedIndex";
import BreedDetail from "./pages/BreedDetail";
import Guides from "./pages/Guides";
import GuideDetail from "./pages/GuideDetail";
import Recipes from "./pages/Recipes";
import LinkPC from "./pages/LinkPC";
import LinkPCToken from "./pages/LinkPCToken";
import PCFeed from "./pages/PCFeed";
import AccountManagement from "./pages/AccountManagement";
import DeleteAccountInfo from "./pages/DeleteAccountInfo";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DevHub from "./pages/devhub/DevHub";
import DevServerConsole from "./pages/devhub/ServerConsole";
import DevMachineDesigner from "./pages/devhub/MachineDesigner";
import DevCodeGenerator from "./pages/devhub/CodeGenerator";
import DevLaserStudio from "./pages/devhub/LaserStudio";
import DevIncomeCalc from "./pages/devhub/IncomeCalc";
import DevServerHealth from "./pages/devhub/ServerHealth";
import DevKnowledgeVault from "./pages/devhub/KnowledgeVault";
import DevAgentDispatcher from "./pages/devhub/AgentDispatcher";
import DevWeldJobs from "./pages/devhub/WeldJobs";
import DevModPacker from "./pages/devhub/ModPacker";
import DevAutopilotQueue from "./pages/devhub/AutopilotQueue";
import DevAndroidBuilder from "./pages/devhub/AndroidBuilder";
import DevKeyboardBlueprint from "./pages/devhub/KeyboardBlueprint";
import DevMoneySplitCalc from "./pages/devhub/MoneySplitCalc";
import DevAetherControl from "./pages/devhub/AetherControl";
import DevAndroidAppIdeas from "./pages/devhub/AndroidAppIdeas";
import DevBuilderResources from "./pages/devhub/BuilderResources";
import DevAdNetworks from "./pages/devhub/AdNetworks";
import DevBackendBlueprints from "./pages/devhub/BackendBlueprints";
import DevMarketingAutoPost from "./pages/devhub/MarketingAutoPost";
import DevIOSBuilder from "./pages/devhub/IOSBuilder";
import DevIOSAssetStudio from "./pages/devhub/IOSAssetStudio";
import DevSwiftCodeGenerator from "./pages/devhub/SwiftCodeGenerator";
import DevNativeRebuildPrompt from "./pages/devhub/NativeRebuildPrompt";
import DevAdMobAddonPrompt from "./pages/devhub/AdMobAddonPrompt";
import DevAndroidAgentPrompts from "./pages/devhub/AndroidAgentPrompts";
import DevIOSAppIdeas from "./pages/devhub/IOSAppIdeas";
import DevWebsiteIdeas from "./pages/devhub/WebsiteIdeas";
import DevCrossPlatformReleaseNotes from "./pages/devhub/CrossPlatformReleaseNotes";
import DevNativeAppDebugNotes from "./pages/devhub/NativeAppDebugNotes";
import DevSubscriptionIdeasAndroid from "./pages/devhub/SubscriptionIdeasAndroid";
import DevSubscriptionIdeasIOS from "./pages/devhub/SubscriptionIdeasIOS";
import DevSubscriptionIdeasWeb from "./pages/devhub/SubscriptionIdeasWeb";
import DevIOSResumePrompt from "./pages/devhub/IOSResumePrompt";
import DevBackendWiringReference from "./pages/devhub/BackendWiringReference";
import DevAlcoholRecipes from "./pages/devhub/AlcoholRecipes";
import DevUIBlueprints from "./pages/devhub/UIBlueprints";
import DevTechKnowledgeLibrary from "./pages/devhub/TechKnowledgeLibrary";
import { ReferralCaptureMount } from "./components/growth/ReferralCaptureMount";
import { AppOpenInterstitial } from "./components/AppOpenInterstitial";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  useEffect(() => {
    initGA();
    // Native Android (Kotlin) and native iOS (Swift) handle their own OAuth
    // deep links. The web bundle only runs in browsers/PWA, so no Capacitor
    // listener is needed here.
    void supabase;
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <OfflineProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AuthProvider>
                <ReferralCaptureMount />
                <AppOpenInterstitial />
                <MaintenanceGuard>
                  <OfflineBanner />
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/success" element={<Success />} />
                      <Route path="/cancel" element={<Cancel />} />
                      <Route path="/upgrade" element={<Navigate to="/" replace />} />
                      <Route path="/pricing" element={<Navigate to="/" replace />} />
                      
                      <Route path="/system-diagnostics" element={<SystemDiagnostics />} />
                      <Route path="/tts-policy" element={<TTSPolicyPage />} />
                      <Route path="/snapchat-lens" element={<SnapchatLensPage />} />
                      <Route path="/custom-filters" element={<CustomFilters />} />
                      <Route path="/user-agreement" element={<UserAgreement />} />
                      <Route path="/store" element={<SmartIDStore />} />
                      <Route path="/farmbureau" element={<FarmBureau />} />
                      <Route path="/farm-bureau" element={<FarmBureau />} />
                      <Route path="/tag/:tagId" element={<TagLookup />} />
                      <Route path="/livestockID/:tagId" element={<TagLookup />} />
                      <Route path="/idea-planner" element={<IdeaPlanner />} />

                      {/* Growth: invite, leaderboard, public profile, SEO breeds */}
                      <Route path="/invite" element={<Invite />} />
                      <Route path="/leaderboard" element={<Leaderboard />} />
                      <Route path="/u/:username" element={<PublicProfile />} />
                      <Route path="/breeds" element={<BreedIndex />} />
                      <Route path="/breeds/:slug" element={<BreedDetail />} />
                      <Route path="/guides" element={<Guides />} />
                      <Route path="/guides/:slug" element={<GuideDetail />} />
                      <Route path="/recipes" element={<Recipes />} />
                      <Route path="/link-pc" element={<LinkPC />} />
                      <Route path="/link-pc-token" element={<LinkPCToken />} />
                      <Route path="/pc-feed" element={<PCFeed />} />
                      <Route path="/account" element={<AccountManagement />} />
                      <Route path="/manage-account" element={<Navigate to="/account" replace />} />
                      <Route path="/delete-account" element={<DeleteAccountInfo />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/privacy/:pkg" element={<PrivacyPolicy />} />
                      <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />

                      {/* Owner-locked Dev Hub */}
                      <Route path="/devhub" element={<DevHub />} />
                      <Route path="/devhub/server-console" element={<DevServerConsole />} />
                      <Route path="/devhub/server-health" element={<DevServerHealth />} />
                      <Route path="/devhub/vault" element={<DevKnowledgeVault />} />
                      <Route path="/devhub/machine-designer" element={<DevMachineDesigner />} />
                      <Route path="/devhub/code-generator" element={<DevCodeGenerator />} />
                      <Route path="/devhub/agent-dispatcher" element={<DevAgentDispatcher />} />
                      <Route path="/devhub/laser-studio" element={<DevLaserStudio />} />
                      <Route path="/devhub/income" element={<DevIncomeCalc />} />
                      <Route path="/devhub/weld-jobs" element={<DevWeldJobs />} />
                      <Route path="/devhub/mod-packer" element={<DevModPacker />} />
                      <Route path="/devhub/autopilot" element={<DevAutopilotQueue />} />
                      <Route path="/devhub/android-builder" element={<DevAndroidBuilder />} />
                      <Route path="/devhub/keyboard-blueprint" element={<DevKeyboardBlueprint />} />
                      <Route path="/devhub/money-split" element={<DevMoneySplitCalc />} />
                      <Route path="/devhub/aether" element={<DevAetherControl />} />
                      <Route path="/devhub/android-app-ideas" element={<DevAndroidAppIdeas />} />
                      <Route path="/devhub/builder-resources" element={<DevBuilderResources />} />
                      <Route path="/devhub/ad-networks" element={<DevAdNetworks />} />
                      <Route path="/devhub/backend-blueprints" element={<DevBackendBlueprints />} />
                      <Route path="/devhub/ios-builder" element={<DevIOSBuilder />} />
                      <Route path="/devhub/ios-asset-studio" element={<DevIOSAssetStudio />} />
                      <Route path="/devhub/swift-code-generator" element={<DevSwiftCodeGenerator />} />
                      
                      <Route path="/devhub/native-rebuild-prompt" element={<DevNativeRebuildPrompt />} />
                      <Route path="/devhub/admob-addon-prompt" element={<DevAdMobAddonPrompt />} />
                      <Route path="/devhub/marketing-auto-post" element={<DevMarketingAutoPost />} />
                      <Route path="/devhub/android-agent-prompts" element={<DevAndroidAgentPrompts />} />
                      <Route path="/devhub/ios-app-ideas" element={<DevIOSAppIdeas />} />
                      <Route path="/devhub/website-ideas" element={<DevWebsiteIdeas />} />
                     <Route path="/devhub/cross-platform-release-notes" element={<DevCrossPlatformReleaseNotes />} />
                    <Route path="/devhub/native-debug-notes" element={<DevNativeAppDebugNotes />} />
                    <Route path="/devhub/subscription-ideas-android" element={<DevSubscriptionIdeasAndroid />} />
                    <Route path="/devhub/subscription-ideas-ios" element={<DevSubscriptionIdeasIOS />} />
                    <Route path="/devhub/subscription-ideas-web" element={<DevSubscriptionIdeasWeb />} />
                    <Route path="/devhub/ios-resume-prompt" element={<DevIOSResumePrompt />} />
                    <Route path="/devhub/backend-wiring" element={<DevBackendWiringReference />} />
                    <Route path="/devhub/alcohol-recipes" element={<DevAlcoholRecipes />} />
                    <Route path="/devhub/ui-blueprints" element={<DevUIBlueprints />} />
                    <Route path="/devhub/tech-library" element={<DevTechKnowledgeLibrary />} />



                      {/* Home route - now public, handles guest and authenticated users */}
                      <Route path="/" element={<Index />} />
                      <Route path="/:tab" element={<Index />} />
                      
                      {/* Catch all route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </MaintenanceGuard>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </OfflineProvider>
      </ThemeProvider>
      </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
