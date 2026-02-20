"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Database, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { authClient } from "./auth";

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/dashboard",
        errorCallbackURL: "/",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.session) {
        setUser(data.session.user);
      }
      setLoading(false);
    });
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-14 px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-base tracking-tight">
          <Database className="w-5 h-5 text-primary" />
          DataLens AI
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {!loading && !user ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground cursor-pointer"
                onClick={handleGoogleSignIn}
              >
                Log In
              </Button>
              <Button size="sm" onClick={handleGoogleSignIn} className="cursor-pointer">
                Start Free
              </Button>
            </>
          ) : (
            <Link href="/dashboard">
              <Button size="sm">Go to Dashboard</Button>
            </Link>
          )}
        </div>

        <button
          className="md:hidden text-muted-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background p-6 space-y-4">
          <a href="#features" className="block text-sm text-muted-foreground">Features</a>
          <a href="#how-it-works" className="block text-sm text-muted-foreground">How It Works</a>
          <a href="#pricing" className="block text-sm text-muted-foreground">Pricing</a>

          {!user ? (
            <Button size="sm" className="w-full" onClick={handleGoogleSignIn}>
              Start Free
            </Button>
          ) : (
            <Link href="/dashboard" className="w-full">
              <Button size="sm" className="w-full">Go to Dashboard</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;