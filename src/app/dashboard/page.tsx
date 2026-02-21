"use client";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { Table2, ShieldAlert, RefreshCw, TrendingUp, AlertTriangle, Database, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/src/components/landing/auth";
import { getUserConnections } from "@/src/actions/db";

export default function DashboardOverview() {
  const { data: session, isPending: authLoading } = authClient.useSession();
  const [connectionCount, setConnectionCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (authLoading) return;
      
      if (session?.user?.id) {
        const result = await getUserConnections(session.user.id);
        if (result.success && Array.isArray(result.data)) {
          setConnectionCount(result.data.length);
        } else {
          setConnectionCount(0);
        }
      } else {
        setConnectionCount(0);
      }
      setIsLoading(false);
    }
    loadStats();
  }, [session, authLoading]);

  const stats = [
    { 
      label: "Active Connections", 
      value: connectionCount === null ? "..." : connectionCount.toString(), 
      icon: Database, 
      sub: "Saved in Neon",
      loading: isLoading 
    },
    { label: "Tables Scanned", value: "247", icon: Table2, sub: "+12 this week", loading: false },
    { label: "Sensitive Fields", value: "38", icon: ShieldAlert, sub: "3 new detected", loading: false },
    { label: "Last Sync", value: "2m ago", icon: RefreshCw, sub: "All healthy", loading: false },
  ];

  const activity = [
    { msg: "AI documented 12 new columns in orders table", time: "5 min ago", icon: TrendingUp },
    { msg: "PII detected: email in user_profiles", time: "12 min ago", icon: AlertTriangle },
    { msg: "Null rate spike in payments.amount", time: "1 hour ago", icon: AlertTriangle },
    { msg: "New table: analytics_events", time: "3 hours ago", icon: RefreshCw },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Your data estate at a glance.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{s.label}</span>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              {s.loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Live Updates</span>
          </div>
        </div>
        <div className="divide-y divide-border">
          {activity.map((a, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-default">
              <div className={`p-2 rounded-lg shrink-0 ${a.icon === AlertTriangle ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                <a.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate font-medium text-foreground">{a.msg}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-tight">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}