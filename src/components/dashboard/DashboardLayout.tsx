"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Table2,
  BarChart3,
  ShieldCheck,
  GitBranch,
  MessageSquare,
  Settings,
  Database,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tables", icon: Table2, path: "/dashboard/tables" },
  { label: "Data Quality", icon: BarChart3, path: "/dashboard/quality" },
  { label: "Compliance", icon: ShieldCheck, path: "/dashboard/compliance" },
  { label: "Lineage", icon: GitBranch, path: "/dashboard/lineage" },
  { label: "AI Chat", icon: MessageSquare, path: "/dashboard/chat" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`${
          collapsed ? "w-14" : "w-56"
        } bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 shrink-0`}
      >
        <div className="flex items-center gap-2.5 h-14 px-4 border-b border-sidebar-border">
          <Database className="w-4 h-4 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-accent-foreground">
              DataLens AI
            </span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;