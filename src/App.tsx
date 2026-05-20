
import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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
import { ReferralCaptureMount } from "./components/growth/ReferralCaptureMount";

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
    
    // Set up deep link listener for mobile OAuth redirects
    if (Capacitor.isNativePlatform()) {
      const setupDeepLinkListener = async () => {
        CapacitorApp.addListener('appUrlOpen', async (data) => {
          console.log('🔗 App opened with URL:', data.url);
          
          // Extract tokens from URL fragment
          const url = data.url;
          if (url.includes('#access_token=')) {
            try {
              const access_token = url.split('#access_token=').pop()?.split('&')[0];
              const refresh_token = url.split('&refresh_token=').pop()?.split('&')[0];
              
              if (access_token && refresh_token) {
                console.log('✅ Setting session from deep link');
                const { error } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });
                
                if (error) {
                  console.error('❌ Error setting session:', error);
                } else {
                  console.log('✅ Session set successfully, redirecting to home');
                  // Redirect to home page
                  window.location.href = '/';
                }
              }
            } catch (error) {
              console.error('❌ Error processing deep link:', error);
            }
          }
        });
      };
      
      setupDeepLinkListener();
      
      // Cleanup listener on unmount
      return () => {
        CapacitorApp.removeAllListeners();
      };
    }
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
                      <Route path="/payment" element={<Navigate to="/" replace />} />
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
