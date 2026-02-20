"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center pt-14">
      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-3xl mx-auto"
        >
          <p className="text-primary text-sm font-medium tracking-wide mb-6">
            Intelligent Data Dictionary Agent
          </p>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Understand your
            <br />
            data <span className="text-gradient">instantly.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            AI-powered documentation, governance, and natural language search for enterprise databases.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8">
                Start Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>

            <Button size="lg" variant="outline" className="h-12 px-8">
              View Demo
            </Button>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="mt-24 max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card p-1 glow-green">
            <div className="flex items-center gap-1.5 px-4 py-3">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Tables", value: "247" },
                { label: "Sensitive", value: "38" },
                { label: "Quality", value: "94%" },
                { label: "Synced", value: "2m ago" },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl bg-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-2xl font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;