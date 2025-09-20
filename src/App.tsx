
import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Success from "./pages/Success";
import SystemDiagnostics from "./pages/SystemDiagnostics";
import TTSPolicyPage from "./pages/TTSPolicyPage";
import UserAgreement from "./pages/UserAgreement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  console.log('🚀 App component mounting');

  useEffect(() => {
    console.log('🎯 Current URL:', window.location.href);
    console.log('🎯 Current pathname:', window.location.pathname);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/success" element={<Success />} />  
                  <Route path="/upgrade" element={<Navigate to="/" replace />} />
                  <Route path="/pricing" element={<Navigate to="/" replace />} />
                  <Route path="/payment" element={<Navigate to="/" replace />} />
                  <Route path="/system-diagnostics" element={<SystemDiagnostics />} />
                  <Route path="/tts-policy" element={<TTSPolicyPage />} />
                  <Route path="/user-agreement" element={<UserAgreement />} />
                  
                  {/* Protected routes */}
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
