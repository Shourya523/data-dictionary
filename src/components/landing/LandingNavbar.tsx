"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Database, Menu, X } from "lucide-react";
import { useState } from "react";

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);

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
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Log In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm">Start Free</Button>
          </Link>
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

          <Link href="/dashboard">
            <Button size="sm" className="w-full">Start Free</Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;