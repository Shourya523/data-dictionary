import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { Table2, ShieldAlert, BarChart3, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";

const stats = [
  { label: "Tables Scanned", value: "247", icon: Table2, sub: "+12 this week" },
  { label: "Sensitive Fields", value: "38", icon: ShieldAlert, sub: "3 new detected" },
  { label: "Quality Score", value: "94.2%", icon: BarChart3, sub: "+1.3% vs last week" },
  { label: "Last Sync", value: "2m ago", icon: RefreshCw, sub: "All healthy" },
];

const activity = [
  { msg: "AI documented 12 new columns in orders table", time: "5 min ago", icon: TrendingUp },
  { msg: "PII detected: email in user_profiles", time: "12 min ago", icon: AlertTriangle },
  { msg: "Null rate spike in payments.amount", time: "1 hour ago", icon: AlertTriangle },
  { msg: "New table: analytics_events", time: "3 hours ago", icon: RefreshCw },
];

const DashboardOverview = () => (
  <DashboardLayout>
    <div className="mb-8">
      <h1 className="text-xl font-semibold">Overview</h1>
      <p className="text-sm text-muted-foreground mt-1">Your data estate at a glance.</p>
    </div>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
            <s.icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold">{s.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
        </div>
      ))}
    </div>

    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold">Recent Activity</h2>
      </div>
      <div className="divide-y divide-border">
        {activity.map((a, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-3">
            <a.icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{a.msg}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  </DashboardLayout>
);

export default DashboardOverview;
