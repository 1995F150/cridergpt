
import { Auth } from '@supabase/auth-ui-react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import { Account } from './components/Account';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MemorialPanel } from './components/panels/MemorialPanel';
import { OriginStory } from './components/OriginStory';
import { Dedication } from "@/components/Dedication";
import { ThemeSupa } from '@supabase/auth-ui-shared';

function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();

  useEffect(() => {
    // artificial delay to allow Auth UI to load before showing app content
    setTimeout(() => {
      setIsAuthReady(true);
    }, 50);
  }, []);

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <div className="min-h-screen bg-background">
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={
                !session ? (
                  <div className="min-h-screen flex items-center justify-center">
                    <Auth
                      supabaseClient={supabase}
                      appearance={{ theme: ThemeSupa }}
                      providers={['github', 'google']}
                      redirectTo={`${window.location.origin}/`}
                    />
                  </div>
                ) : (
                  <Account session={session} />
                )
              } />
              <Route path="/memorial" element={<MemorialPanel />} />
              <Route path="/story" element={<OriginStory />} />
              <Route path="/dedication" element={<Dedication />} />
            </Routes>
          </BrowserRouter>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
