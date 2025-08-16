
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TikTokFollowNotification } from "@/components/TikTokFollowNotification";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-semibold mb-4">Welcome to CriderGPT</h1>
        <p className="mb-4">
          This is a starter template for a Next.js app with Supabase authentication.
        </p>
        <p>
          Get started by editing <code>pages/index.tsx</code>
        </p>
      </main>

      <Footer />
      
      {/* Add TikTok follow notification */}
      <TikTokFollowNotification />
    </div>
  );
};

export default Index;
