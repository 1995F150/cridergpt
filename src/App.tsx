
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Success from "@/pages/Success";
import NotFound from "@/pages/NotFound";
import UserAgreement from "@/pages/UserAgreement";
import TTSPolicyPage from "@/pages/TTSPolicy";
import SystemDiagnosticsPage from "@/pages/SystemDiagnostics";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  console.log('🚀 App component mounting');

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
              <Toaster />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/success" element={<Success />} />
                <Route path="/user-agreement" element={<UserAgreement />} />
                <Route path="/tts-policy" element={<TTSPolicyPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/diagnostics"
                  element={
                    <ProtectedRoute>
                      <SystemDiagnosticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
