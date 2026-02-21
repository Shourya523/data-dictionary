"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Database, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { authClient } from "./auth";

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/connect",
        errorCallbackURL: "/",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center h-14 px-6 relative">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-base tracking-tight cursor-pointer select-none">
          <Database className="w-5 h-5 text-primary" />
          DataLens AI
        </Link>
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors cursor-pointer">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors cursor-pointer">How It Works</a>
          {/* <a href="#pricing" className="hover:text-foreground transition-colors cursor-pointer">Pricing</a> */}
        </div>

        <div className="hidden md:flex items-center gap-3 ml-auto">
          {isPending ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          ) : !session ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleGoogleSignIn}
              >
                Log In
              </Button>
              <Button
                size="sm"
                onClick={handleGoogleSignIn}
              >
                Start Free
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium mr-2">
                Hi, {session.user.name.split(' ')[0]}!
              </span>

              <Button size="sm" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden ml-auto text-muted-foreground cursor-pointer outline-none"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background p-6 space-y-4">
          <a href="#features" className="block text-sm text-muted-foreground">Features</a>
          <a href="#how-it-works" className="block text-sm text-muted-foreground">How It Works</a>
          <a href="#pricing" className="block text-sm text-muted-foreground">Pricing</a>

          {!session ? (
            <Button size="sm" className="w-full" onClick={handleGoogleSignIn}>
              Log In
            </Button>
          ) : (
            <Button size="sm" className="w-full" asChild onClick={handleSignOut}>
               <div className="flex items-center justify-center">
                <LogOut className="w-4 h-4 mr-2" /> Log Out
               </div>
            </Button>
          )}
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;